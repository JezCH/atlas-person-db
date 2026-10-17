#!/usr/bin/env python3
"""Read-only check of 33 older B024 label-count anomalies against REAL original IDs.

Original video titles are collected from the immutable ZIP rather than guessed from
current YouTube search, reviewed registered Person UUIDs, or aggregate title counts.
This emits a source-title evidence dossier, NEVER a Person or biography ranking.
"""
import argparse
import collections
import gzip
import hashlib
import json
import re
import zipfile
from pathlib import Path

ORIGINAL_SHA = "8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"
ORIGINAL_CHANNELS = 10127
ORIGINAL_VIDEO_ROWS = 2230031
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
CHANNEL_ID = re.compile(r"^UC[A-Za-z0-9_-]{22}$")
SCHEMA = "atlas-youtube-b024-33-highrisk-original-video-refs/v1"
DISPOSITIONS = {"HISTORICAL_PERSON_NAME_REVIEW": 16,
                "NON_PERSON_EXACT_LABEL": 15,
                "HOLD_IDENTITY_OR_LIVING": 2}


def verify_manifest(manifest, *, labels=33, sample_links=165, sample_unique=164):
    if (manifest.get("schema") != SCHEMA or
        manifest.get("original_source_zip_sha256") != ORIGINAL_SHA or
        manifest.get("source_snapshot_id") != "yt-20261009T111844Z-10127ch-rebuild-v4" or
        manifest.get("prior_name_forms") != 5720 or
        manifest.get("total_name_form_differences") != 865 or
        manifest.get("historical_biography_approved") is not False or
        manifest.get("production_publication_approved") is not False or
        manifest.get("original_sources_deleted") is not False):
        raise ValueError("SOURCE_ONLY_REFERENCE_CONTRACT_VIOLATED")
    rows = manifest.get("rows")
    if not isinstance(rows, list) or len(rows) != labels:
        raise ValueError("HIGH_RISK_SOURCE_LABEL_POPULATION_MISMATCH")
    named = set()
    names_for_video = collections.defaultdict(set)
    dispositions = collections.Counter()
    total_links = 0
    for row in rows:
        name = row.get("raw_name")
        if not isinstance(name, str) or not name or name in named:
            raise ValueError("HIGH_RISK_DUPLICATE_OR_EMPTY_LABEL")
        named.add(name)
        status = row.get("source_title_label_review")
        if status not in DISPOSITIONS:
            raise ValueError("HIGH_RISK_UNKNOWN_IDENTITY_REVIEW")
        dispositions[status] += 1
        for key in ("previous_channels", "recount_channels", "previous_videos", "recount_videos"):
            if type(row.get(key)) is not int or row[key] < 0:
                raise ValueError("HIGH_RISK_LABEL_COUNT_INVALID")
        if row["previous_channels"] == row["recount_channels"] and row["previous_videos"] == row["recount_videos"]:
            raise ValueError("HIGH_RISK_LABEL_IS_NOT_A_DIFFERENCE")
        ids = row.get("original_example_video_ids")
        if not isinstance(ids, list) or len(ids) != 5 or len(set(ids)) != 5:
            raise ValueError("HIGH_RISK_FIVE_EXACT_SOURCE_VIDEO_IDS_REQUIRED")
        for vid in ids:
            if not isinstance(vid, str) or VIDEO_ID.fullmatch(vid) is None:
                raise ValueError("HIGH_RISK_INVALID_ORIGINAL_VIDEO_ID")
            names_for_video[vid].add(name)
        total_links += len(ids)
    if (total_links != sample_links or len(names_for_video) != sample_unique or
        (labels == 33 and dict(dispositions) != DISPOSITIONS)):
        raise ValueError("HIGH_RISK_VIDEO_SAMPLE_UNION_OR_REVIEW_COUNTS_CHANGED")
    return names_for_video


def audit_original_archive(archive, manifest, *, verify_digest=True,
                           channels=ORIGINAL_CHANNELS, videos=ORIGINAL_VIDEO_ROWS,
                           labels=33, links=165, unique=164):
    refs = verify_manifest(manifest, labels=labels, sample_links=links, sample_unique=unique)
    archive = Path(archive)
    if verify_digest:
        with archive.open("rb") as original_file:
            actual_digest = hashlib.file_digest(original_file, "sha256").hexdigest()
        if actual_digest != ORIGINAL_SHA:
            raise ValueError("IMMUTABLE_ORIGINAL_ZIP_SHA256_MISMATCH")
    found = {}
    seen_channels = set()
    original_video_rows = 0
    with zipfile.ZipFile(archive) as z:
        members = sorted(name for name in z.namelist() if name.endswith(".ndjson.gz") and "/videos/" in name)
        for member in members:
            cid = Path(member).name.removesuffix(".ndjson.gz")
            if CHANNEL_ID.fullmatch(cid) is None or cid in seen_channels:
                raise ValueError("ORIGINAL_CHANNEL_ID_DUPLICATE_OR_INVALID")
            seen_channels.add(cid)
            with gzip.open(z.open(member), "rt", encoding="utf-8") as stream:
                for line in stream:
                    item = json.loads(line)
                    original_video_rows += 1
                    if item.get("channel_id") != cid:
                        raise ValueError("ARCHIVED_ORIGINAL_CHANNEL_VIDEO_BINDING_MISMATCH")
                    vid = item.get("video_id")
                    if vid not in refs:
                        continue
                    if vid in found:
                        raise ValueError("ORIGINAL_VIDEO_ID_DUPLICATE_ACROSS_CHANNELS")
                    found[vid] = {"video_id": vid, "channel_id": cid,
                                  "original_title": item.get("title") or ""}
    if len(seen_channels) != channels or original_video_rows != videos:
        raise ValueError("IMMUTABLE_ORIGINAL_CORPUS_TOTALS_MISMATCH")
    if set(found) != set(refs):
        raise ValueError("ORIGINAL_HIGH_RISK_VIDEO_ID_NOT_IN_IMMUTABLE_ARCHIVE")
    data = []
    for row in manifest["rows"]:
        data.append({**row,"recovered_original_videos": [found[vid] for vid in row["original_example_video_ids"]]})
    overlap = {vid: sorted(names) for vid, names in refs.items() if len(names) > 1}
    return {"schema": "atlas-youtube-b024-33-highrisk-original-video-evidence/v1",
            "original_source_zip_sha256": ORIGINAL_SHA if verify_digest else "SYNTHETIC_TEST_ONLY",
            "original_source_channel_count": len(seen_channels),
            "original_source_video_count": original_video_rows,
            "critical_name_forms_rechecked": len(data),
            "source_label_video_sample_links": links,
            "distinct_original_sample_video_ids": len(found),
            "same_original_video_id_across_raw_name_labels": overlap,
            "all_requested_original_video_ids_found": True,
            "actual_video_subject_watched_or_transcript_confirmed": 0,
            "person_registered_alias_screen_completed": False,
            "production_rank_publishable": False,
            "rows": data}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--archive", required=True)
    p.add_argument("--manifest", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()
    src = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    result = audit_original_archive(args.archive, src)
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k != "rows"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
