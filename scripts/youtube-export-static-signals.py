#!/usr/bin/env python3
"""Compile a self-contained public YouTube signal read-model without database access.

Uses only a validated local publication snapshot. Never publishes Person
identity mappings or unreviewed registration decisions from Production.
"""
import argparse
import hashlib
import json
from pathlib import Path

def build(source):
    if source.get("schema") != "atlas-youtube-person-signal-publication/v2":
        raise ValueError("WRONG_SOURCE_SCHEMA")
    snapshot = source.get("snapshot")
    signals = source.get("signals")
    if not isinstance(snapshot, dict) or not isinstance(signals, list):
        raise ValueError("INVALID_SOURCE")
    if snapshot.get("channel_count", 0) < 6011 or snapshot.get("video_count", 0) < 1536512:
        raise ValueError("REGRESSED_SOURCE")
    if snapshot.get("source_state", {}).get("channel_ids_persisted") is not True:
        raise ValueError("MISSING_CHANNEL_IDENTITIES")
    if len(signals) != snapshot.get("threshold_counts", {}).get("3"):
        raise ValueError("SIGNAL_COUNT_MISMATCH")
    rows = []
    last_channels = 10**9
    for i, item in enumerate(signals, start=1):
        name = item.get("raw_name")
        channels = item.get("distinct_channel_count")
        videos = item.get("video_count")
        if not isinstance(name, str) or not name.strip() or not isinstance(channels, int) or channels < 3:
            raise ValueError("INVALID_SIGNAL")
        if type(videos) is not int or videos < channels or channels > last_channels or item.get("rank") != i:
            raise ValueError("SIGNAL_ORDER_OR_COUNT_INVALID")
        rows.append({"name":name,"rank":i,"channels":channels,"videos":videos})
        last_channels = channels
    # Client-side search/pagination uses this compact static data without querying Supabase.
    payload={"schema":"atlas-youtube-public-signals/v1",
             "snapshot":{"id":snapshot["snapshot_id"],"channel_count":snapshot["channel_count"],
                         "video_count":snapshot["video_count"],"signal_count":len(rows),
                         "source_fingerprint":source["publication_fingerprint"]},
             "rows":rows}
    canonical=json.dumps(payload,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()
    payload["sha256"]=hashlib.sha256(canonical).hexdigest()
    return payload

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--source",required=True)
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    source=json.loads(Path(args.source).read_text(encoding="utf-8"))
    output=build(source)
    dest=Path(args.output);dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(output,ensure_ascii=False,separators=(",",":")),encoding="utf-8")
    print(json.dumps({"signals":len(output["rows"]),"snapshot":output["snapshot"]["id"],
                      "bytes":dest.stat().st_size,"sha256":output["sha256"]}))

if __name__=="__main__":
    main()
