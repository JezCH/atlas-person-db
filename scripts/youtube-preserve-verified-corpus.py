#!/usr/bin/env python3
"""Idempotently preserve one validated cumulative YouTube corpus in private Storage.

Use only from trusted GitHub Actions after download-artifact by immutable run/id.
No deletion, overwrite, table writes, Person writes or publication.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

BUCKET = "atlas-youtube-source"

def sha256(data):
    return hashlib.sha256(data).hexdigest()

def call(method, base, token, key, data=None):
    endpoint = base.rstrip("/") + "/storage/v1/object/" + BUCKET + "/" + urllib.parse.quote(key, safe="/")
    headers = {"Authorization": "Bearer " + token, "apikey": token}
    if data is not None:
        headers["Content-Type"] = "application/octet-stream"
        headers["x-upsert"] = "false"
    req = urllib.request.Request(endpoint, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=180) as response:
        return response.read()

def upload_and_verify(base, token, file, root):
    relative = file.relative_to(root).as_posix()
    if not (file.name == "manifest.json" or file.name.endswith(".ndjson.gz")):
        return None
    contents = file.read_bytes()
    if not contents:
        raise RuntimeError("EMPTY_SOURCE_FILE: " + relative)
    digest = sha256(contents)
    key = "validated-batch017/sha256/" + digest[:2] + "/" + digest + "/" + relative
    # If previously uploaded, it must match byte-for-byte. Never use upsert.
    try:
        stored = call("GET", base, token, key)
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            raise
        try:
            call("POST", base, token, key, contents)
        except urllib.error.HTTPError as conflict:
            # Parallel retry may win the initial create; verification below
            # enforces exact contents, so 409 is safe to tolerate.
            if conflict.code != 409:
                raise
        stored = call("GET", base, token, key)
    if len(stored) != len(contents) or sha256(stored) != digest:
        raise RuntimeError("SOURCE_ROUNDTRIP_CHECKSUM_MISMATCH: " + relative)
    kind = "manifest" if file.name == "manifest.json" else "channel_videos"
    return {"object_key": key, "sha256": digest, "byte_count": len(contents),
            "source_kind": kind, "source_path": relative}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    files = sorted(p for p in root.rglob("*") if p.is_file() and
                   (p.name == "manifest.json" or p.name.endswith(".ndjson.gz")))
    if not files or not any(p.name == "manifest.json" for p in files):
        raise RuntimeError("SOURCE_MANIFESTS_NOT_FOUND")
    base = os.environ.get("SUPABASE_URL", "").strip()
    token = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not args.dry_run and (not base.startswith("https://") or not token):
        raise RuntimeError("SUPABASE_SOURCE_UPLOAD_CREDENTIALS_REQUIRED")
    records = []
    for file in files:
        if args.dry_run:
            data = file.read_bytes()
            records.append({"source_path": file.relative_to(root).as_posix(),
                            "sha256": sha256(data), "byte_count": len(data)})
        else:
            records.append(upload_and_verify(base, token, file, root))
    output = {"schema": "atlas-youtube-source-verified-upload/v1",
              "source_artifact_id": 11548326100,
              "files_verified": len(records),
              "bytes_verified": sum(r["byte_count"] for r in records),
              "uploaded": not args.dry_run,
              "records": records}
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in output.items() if k != "records"}))

if __name__ == "__main__":
    main()
