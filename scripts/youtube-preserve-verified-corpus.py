#!/usr/bin/env python3
"""Preserve or independently restore the validated Batch017 corpus.

Preservation uses immutable SHA-256-addressed private Supabase Storage objects.
Independent restoration accepts only a freshly read canonical DB catalog and
never requires the original Actions artifact or local corpus tree.
"""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request

BUCKET = "atlas-youtube-source"
SOURCE_ARTIFACT_ID = 11548326100
KEY_PREFIX = "validated-batch017/sha256/"


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def storage_call(method, base, token, key, data=None):
    endpoint = base.rstrip("/") + "/storage/v1/object/" + BUCKET + "/" + urllib.parse.quote(key, safe="/")
    headers = {"Authorization": "Bearer " + token, "apikey": token}
    if data is not None:
        headers["Content-Type"] = "application/octet-stream"
        headers["x-upsert"] = "false"
    req = urllib.request.Request(endpoint, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=180) as response:
        return response.read()


def bucket_call(method, base, token, data=None):
    endpoint = base.rstrip("/") + "/storage/v1/bucket"
    if method == "GET":
        endpoint += "/" + urllib.parse.quote(BUCKET, safe="")
    headers = {"Authorization": "Bearer " + token, "apikey": token}
    body = None
    if data is not None:
        body = json.dumps(data, separators=(",", ":")).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(endpoint, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=60) as response:
        raw = response.read()
    return json.loads(raw.decode("utf-8")) if raw else {}


def ensure_private_bucket(base, token):
    try:
        bucket = bucket_call("GET", base, token)
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            raise
        try:
            bucket_call("POST", base, token, {"id": BUCKET, "name": BUCKET, "public": False})
        except urllib.error.HTTPError as conflict:
            if conflict.code != 409:
                raise
        bucket = bucket_call("GET", base, token)
    if str(bucket.get("id") or bucket.get("name") or "") != BUCKET:
        raise RuntimeError("SOURCE_BUCKET_ID_MISMATCH")
    if bucket.get("public") is not False:
        raise RuntimeError("SOURCE_BUCKET_NOT_PRIVATE")
    return bucket


def batch_label(relative):
    for part in Path(relative).parts:
        match = re.search(r"batch(\d{3})", part, re.I)
        if match:
            return "batch" + match.group(1)
    return "batch017-cumulative"


def classify(file, root):
    if file.is_symlink() or not file.is_file():
        raise RuntimeError("UNSAFE_SOURCE_MEMBER: " + str(file))
    relative = file.relative_to(root).as_posix()
    if relative.startswith("/") or any(p in ("", ".", "..") for p in Path(relative).parts):
        raise RuntimeError("UNSAFE_SOURCE_PATH: " + relative)
    if file.name == "manifest.json":
        kind, channel_id = "manifest", None
    elif file.name.endswith(".ndjson.gz"):
        kind = "channel_videos"
        channel_id = file.name[:-len(".ndjson.gz")]
        if not channel_id:
            raise RuntimeError("EMPTY_CHANNEL_ID: " + relative)
    else:
        kind, channel_id = "metadata", None
    return relative, kind, channel_id, batch_label(relative)


def record_for(file, root):
    relative, kind, channel_id, batch = classify(file, root)
    contents = file.read_bytes()
    if not contents:
        raise RuntimeError("EMPTY_SOURCE_FILE: " + relative)
    digest = sha256(contents)
    key = KEY_PREFIX + digest[:2] + "/" + digest + "/" + relative
    return {
        "object_key": key,
        "sha256": digest,
        "byte_count": len(contents),
        "source_artifact_id": SOURCE_ARTIFACT_ID,
        "batch_label": batch,
        "source_kind": kind,
        "source_path": relative,
        "channel_id": channel_id,
        "video_rows": (
            sum(1 for line in gzip.decompress(contents).splitlines() if line.strip())
            if kind == "channel_videos" else None
        ),
        "_contents": contents,
    }


def upload_and_verify(base, token, file, root):
    record = record_for(file, root)
    contents = record.pop("_contents")
    created = False
    try:
        stored = storage_call("GET", base, token, record["object_key"])
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            raise
        try:
            storage_call("POST", base, token, record["object_key"], contents)
            created = True
        except urllib.error.HTTPError as conflict:
            if conflict.code != 409:
                raise
        stored = storage_call("GET", base, token, record["object_key"])
    if len(stored) != len(contents) or sha256(stored) != record["sha256"]:
        raise RuntimeError("SOURCE_ROUNDTRIP_CHECKSUM_MISMATCH: " + record["source_path"])
    return record | {"new_object": created}


