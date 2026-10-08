#!/usr/bin/env python3
"""Preserve verified YouTube corpus in Cloudflare R2, without Supabase API calls."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from botocore.exceptions import ClientError

SOURCE_ARTIFACT_ID = 11548326100
PREFIX = "validated-batch017/sha256/"

def eligible(root):
    files = sorted(p for p in root.rglob("*") if p.is_file() and (p.name == "manifest.json" or p.name.endswith(".ndjson.gz")))
    if not files or not any(p.name == "manifest.json" for p in files):
        raise RuntimeError("SOURCE_MANIFESTS_NOT_FOUND")
    return files

def preserve(client, bucket, root, path):
    data = path.read_bytes()
    if not data:
        raise RuntimeError("EMPTY_SOURCE_FILE")
    digest = hashlib.sha256(data).hexdigest()
    relative = path.relative_to(root).as_posix()
    key = PREFIX + digest[:2] + "/" + digest + "/" + relative
    try:
        head = client.head_object(Bucket=bucket, Key=key)
    except ClientError as error:
        status = error.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
        if status != 404:
            raise
        try:
            client.put_object(Bucket=bucket, Key=key, Body=data, ContentType="application/octet-stream",
                              Metadata={"sha256": digest}, IfNoneMatch="*")
        except ClientError as conflict:
            if conflict.response.get("ResponseMetadata", {}).get("HTTPStatusCode") not in (409, 412):
                raise
    else:
        if head["ContentLength"] != len(data) or head.get("Metadata", {}).get("sha256") != digest:
            raise RuntimeError("EXISTING_OBJECT_METADATA_MISMATCH: " + relative)
    # Independently verify bytes, not just ETag or upload success.
    stored = client.get_object(Bucket=bucket, Key=key)["Body"].read()
    if len(stored) != len(data) or hashlib.sha256(stored).hexdigest() != digest:
        raise RuntimeError("SOURCE_ROUNDTRIP_CHECKSUM_MISMATCH: " + relative)
    return {"object_key": key, "sha256": digest, "byte_count": len(data), "source_path": relative}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    files = eligible(root)
    if args.dry_run:
        records = [{"source_path":p.relative_to(root).as_posix(),"sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"byte_count":p.stat().st_size} for p in files]
    else:
        import boto3
        account = os.environ.get("R2_ACCOUNT_ID", "")
        bucket = os.environ.get("R2_BUCKET", "")
        key_id = os.environ.get("R2_ACCESS_KEY_ID", "")
        secret = os.environ.get("R2_SECRET_ACCESS_KEY", "")
        if not account or not bucket or not key_id or not secret:
            raise RuntimeError("R2_CREDENTIALS_REQUIRED")
        client = boto3.client("s3", endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
                              aws_access_key_id=key_id, aws_secret_access_key=secret, region_name="auto")
        records = [preserve(client,bucket,root,p) for p in files]
    output = {"schema":"atlas-youtube-source-r2-verified/v1","source_artifact_id":SOURCE_ARTIFACT_ID,
              "uploaded":not args.dry_run,"files_verified":len(records),
              "bytes_verified":sum(r["byte_count"] for r in records),"records":records}
    dest=Path(args.output);dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({k:v for k,v in output.items() if k!="records"}))

if __name__=="__main__":
    main()
