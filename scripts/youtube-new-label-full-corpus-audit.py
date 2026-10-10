#!/usr/bin/env python3
"""Read-only fast, original-ID, full-title recall for open-vocabulary names.

Corpus-wide search for name labels discovered independently from source title
cues. Title mentions are NOT biography evidence, verified Persons or an
approved change to the ONE unregistered-Person discovery ranking. Never sum
aggregated names or merge aliases without reviewed original video/channel IDs.
"""
import argparse
import collections
import gzip
import hashlib
import json
import re
import unicodedata
import zipfile
from pathlib import Path

TOKEN_RE = re.compile(r"[^\W_]+", re.UNICODE)


def canonical_tokens(s):
    return " ".join(TOKEN_RE.findall(unicodedata.normalize("NFKC", str(s or "")).casefold()))


def compile_names(candidates, reviewed_nonperson=()):
    forbidden = {canonical_tokens(x) for x in reviewed_nonperson}
    groups = collections.defaultdict(list)
    excluded = collections.Counter()
    for row in candidates:
        if not isinstance(row, dict) or not isinstance(row.get("candidate"), str):
            raise ValueError("invalid candidate row")
        label = row["candidate"]
        norm = canonical_tokens(label)
        if not norm or len(norm.split()) < 2:
            excluded["unsafe_single_token"] += 1
            continue
        if norm in forbidden:
            excluded["reviewed_nonperson"] += 1
            continue
        if row.get("candidate_fold_status") not in (
            "POSSIBLE_ORTHOGRAPHIC_VARIANT", "NEW_LABEL_REVIEW"
        ):
            raise ValueError("unknown candidate identity disposition")
        if int(row.get("distinct_channels", 0)) < 3:
            raise ValueError("cue candidate channel threshold mismatch")
        groups[norm].append(row)
    collisions = {name: rows for name, rows in groups.items() if len(rows) > 1}
    for name in collisions:
        del groups[name]  # no guessed identity unification
    if not groups:
        raise ValueError("no safe multi-token candidates")
    keys = sorted(groups, key=lambda k: (-len(k.split()), -len(k), k))
    matcher = re.compile(r"(?<!\w)(?:" + "|".join(re.escape(k) for k in keys) + r")(?!\w)")
    return matcher, groups, collisions, dict(excluded)