def enumerate_files(root):
    files = sorted(p for p in root.rglob("*") if p.is_file() or p.is_symlink())
    if not files or not any(p.name == "manifest.json" for p in files):
        raise RuntimeError("SOURCE_MANIFESTS_NOT_FOUND")
    return files


def relative_from_object_key(record):
    key = str(record.get("object_key") or "")
    digest = str(record.get("sha256") or "").lower()
    if not re.fullmatch(r"[0-9a-f]{64}", digest):
        raise RuntimeError("CATALOG_SHA256_INVALID")
    expected_prefix = KEY_PREFIX + digest[:2] + "/" + digest + "/"
    if not key.startswith(expected_prefix):
        raise RuntimeError("CATALOG_OBJECT_KEY_DIGEST_MISMATCH")
    relative = key[len(expected_prefix):]
    # pathlib normalizes "." and repeated separators before .parts checks.
    # Validate the *raw* DB-sourced suffix first so no second catalog key
    # can alias a different spelling of the same restored filesystem path.
    if (
        not relative
        or relative.startswith("/")
        or "\\" in relative
        or any(part in ("", ".", "..") for part in relative.split("/"))
    ):
        raise RuntimeError("UNSAFE_RESTORE_PATH: " + relative)
    rel = Path(relative)
    if rel.is_absolute() or rel.as_posix() != relative:
        raise RuntimeError("UNSAFE_RESTORE_PATH: " + relative)
    return rel


def restore_from_catalog(base, token, records, target):
    if not isinstance(records, list) or not records:
        raise RuntimeError("REMOTE_CATALOG_RECORDS_REQUIRED")

    # Validate the ENTIRE remote catalog before the first Storage GET or
    # filesystem write. An immutable object key is not a unique restore path:
    # two differently hashed objects may still end in the same relative name.
    prepared = []
    seen_keys = set()
    seen_paths = set()
    for record in records:
        rel = relative_from_object_key(record)
        key = str(record["object_key"])
        if key in seen_keys:
            raise RuntimeError("REMOTE_CATALOG_DUPLICATE_OBJECT_KEY")
        seen_keys.add(key)
        if rel.as_posix() in seen_paths:
            raise RuntimeError("REMOTE_CATALOG_DUPLICATE_RESTORE_PATH")
        seen_paths.add(rel.as_posix())
        expected_bytes = int(record.get("byte_count") or 0)
        if expected_bytes <= 0:
            raise RuntimeError("REMOTE_CATALOG_BYTE_COUNT_INVALID")
        prepared.append((record, rel, key, expected_bytes))

    # An independent recovery proof must not reuse or overwrite a populated
    # local tree. The caller provides a new target, as the workflow already does.
    if target.is_symlink() or (target.exists() and (not target.is_dir() or any(target.iterdir()))):
        raise RuntimeError("REMOTE_RESTORE_TARGET_NOT_EMPTY")
    target.mkdir(parents=True, exist_ok=True)

    restored = 0
    restored_bytes = 0
    for record, rel, key, expected_bytes in prepared:
        data = storage_call("GET", base, token, key)
        if len(data) != expected_bytes or sha256(data) != str(record["sha256"]).lower():
            raise RuntimeError("REMOTE_RESTORE_CHECKSUM_MISMATCH: " + rel.as_posix())
        dest = target / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        with dest.open("xb") as out:
            out.write(data)
        restored += 1
        restored_bytes += len(data)
    return {"files": restored, "bytes": restored_bytes}


# The private recovery index, unlike a local CI inventory, outlives an
# expiring GitHub Actions source ZIP. The object is pinned to its original ZIP
# identity in the SAME Supabase private source bucket; never create a new DB.
ARCHIVE_CENSUS = {
    11548326100: {
        "prefix": "validated-batch017/sha256/",
        "source_zip_sha256": "b40f8efdccfacce194afb44cc7cca3e93a4ab12a2153c5a19b70ceb3f56b0b1f",
        "members": 6044, "bytes": 57747470, "channel_files": 6011,
        "source_files": 6021, "metadata_files": 23, "video_rows": 1536512,
    },
    11613130249: {
        "prefix": "validated-batch024/sha256/",
        "source_zip_sha256": "8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946",
        "members": 10186, "bytes": 85683343, "channel_files": 10127,
        "source_files": 10144, "metadata_files": 42, "video_rows": 2230031,
    },
}


