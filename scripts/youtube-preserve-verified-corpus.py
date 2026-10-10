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
    rel = Path(relative)
    if not relative or rel.is_absolute() or ".." in rel.parts or any(p in ("", ".") for p in rel.parts):
        raise RuntimeError("UNSAFE_RESTORE_PATH: " + relative)
    return rel


def restore_from_catalog(base, token, records, target):
    if not isinstance(records, list) or not records:
        raise RuntimeError("REMOTE_CATALOG_RECORDS_REQUIRED")
    target.mkdir(parents=True, exist_ok=True)
    restored = 0
    restored_bytes = 0
    seen = set()
    for record in records:
        rel = relative_from_object_key(record)
        key = str(record["object_key"])
        if key in seen:
            raise RuntimeError("REMOTE_CATALOG_DUPLICATE_OBJECT_KEY")
        seen.add(key)
        expected_bytes = int(record.get("byte_count") or 0)
        if expected_bytes <= 0:
            raise RuntimeError("REMOTE_CATALOG_BYTE_COUNT_INVALID")
        data = storage_call("GET", base, token, key)
        if len(data) != expected_bytes or sha256(data) != str(record["sha256"]).lower():
            raise RuntimeError("REMOTE_RESTORE_CHECKSUM_MISMATCH: " + rel.as_posix())
        dest = target / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        restored += 1
        restored_bytes += len(data)
    return {"files": restored, "bytes": restored_bytes}


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
    args = parser.parse_args()

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