def scan_original_ids(
    source_zip, cue, reference, reviewed_nonperson=(),
    expected_source_sha256=None, max_examples=4
):
    if cue.get("schema") != "youtube-open-vocabulary-name-cue-audit/v2":
        raise ValueError("invalid cue schema")
    if not isinstance(reference.get("snapshot"), dict):
        raise ValueError("invalid source reference")
    source = reference["snapshot"]
    if cue.get("reference_source_snapshot_id") != source.get("snapshot_id"):
        raise ValueError("cue/source snapshot_id mismatch")
    if (int(cue.get("source_channels", -1)) != int(source["channel_count"])
            or int(cue.get("source_videos", -1)) != int(source["video_count"])):
        raise ValueError("cue/source totals mismatch")
    if expected_source_sha256:
        h = hashlib.sha256()
        with open(source_zip, "rb") as f:
            for block in iter(lambda: f.read(1024 * 1024), b""):
                h.update(block)
        if h.hexdigest() != expected_source_sha256.removeprefix("sha256:"):
            raise ValueError("original corpus SHA256 mismatch")

    matcher, groups, collisions, excluded = compile_names(
        cue["rows"], reviewed_nonperson
    )
    stats = {key: {"channels": set(), "videos": set(), "examples": []} for key in groups}
    channels = set()
    source_videos = matched_source_videos = 0
    with zipfile.ZipFile(source_zip) as archive:
        paths = sorted(p for p in archive.namelist() if p.endswith(".ndjson.gz"))
        for path in paths:
            channel = Path(path).name.removesuffix(".ndjson.gz")
            if not channel or channel in channels:
                raise ValueError("duplicate or missing original channel_id")
            channels.add(channel)
            with gzip.open(archive.open(path), "rt", encoding="utf-8") as f:
                for line in f:
                    row = json.loads(line)
                    source_videos += 1
                    title = str(row.get("title") or "")
                    video_id = str(row.get("video_id") or "")
                    matched_keys = set(matcher.findall(canonical_tokens(title)))
                    if not matched_keys:
                        continue
                    if not video_id:
                        raise ValueError("missing original video_id on matched title")
                    matched_source_videos += 1
                    for key in matched_keys:
                        value = stats[key]
                        value["channels"].add(channel)
                        value["videos"].add(video_id)
                        if len(value["examples"]) < max_examples:
                            value["examples"].append({
                                "channel_id": channel, "video_id": video_id,
                                "title": title[:250],
                            })
    if (len(channels) != int(source["channel_count"])
            or source_videos != int(source["video_count"])):
        raise ValueError("original corpus count mismatch")

    rows = []
    for key, [src] in groups.items():
        value = stats[key]
        rows.append({
            "candidate": src["candidate"],
            "identity_disposition": src["candidate_fold_status"],
            "cue_distinct_channels": src["distinct_channels"],
            "cue_distinct_videos": src["distinct_videos"],
            "title_mention_distinct_channels": len(value["channels"]),
            "title_mention_distinct_videos": len(value["videos"]),
            "original_channel_ids": sorted(value["channels"]),
            "original_video_ids": sorted(value["videos"]),
            "original_title_examples": value["examples"],
        })
    rows.sort(key=lambda r: (
        -r["title_mention_distinct_channels"],
        -r["title_mention_distinct_videos"], r["candidate"]
    ))
    return {
        "schema": "youtube-new-label-fulltitle-original-id-recall/v1",
        "publication_eligible": False,
        "source_snapshot_id": source["snapshot_id"],
        "source_channels": len(channels), "source_videos": source_videos,
        "open_vocabulary_raw_labels": len(cue["rows"]),
        "distinct_indexed_labels": len(groups),
        "quarantined_normalization_collision_groups": [
            {"token_sequence": k, "raw_labels": [r["candidate"] for r in vals]}
            for k, vals in sorted(collisions.items())
        ],
        "quarantined_reviewed_labels": excluded,
        "videos_with_any_selected_label": matched_source_videos,
        "candidate_rows": len(rows),
        "title_match_rule": "NFKC casefold word-token boundary; no Person identity inference",
        "caveats": [
            "Every title occurrence is diagnostic mention, not biography evidence.",
            "Different spellings, mononyms, and homonyms remain unmerged.",
            "Candidate labels are neither certified historical people nor confirmed unregistered Persons.",
            "Only original cue-derived labels already in >=3 channels are searched.",
            "The published ranking and atlas_v2 Person DB are not modified.",
        ],
        "rows": rows,
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-zip", required=True)
    p.add_argument("--cue-json", required=True)
    p.add_argument("--signal-json", required=True)
    p.add_argument("--quality-rules", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--expected-source-sha256")
    args = p.parse_args()
    cue = json.loads(Path(args.cue_json).read_text(encoding="utf-8"))
    reference = json.loads(Path(args.signal_json).read_text(encoding="utf-8"))
    rules = json.loads(Path(args.quality_rules).read_text(encoding="utf-8"))
    exclusions = rules["non_person_exact"] + rules["nonhistorical_person_exact"]
    result = scan_original_ids(
        args.source_zip, cue, reference, exclusions,
        expected_source_sha256=args.expected_source_sha256
    )
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2),
                                 encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k != "rows"}, ensure_ascii=False))
    for row in result["rows"][:40]:
        print(f"{row['title_mention_distinct_channels']:4} / "
              f"{row['title_mention_distinct_videos']:5}: {row['candidate']} "
              f"(cue {row['cue_distinct_channels']})")


if __name__ == "__main__":
    main()