def archive_identity():
    identity = ARCHIVE_CENSUS.get(SOURCE_ARTIFACT_ID)
    if identity is None or KEY_PREFIX != identity["prefix"]:
        raise RuntimeError("SOURCE_RECOVERY_ARCHIVE_IDENTITY_MISMATCH")
    return identity


def private_recovery_index_key():
    info = archive_identity()
    return KEY_PREFIX + "recovery-index/" + info["source_zip_sha256"] + ".json"


def validate_recovery_records(records, *, expected_artifact):
    """Preflight all records and source totals before any remote Storage write/read."""
    info = archive_identity()
    if expected_artifact != SOURCE_ARTIFACT_ID or not isinstance(records, list):
        raise RuntimeError("SOURCE_RECOVERY_ARTIFACT_MISMATCH")
    if len(records) != info["members"]:
        raise RuntimeError("SOURCE_RECOVERY_MEMBER_COUNT_MISMATCH")
    keys, paths = set(), set()
    n_source = n_metadata = n_channels = n_videos = n_bytes = 0
    clean = []
    fields = ("object_key", "sha256", "byte_count", "source_artifact_id",
              "batch_label", "source_kind", "source_path", "channel_id", "video_rows")
    for row in records:
        if not isinstance(row, dict) or row.get("source_artifact_id") != SOURCE_ARTIFACT_ID:
            raise RuntimeError("SOURCE_RECOVERY_MEMBER_ARTIFACT_MISMATCH")
        relative = relative_from_object_key(row).as_posix()
        key = row["object_key"]
        if row.get("source_path") != relative or key in keys or relative in paths:
            raise RuntimeError("SOURCE_RECOVERY_DUPLICATE_OR_INCONSISTENT_PATH")
        keys.add(key)
        paths.add(relative)
        count = row.get("byte_count")
        if type(count) is not int or count <= 0:
            raise RuntimeError("SOURCE_RECOVERY_MEMBER_BYTE_COUNT_INVALID")
        kind = row.get("source_kind")
        if kind not in {"channel_videos", "manifest", "metadata"}:
            raise RuntimeError("SOURCE_RECOVERY_MEMBER_KIND_INVALID")
        video_rows = row.get("video_rows")
        if kind == "channel_videos":
            if (not relative.endswith(".ndjson.gz") or
                    type(video_rows) is not int or video_rows < 0 or
                    not row.get("channel_id") or
                    not relative.endswith("/" + row["channel_id"] + ".ndjson.gz")):
                raise RuntimeError("SOURCE_RECOVERY_VIDEO_MEMBER_INVALID")
            n_channels += 1
            n_videos += video_rows
        elif video_rows is not None or row.get("channel_id") is not None:
            raise RuntimeError("SOURCE_RECOVERY_NONVIDEO_MEMBER_INVALID")
        if kind == "manifest" and not relative.endswith("/manifest.json"):
            raise RuntimeError("SOURCE_RECOVERY_MANIFEST_PATH_INVALID")
        n_source += kind != "metadata"
        n_metadata += kind == "metadata"
        n_bytes += count
        clean.append({field: row.get(field) for field in fields})
    if (n_bytes != info["bytes"] or n_source != info["source_files"]
            or n_metadata != info["metadata_files"]
            or n_channels != info["channel_files"] or n_videos != info["video_rows"]):
        raise RuntimeError("SOURCE_RECOVERY_ORIGINAL_CENSUS_MISMATCH")
    return sorted(clean, key=lambda row: row["source_path"])


