#!/usr/bin/env python3
"""Source-wide ORIGINAL-ID orthographic Person-label collision audit (read-only).

Build candidate labels from all source-extracted raw-name labels + independent
cue-extracted raw-name labels; NEVER from registered atlas_v2 Person UUIDs.
Historical identity review is a separate, exact-source-pinned manifest. Title
mentions cannot be published as Person-centered biography channels.
"""
import argparse
import collections
import difflib
import gzip
import hashlib
import json
import re
import unicodedata
import zipfile
from pathlib import Path


def fold(s):
    v = unicodedata.normalize("NFKD", s).casefold()
    return "".join(ch for ch in v if ch.isalnum() and not unicodedata.combining(ch))


def collision_groups(signal, cue):
    groups = collections.defaultdict(set)
    for row in signal["signals"]:
        groups[fold(row["raw_name"])].add(row["raw_name"])
    for row in cue["rows"]:
        groups[fold(row["candidate"])].add(row["candidate"])
    return {k: sorted(g) for k, g in groups.items() if len(g) > 1}


def lossless_ascii_anchor(labels):
    # Each original label MUST contain the same ASCII fragment; the source
    # JSON may escape accented letters, so 'bolivar' is NOT safe for 'Bolívar'.
    a, b = labels[:2]
    a, b = a.casefold(), b.casefold()
    match = difflib.SequenceMatcher(None, a, b, autojunk=False).find_longest_match(
        0, len(a), 0, len(b)
    )
    span = a[match.a:match.a + match.size]
    words = re.findall(r"[a-z0-9]+", span)
    anchor = max(words, key=len, default="")
    if len(anchor) < 3 or any(anchor not in label.casefold() for label in labels):
        raise ValueError("UNSAFE_ORTHOGRAPHIC_SEARCH_ANCHOR: " + repr(labels))
    return anchor


def original_regex(label):
    body = r"\s+".join(re.escape(w) for w in label.split())
    return re.compile(r"(?<!\w)" + body + r"(?!\w)", re.I)


def audit(archive, signal, cue, manifest):
    if cue.get("reference_source_snapshot_id") != signal["snapshot"]["snapshot_id"]:
        raise ValueError("CUE_SOURCE_SNAPSHOT_MISMATCH")
    if signal["snapshot"]["snapshot_id"] != manifest["source_snapshot_id"]:
        raise ValueError("REVIEW_SOURCE_SNAPSHOT_MISMATCH")
    groups = collision_groups(signal, cue)
    verdicts = manifest["disposition_by_normalized_key"]
    if set(groups) != set(verdicts) or len(groups) != manifest["accepted_collision_group_count"]:
        raise ValueError("EXACT_COLLISION_GROUPS_DIFFER_FROM_REVIEW")
    if (signal["snapshot"]["channel_count"] != manifest["original_channel_count"]
            or signal["snapshot"]["video_count"] != manifest["original_video_count"]):
        raise ValueError("REFERENCE_SOURCE_TOTAL_MISMATCH")
    with Path(archive).open("rb") as source:
        if hashlib.file_digest(source, "sha256").hexdigest() != manifest["original_source_zip_sha256"]:
            raise ValueError("ORIGINAL_SOURCE_SHA256_MISMATCH")

    hints = collections.defaultdict(set)
    regexes = {}
    for key, labels in groups.items():
        hints[lossless_ascii_anchor(labels)].add(key)
        regexes[key] = [(label, original_regex(label)) for label in labels]
    keys = tuple(hints)
    evidence = {
        key: {label: {"channels": set(), "videos": set(), "examples": []}
              for label in labels}
        for key, labels in groups.items()
    }
    seen_channels = set()
    original_videos = 0
    with zipfile.ZipFile(archive) as z:
        for path in sorted(p for p in z.namelist() if p.endswith(".ndjson.gz")):
            channel_id = Path(path).name.removesuffix(".ndjson.gz")
            if not channel_id or channel_id in seen_channels:
                raise ValueError("DUPLICATE_OR_EMPTY_CHANNEL_ID")
            seen_channels.add(channel_id)
            with gzip.open(z.open(path), "rt", encoding="utf-8") as f:
                for raw in f:
                    original_videos += 1
                    lower = raw.lower()
                    candidates = {
                        key for hint in keys if hint in lower for key in hints[hint]
                    }
                    if not candidates:
                        continue
                    data = json.loads(raw)
                    title = str(data.get("title") or "")
                    video_id = str(data.get("video_id") or "")
                    for key in candidates:
                        for label, pattern in regexes[key]:
                            if not pattern.search(title):
                                continue
                            if not video_id:
                                raise ValueError("MATCHED_VIDEO_WITHOUT_SOURCE_ID")
                            row = evidence[key][label]
                            row["channels"].add(channel_id)
                            row["videos"].add(video_id)
                            if len(row["examples"]) < 3:
                                row["examples"].append({
                                    "channel_id": channel_id,
                                    "video_id": video_id,
                                    "title": title[:240]
                                })
    if (len(seen_channels) != manifest["original_channel_count"]
            or original_videos != manifest["original_video_count"]):
        raise ValueError("ORIGINAL_SOURCE_POPULATION_MISMATCH")
    rows = []
    for key, variants in evidence.items():
        channels = set().union(*(r["channels"] for r in variants.values()))
        videos = set().union(*(r["videos"] for r in variants.values()))
        raw_variants = [{
            "raw_name": name,
            "channel_count": len(v["channels"]),
            "video_count": len(v["videos"]),
            "original_channel_ids": sorted(v["channels"]),
            "original_video_ids": sorted(v["videos"]),
            "source_title_examples": v["examples"],
        } for name, v in variants.items()]
        rows.append({
            "normalization_key": key,
            "labels": list(variants),
            "review_disposition": verdicts[key],
            "distinct_channel_id_union": len(channels),
            "distinct_video_id_union": len(videos),
            "incorrect_channel_sum_inflation": sum(v["channel_count"] for v in raw_variants) - len(channels),
            "union_original_channel_ids": sorted(channels),
            "union_original_video_ids": sorted(videos),
            "variants": raw_variants
        })
    rows.sort(key=lambda r: (-r["distinct_channel_id_union"], r["normalization_key"]))
    return {
        "schema": "youtube-b024-normalized-original-id-review/v1",
        "source_snapshot_id": manifest["source_snapshot_id"],
        "original_channels": len(seen_channels),
        "original_videos": original_videos,
        "collision_groups": len(rows),
        "publication_allowed": False,
        "title_mention_is_verified_person_centered": False,
        "registered_person_identity_source_used": False,
        "rows": rows
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-zip", required=True)
    p.add_argument("--signal-json", required=True)
    p.add_argument("--cue-json", required=True)
    p.add_argument("--review-json", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()
    def load(path):
        return json.loads(Path(path).read_text(encoding="utf-8"))
    out = audit(args.source_zip, load(args.signal_json), load(args.cue_json), load(args.review_json))
    Path(args.output).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in out.items() if k != "rows"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
