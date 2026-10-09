#!/usr/bin/env python3
"""Append a small YouTube discovery batch without querying or writing Supabase.

Inputs: validated cumulative corpus downloaded from immutable GitHub artifact.
Output: a copy of the complete corpus plus a new, non-overlapping batch.
"""
import argparse
import gzip
import hashlib
import json
import re
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
BATCH = "batch018"  # Legacy default for existing Batch018 regression tests
BATCH019_SEARCHES = [
    "Persian scholars historical biographies",
    "medieval African kingdoms monarchs biographies",
    "Southeast Asia historical kings queens biography",
    "Ottoman scientists architects historical figures",
    "indigenous American historical leaders documentaries",
    "Indian mathematicians historical biographies",
    "Tang dynasty poets and statesmen biographies",
    "history of women inventors pioneers documentaries",
    "ancient Greek philosophers biography documentary",
    "Mongol empire commanders biography history",
    "medieval European queens biographies documentary",
    "Korean historical scholars scientists history",
    "mujeres históricas latinoamérica biografías",
    "شخصيات تاريخية علماء وفلاسفة",
    "历史名人 纪录片 传记",
    "歴史人物 伝記 ドキュメンタリー",
]


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

def manifests(root, next_batch=18, min_channels=6770):
    found = {}
    for path in root.rglob("manifest.json"):
        # Match the existing validated snapshot parser: nested source folders
        # can contain several batch identifiers; first match is canonical.
        match = re.search(r"(?:youtube-)?batch(\d{3})([a-z]?)(?=[^a-z0-9]|$)", str(path).replace("\\\\", "/"), re.I)
        if not match:
            continue
        label = "batch" + match.group(1) + match.group(2).lower()
        if label in found:
            raise RuntimeError("DUPLICATE_BATCH_MANIFEST")
        found[label] = path
    required = {f"batch{i:03d}" for i in range(8,next_batch)}
    # The recoverable 008-017 baseline is mandatory, not an exclusion rule.
    # Accept older batch manifests if they are actually present, and reject
    # an already-created 018 instead of silently recreating that batch.
    if next_batch < 18 or not required.issubset(found) or any(int(label[5:8]) >= next_batch for label in found):
        raise RuntimeError("INCOMPLETE_PRIOR_CORPUS")
    known = set()
    for label in sorted(found):
        rows = json.loads(found[label].read_text(encoding="utf-8"))
        for row in rows:
            channel = row.get("channel_id")
            if not channel or channel in known:
                raise RuntimeError("DUPLICATE_OR_MISSING_PRIOR_CHANNEL_ID")
            known.add(channel)
    if len(known) < min_channels:
        raise RuntimeError("PRIOR_CHANNEL_BASELINE_REGRESSION")
    return known

def verify_preserved_files(root, output):
    """Require byte-for-byte retention of every preexisting file, not totals only."""
    count = 0
    for source in root.rglob("*"):
        if source.is_symlink():
            raise RuntimeError("LEGACY_SYMLINK_NOT_ALLOWED")
        if not source.is_file():
            continue
        target = output / source.relative_to(root)
        if not target.is_file():
            raise RuntimeError("PRIOR_FILE_MISSING: " + str(source.relative_to(root)))
        digests = []
        for path in (source, target):
            checksum = hashlib.sha256()
            with path.open("rb") as handle:
                for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                    checksum.update(chunk)
            digests.append(checksum.digest())
        if digests[0] != digests[1]:
            raise RuntimeError("PRIOR_FILE_CHANGED: " + str(source.relative_to(root)))
        count += 1
    return count


def collect(root, output, limit, video_limit, next_batch=18):
    if not 18 <= next_batch <= 999:
        raise RuntimeError("INVALID_NEXT_BATCH")
    batch_label = f"batch{next_batch:03d}"
    prior = manifests(root, next_batch=next_batch, min_channels=6810 if next_batch>=19 else 6770)
    if output.resolve() == root.resolve() or root.resolve() in output.resolve().parents:
        raise RuntimeError("OUTPUT_MUST_BE_OUTSIDE_INPUT")
    candidates = {}
    succeeded = 0
    queries = BATCH019_SEARCHES + SEARCHES if next_batch>=19 else SEARCHES
    for query in queries:
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
    batch = output / "out" / batch_label
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
    preserved_files = verify_preserved_files(root, output)
    summary={"preserved_prior_files":preserved_files, "batch":batch_label,"previous_channels":len(prior),"selected":len(rows),
             "successful":sum(r["status"]=="OK" for r in rows),
             "videos":sum(r["count"] for r in rows),"supabase_requests":0}
    (output/f"{batch_label}-summary.json").write_text(json.dumps(summary,indent=2),encoding="utf-8")
    print(json.dumps(summary))

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--root",required=True)
    parser.add_argument("--batch",type=int,default=18,help="Next consecutive cumulative batch (>=18)")
    parser.add_argument("--output",required=True)
    parser.add_argument("--limit",type=int,default=40)
    parser.add_argument("--video-limit",type=int,default=300)
    args=parser.parse_args()
    if not (1 <= args.limit <= 100 and 1 <= args.video_limit <= 500):
        raise RuntimeError("UNBOUNDED_COLLECTION_LIMIT")
    collect(Path(args.root).resolve(),Path(args.output).resolve(),args.limit,args.video_limit,next_batch=args.batch)

if __name__=="__main__":
    main()