def canonical_recovery_index(records):
    info = archive_identity()
    return (json.dumps({
        "schema": "atlas-youtube-private-original-recovery-index/v1",
        "source_artifact_id": SOURCE_ARTIFACT_ID,
        "original_zip_sha256": info["source_zip_sha256"],
        "member_count": info["members"],
        "member_bytes": info["bytes"],
        "records": validate_recovery_records(records, expected_artifact=SOURCE_ARTIFACT_ID),
    }, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def load_remote_recovery_index(base, token, *, expected_sha256):
    key = private_recovery_index_key()
    if not re.fullmatch(r"[0-9a-f]{64}", str(expected_sha256 or "")):
        raise RuntimeError("SOURCE_RECOVERY_PINNED_INDEX_SHA_REQUIRED")
    body = storage_call("GET", base, token, key)
    if sha256(body) != expected_sha256:
        raise RuntimeError("SOURCE_RECOVERY_PRIVATE_INDEX_SHA_MISMATCH")
    try:
        document = json.loads(body)
    except (ValueError, UnicodeError) as exc:
        raise RuntimeError("SOURCE_RECOVERY_PRIVATE_INDEX_JSON_INVALID") from exc
    info = archive_identity()
    if (document.get("schema") != "atlas-youtube-private-original-recovery-index/v1"
            or document.get("source_artifact_id") != SOURCE_ARTIFACT_ID
            or document.get("original_zip_sha256") != info["source_zip_sha256"]
            or document.get("member_count") != info["members"]
            or document.get("member_bytes") != info["bytes"]):
        raise RuntimeError("SOURCE_RECOVERY_PRIVATE_INDEX_IDENTITY_MISMATCH")
    records = validate_recovery_records(document.get("records"),
                                        expected_artifact=SOURCE_ARTIFACT_ID)
    if body != canonical_recovery_index(records):
        raise RuntimeError("SOURCE_RECOVERY_PRIVATE_INDEX_NONCANONICAL")
    return key, records


def persist_private_recovery_index(base, token, source_receipt):
    """Save a recoverable exact remote object manifest; do not claim DB catalog."""
    info = archive_identity()
    if (source_receipt.get("schema") != "atlas-youtube-source-storage-verification/v2"
            or source_receipt.get("source_artifact_id") != SOURCE_ARTIFACT_ID
            or source_receipt.get("uploaded") is not True
            or source_receipt.get("new_objects") != 0
            or source_receipt.get("existing_objects") != info["members"]
            or source_receipt.get("total_files_discovered") != info["members"]
            or source_receipt.get("total_bytes_discovered") != info["bytes"]
            or source_receipt.get("files_verified") != info["members"]
            or source_receipt.get("bytes_verified") != info["bytes"]):
        raise RuntimeError("SOURCE_RECOVERY_UNVERIFIED_STORAGE_PASS")
    content = canonical_recovery_index(source_receipt.get("records"))
    key = private_recovery_index_key()
    created = False
    try:
        stored = storage_call("GET", base, token, key)
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            raise
        try:
            storage_call("POST", base, token, key, content)
            created = True
        except urllib.error.HTTPError as conflict:
            if conflict.code != 409:
                raise
        stored = storage_call("GET", base, token, key)
    if stored != content:
        raise RuntimeError("SOURCE_RECOVERY_PRIVATE_INDEX_ROUNDTRIP_MISMATCH")
    return {
        "schema": "atlas-youtube-private-original-recovery-index-receipt/v1",
        "original_zip_sha256": info["source_zip_sha256"],
        "source_artifact_id": SOURCE_ARTIFACT_ID,
        "index_object_key": key,
        "index_sha256": sha256(stored),
        "index_byte_count": len(stored),
        "member_count": info["members"],
        "member_bytes": info["bytes"],
        "new_index_object": created,
        "canonical_db_catalog_written": False,
        "canonical_db_catalog_verified": False,
    }


def credentials():
    base = os.environ.get("SUPABASE_URL", "").strip()
    token = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not base.startswith("https://") or not token:
        raise RuntimeError("SUPABASE_SOURCE_UPLOAD_CREDENTIALS_REQUIRED")
    return base, token


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root")
    parser.add_argument("--catalog")
    parser.add_argument("--output", required=True)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-files", type=int)
    parser.add_argument("--expected-total-files", type=int)
    parser.add_argument("--expected-total-bytes", type=int)
    parser.add_argument("--restore-dir")
    parser.add_argument("--publish-private-recovery-index", action="store_true")
    parser.add_argument("--storage-pass-receipt")
    parser.add_argument("--restore-from-private-recovery-index", action="store_true")
    parser.add_argument("--expected-private-index-sha256")
    args = parser.parse_args()

    if args.publish_private_recovery_index:
        if (args.root or args.catalog or args.restore_dir or args.dry_run or
                args.max_files is not None or args.restore_from_private_recovery_index or
                args.expected_private_index_sha256 or not args.storage_pass_receipt):
            raise RuntimeError("SOURCE_RECOVERY_INDEX_PUBLICATION_ARGUMENTS_INVALID")
        base, token = credentials()
        ensure_private_bucket(base, token)
        source_receipt = json.loads(Path(args.storage_pass_receipt).read_text(encoding="utf-8"))
        outcome = persist_private_recovery_index(base, token, source_receipt)
        Path(args.output).write_text(json.dumps(outcome, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(outcome))
        return

    if args.restore_from_private_recovery_index:
        if (args.root or args.catalog or args.dry_run or args.storage_pass_receipt or
                args.max_files is not None or not args.restore_dir or
                not args.expected_private_index_sha256):
            raise RuntimeError("SOURCE_RECOVERY_INDEX_RESTORE_ARGUMENTS_INVALID")
        base, token = credentials()
        ensure_private_bucket(base, token)
        key, records = load_remote_recovery_index(
            base, token, expected_sha256=args.expected_private_index_sha256)
        restored = restore_from_catalog(base, token, records, Path(args.restore_dir).resolve())
        result = {
            "schema": "atlas-youtube-private-index-independent-restore/v1",
            "source_artifact_id": SOURCE_ARTIFACT_ID,
            "index_object_key": key,
            "index_sha256": args.expected_private_index_sha256,
            "catalog_from_original_actions_artifact": False,
            "canonical_db_catalog_written": False,
            "restore": restored,
        }
        Path(args.output).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(result))
        return

    if args.storage_pass_receipt or args.expected_private_index_sha256:
        raise RuntimeError("SOURCE_RECOVERY_INDEX_ARGUMENT_WITHOUT_MODE")

    if args.catalog:
        if args.root or args.dry_run or args.max_files is not None or not args.restore_dir:
            raise RuntimeError("CATALOG_RESTORE_ARGUMENTS_INVALID")
        base, token = credentials()
        ensure_private_bucket(base, token)
        records = json.loads(Path(args.catalog).read_text(encoding="utf-8"))
        result = restore_from_catalog(base, token, records, Path(args.restore_dir).resolve())
        output = {
            "schema": "atlas-youtube-source-remote-restore/v1",
            "source_artifact_id": SOURCE_ARTIFACT_ID,
            "catalog_records": len(records),
            "restore": result,
        }
        path = Path(args.output)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(output))
        return

    if not args.root:
        raise RuntimeError("SOURCE_ROOT_REQUIRED")
    if args.restore_dir:
        raise RuntimeError("RESTORE_REQUIRES_CATALOG_MODE")

    root = Path(args.root).resolve()
    all_files = enumerate_files(root)
    total_bytes = sum(p.stat().st_size for p in all_files)
    if args.expected_total_files is not None and len(all_files) != args.expected_total_files:
        raise RuntimeError(f"SOURCE_FILE_COUNT_MISMATCH: {len(all_files)} != {args.expected_total_files}")
    if args.expected_total_bytes is not None and total_bytes != args.expected_total_bytes:
        raise RuntimeError(f"SOURCE_BYTE_COUNT_MISMATCH: {total_bytes} != {args.expected_total_bytes}")

    files = all_files[:args.max_files] if args.max_files else all_files
    base = token = None
    if not args.dry_run:
        base, token = credentials()
        ensure_private_bucket(base, token)

    records = []
    for file in files:
        if args.dry_run:
            rec = record_for(file, root)
            rec.pop("_contents")
            rec["new_object"] = False
        else:
            rec = upload_and_verify(base, token, file, root)
        records.append(rec)

    output = {
        "schema": "atlas-youtube-source-storage-verification/v2",
        "source_artifact_id": SOURCE_ARTIFACT_ID,
        "total_files_discovered": len(all_files),
        "total_bytes_discovered": total_bytes,
        "files_verified": len(records),
        "bytes_verified": sum(r["byte_count"] for r in records),
        "new_objects": sum(1 for r in records if r["new_object"]),
        "existing_objects": sum(1 for r in records if not r["new_object"]),
        "source_records": sum(1 for r in records if r["source_kind"] != "metadata"),
        "metadata_objects": sum(1 for r in records if r["source_kind"] == "metadata"),
        "uploaded": not args.dry_run,
        "records": records,
    }
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in output.items() if k != "records"}))


if __name__ == "__main__":
    main()
