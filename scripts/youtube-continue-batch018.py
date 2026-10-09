#!/usr/bin/env python3
"""Append a small YouTube discovery batch without querying or writing Supabase.

Inputs: validated cumulative corpus downloaded from immutable GitHub artifact.
Output: a copy of the complete corpus plus a new, non-overlapping batch.
"""
import argparse
import gzip
import json
import shutil
import subprocess
from pathlib import Path

SEARCHES = [
    "forgotten historical figures biography",
    "women leaders history documentary",
    "ancient history biography documentary",
    "African historical figures biography",
    "Asian historical figures biography",
    "Latin American history notable people",
    "scientists biographies history documentary",
    "medieval historical personalities biography",
    "historical人物 伝記",
    "역사 인물 다큐",
    "personajes históricos olvidados biografía",
    "figures historiques méconnues documentaire",
    "исторические личности документальный фильм",
    "historische Persönlichkeiten Biografie",
    "شخصيات تاريخية سيرة",
    "历史人物 传记",
]
BATCH = "batch018"

def run_yt(url, timeout=90):
    try:
        command = ["yt-dlp", "--flat-playlist", "--dump-single-json", "--no-warnings"]
        if "/channel/" in url:
            command += ["--playlist-end", "500"]
        process = subprocess.run(
            command + [url],
            capture_output=True, text=True, timeout=timeout, check=False,
        )
        if process.returncode != 0:
            return None
        return json.loads(process.stdout)
    except (ValueError, OSError, subprocess.TimeoutExpired):
        return None

def manifests(root):
    found = {}
    for path in root.rglob("manifest.json"):
        labels = set(part for part in path.parts if part.startswith("batch") and part[5:].isdigit())
        if len(labels) != 1:
            raise RuntimeError("AMBIGUOUS_BATCH_MANIFEST")
        label = labels.pop()
        if label in found:
            raise RuntimeError("DUPLICATE_BATCH_MANIFEST")
        found[label] = path
    expected = {f"batch{i:03d}" for i in range(8,18)}
    if set(found) != expected:
        raise RuntimeError("INCOMPLETE_PRIOR_CORPUS")
    known = set()
    for label in sorted(found):
        rows = json.loads(found[label].read_text(encoding="utf-8"))
        for row in rows:
            channel = row.get("channel_id")
            if not channel or channel in known:
                raise RuntimeError("DUPLICATE_OR_MISSING_PRIOR_CHANNEL_ID")
            known.add(channel)
    if len(known) != 6770:
        raise RuntimeError("PRIOR_CHANNEL_BASELINE_MISMATCH")
    return known

def collect(root, output, limit, video_limit):
    prior = manifests(root)
    if output.resolve() == root.resolve() or root.resolve() in output.resolve().parents:
        raise RuntimeError("OUTPUT_MUST_BE_OUTSIDE_INPUT")
    candidates = {}
    succeeded = 0
    for query in SEARCHES:
        result = run_yt(f"ytsearch10:{query}")
        if result is None:
            continue
        succeeded += 1
        for entry in result.get("entries") or []:
            cid = entry.get("channel_id")
            if isinstance(cid,str) and cid.startswith("UC") and cid not in prior:
                candidates.setdefault(cid, {"channel_id":cid,"channel_name":str(entry.get("channel") or "")})
    if succeeded < 4 or not candidates:
        raise RuntimeError("DISCOVERY_FAILED_OR_NO_NEW_CHANNELS")
    selected = list(candidates.values())[:limit]
    # First construct the new batch outside output, then copy verified originals.
    batch = output / "out" / BATCH
    videos_dir = batch / "videos"
    videos_dir.mkdir(parents=True,exist_ok=True)
    rows = []
    for candidate in selected:
        cid = candidate["channel_id"]
        result = run_yt(f"https://www.youtube.com/channel/{cid}/videos", timeout=120)
        if result is None:
            rows.append({**candidate,"status":"ERR","count":0})
            continue
        entries = (result.get("entries") or [])[:video_limit]
        if not entries:
            rows.append({**candidate,"status":"EMPTY","count":0})
            continue
        videos = [{"video_id":entry.get("id"),"channel_id":cid,"title":entry.get("title")} for entry in entries]
        with gzip.open(videos_dir / f"{cid}.ndjson.gz","wt",encoding="utf-8") as handle:
            for video in videos:
                handle.write(json.dumps(video,ensure_ascii=False,separators=(",",":"))+"\n")
        rows.append({**candidate,"status":"OK","count":len(videos)})
    if not any(row["status"] == "OK" for row in rows):
        raise RuntimeError("NO_CHANNELS_SCANNED_SUCCESSFULLY")
    (batch/"manifest.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding="utf-8")
    (batch/"candidates.json").write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding="utf-8")
    # Copy the immutable source corpus after the new batch is complete. Never overwrite originals.
    for source in root.iterdir():
        destination = output / source.name
        if destination.exists():
            if source.name != "out" or not source.is_dir():
                raise RuntimeError("SOURCE_OUTPUT_COLLISION")
            for item in source.iterdir():
                if (destination/item.name).exists():
                    raise RuntimeError("EXISTING_BATCH_COLLISION")
                if item.is_dir(): shutil.copytree(item,destination/item.name)
                else: shutil.copy2(item,destination/item.name)
        elif source.is_dir(): shutil.copytree(source,destination)
        else: shutil.copy2(source,destination)
    summary={"batch":BATCH,"previous_channels":len(prior),"selected":len(rows),
             "successful":sum(r["status"]=="OK" for r in rows),
             "videos":sum(r["count"] for r in rows),"supabase_requests":0}
    (output/"batch018-summary.json").write_text(json.dumps(summary,indent=2),encoding="utf-8")
    print(json.dumps(summary))

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--root",required=True)
    parser.add_argument("--output",required=True)
    parser.add_argument("--limit",type=int,default=40)
    parser.add_argument("--video-limit",type=int,default=300)
    args=parser.parse_args()
    if not (1 <= args.limit <= 100 and 1 <= args.video_limit <= 500):
        raise RuntimeError("UNBOUNDED_COLLECTION_LIMIT")
    collect(Path(args.root).resolve(),Path(args.output).resolve(),args.limit,args.video_limit)

if __name__=="__main__":
    main()
