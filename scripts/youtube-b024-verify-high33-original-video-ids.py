#!/usr/bin/env python3
"""Reverify 33 high-risk original title-name aggregate discrepancies by Video ID.

Offline, READ ONLY. Uses the immutable Oct 9 Batch024 GitHub Actions artifact
and optionally the exact 5,965-label original-ID ledger. Never fetches Vercel,
consults ATLAS Persons to generate name candidates, modifies source data, or
asserts that an archived title is an actually watched one-person documentary.
"""
import argparse
import collections
import gzip
import hashlib
import json
import re
import zipfile
from pathlib import Path

MANIFEST = "atlas-youtube-b024-critical33-original-video-id-audit/v1"
LEDGER = "atlas-youtube-b024-independent-full-source-original-video-evidence/v1"
SOURCE_SHA = "8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"
LEDGER_SHA = "b9d9bcdb4fa98e0f917a1dc32106a84fc11b788b86780078e9c207b5c44e550c"
CHANNEL = re.compile(r"^UC[a-zA-Z0-9_-]{22}$")
VIDEO = re.compile(r"^[a-zA-Z0-9_-]{11}$")
KINDS = {
    "NON_SINGLE_PERSON_LABEL": 15,
    "LIVING_PERSON_STATUS_REVIEW": 1,
    "MULTIPLE_REFERENTS_HOLD": 2,
    "HISTORICAL_PERSON_LABEL_VIDEO_FOCUS_UNVERIFIED": 15,
}


def sha256(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def check_manifest(doc):
    if doc.get("schema") != MANIFEST or doc.get("full_original_zip_artifact", {}).get("zip_sha256") != SOURCE_SHA:
        raise ValueError("HIGH33_MANIFEST_SOURCE_SHA_MISMATCH")
    if doc.get("full_original_id_ledger_sha256") != LEDGER_SHA:
        raise ValueError("HIGH33_MANIFEST_LEDGER_SHA_MISMATCH")
    population = doc.get("corpus_verified") or {}
    diffs = doc.get("diff_population") or {}
    if (population.get("original_distinct_channel_ids") != 10127 or
        population.get("original_video_rows") != 2230031 or
        population.get("independently_discovered_raw_name_forms") != 5965 or
        population.get("legacy_name_forms") != 5720 or
        population.get("additional_source_name_forms") != 245 or
        diffs.get("original_legacy_mismatched_name_forms") != 865 or
        diffs.get("high_impact_name_forms") != 33):
        raise ValueError("HIGH33_ORIGINAL_POPULATION_MISMATCH")
    if (doc.get("original_video_playback_or_timestamped_transcript_certified") != 0 or
        doc.get("individual_content_approved") != 0 or
        doc.get("registered_person_filter_passed") is not False or
        doc.get("production_one_rank_publishable") is not False or
        doc.get("source_video_deleted") is not False):
        raise ValueError("HIGH33_CANNOT_PUBLISH_OR_CERTIFY_CONTENT")
    cases = doc.get("cases")
    if not isinstance(cases, list) or len(cases) != 33:
        raise ValueError("HIGH33_EXPECTED_EXACTLY_33_LABELS")
    seen, kinds, by_video = set(), collections.Counter(), collections.defaultdict(list)
    for row in cases:
        name = row.get("raw_name")
        status = row.get("lexical_review_status")
        if not isinstance(name, str) or not name or name in seen or status not in KINDS:
            raise ValueError("HIGH33_DUPLICATE_OR_UNREVIEWED_NAME")
        seen.add(name)
        kinds[status] += 1
        prior_ch = row.get("prior_title_mention_distinct_channels")
        source_ch = row.get("original_recount_distinct_channels")
        prior_video = row.get("prior_title_mention_distinct_videos")
        source_video = row.get("original_recount_distinct_videos")
        if (not all(type(x) is int and x >= 0 for x in [prior_ch, source_ch, prior_video, source_video]) or
            row.get("channel_delta") != source_ch - prior_ch or
            row.get("video_delta") != source_video - prior_video or
            not (abs(source_ch - prior_ch) >= 30 or abs(source_video - prior_video) >= 100)):
            raise ValueError("HIGH33_CHANGED_AGGREGATE_EVIDENCE_INVALID")
        examples = row.get("original_5_example_video_ids")
        if not isinstance(examples, list) or len(examples) != 5 or len(set(examples)) != 5:
            raise ValueError("HIGH33_EXACT_FIVE_ORIGINAL_VIDEO_IDS_REQUIRED")
        for vid in examples:
            if not isinstance(vid, str) or not VIDEO.fullmatch(vid):
                raise ValueError("HIGH33_INVALID_ORIGINAL_VIDEO_ID")
            by_video[vid].append(name)
        if (row.get("source_id_membership_verified_in_independent_5965_ledger") is not True or
            row.get("original_zip_video_id_and_channel_title_reviewed") is not True or
            row.get("person_centered_videos_confirmed") != 0 or
            row.get("registered_person_screen_pending") is not True):
            raise ValueError("HIGH33_UNPROVEN_PUBLICATION_STATE")
    if dict(kinds) != KINDS or doc.get("reviewed_source_label_categories") != KINDS:
        raise ValueError("HIGH33_REVIEW_CATEGORY_DRIFT")
    evidence = doc.get("replayed_provenance") or {}
    repeated = {vid: names for vid, names in by_video.items() if len(names) > 1}
    if (len(by_video) != 164 or sum(map(len, by_video.values())) != 165 or
        repeated != {"-YFLVaoppvo": ["Martin Luther", "Martin Luther King Jr"]} or
        evidence.get("original_sample_video_id_occurrences") != 165 or
        evidence.get("original_sample_distinct_video_ids") != 164 or
        evidence.get("original_sample_distinct_channel_ids") != 146 or
        evidence.get("original_video_id_channel_title_tsv_sha256") !=
            "d19bbdccf6263c7878b24e9c80825e6cc5b72eb936a28dc6fbc1bf0ff74660a1"):
        raise ValueError("HIGH33_EXAMPLE_VIDEO_ID_FINGERPRINT_DRIFT")
    return by_video


def verify_ledger(doc, file_path):
    if sha256(file_path) != LEDGER_SHA:
        raise ValueError("HIGH33_FULL_SOURCE_LEDGER_SHA_MISMATCH")
    ledger = json.loads(Path(file_path).read_text(encoding="utf-8"))
    if ledger.get("schema") != LEDGER or ledger.get("source_zip_sha256") != SOURCE_SHA:
        raise ValueError("HIGH33_SOURCE_LEDGER_SCHEMA_MISMATCH")
    if (ledger.get("independently_discovered_source_labels") != 5965 or
        ledger.get("older5720_aggregate_count_mismatches") != 865):
        raise ValueError("HIGH33_SOURCE_LEDGER_AGGREGATE_MISMATCH")
    lookup = {row["name"]: row for row in ledger["rows"]}
    if len(lookup) != 5965:
        raise ValueError("HIGH33_SOURCE_LEDGER_DUPLICATE_NAME")
    for row in doc["cases"]:
        name = row["raw_name"]
        saved = lookup.get(name)
        if saved is None or saved.get("origin") != "preexisting_independent_5720":
            raise ValueError("HIGH33_SOURCE_ORIGINAL_LABEL_UNEXPECTED: " + name)
        videos = saved["original_video_ids"]
        channels = saved["original_channel_ids"]
        if (len(set(videos)) != row["original_recount_distinct_videos"] or
            len(set(channels)) != row["original_recount_distinct_channels"] or
            not set(row["original_5_example_video_ids"]).issubset(videos)):
            raise ValueError("HIGH33_SOURCE_ORIGINAL_IDS_OR_COUNTS_CHANGED: " + name)
    return True


def scan_zip(archive_path, example_ids, *, expected_sha=None,
             expected_channels=None, expected_video_rows=None, expected_tsv_sha=None):
    if expected_sha and sha256(archive_path) != expected_sha:
        raise ValueError("HIGH33_ORIGINAL_ZIP_DIGEST_CHANGED")
    expected = set(example_ids)
    if not expected:
        raise ValueError("HIGH33_NO_SOURCE_SAMPLE_IDS")
    channels, found = set(), {}
    source_rows = 0
    with zipfile.ZipFile(archive_path) as archive:
        video_members = sorted(x for x in archive.namelist() if x.endswith(".ndjson.gz"))
        for member in video_members:
            cid = Path(member).name.removesuffix(".ndjson.gz")
            if not CHANNEL.fullmatch(cid) or cid in channels:
                raise ValueError("HIGH33_INVALID_OR_DUPLICATE_CHANNEL_ARCHIVE")
            channels.add(cid)
            with gzip.open(archive.open(member), "rt", encoding="utf-8") as reader:
                for line in reader:
                    item = json.loads(line)
                    source_rows += 1
                    if item.get("channel_id") != cid:
                        raise ValueError("HIGH33_ORIGINAL_VIDEO_CHANNEL_ID_MISMATCH")
                    vid = item.get("video_id")
                    if vid in expected:
                        if vid in found:
                            raise ValueError("HIGH33_DUPLICATE_MATCHED_VIDEO_ID_IN_ARCHIVE")
                        if not isinstance(item.get("title"), str):
                            raise ValueError("HIGH33_VIDEO_SOURCE_TITLE_INVALID")
                        found[vid] = {
                            "video_id": vid, "channel_id": cid, "title": item["title"]
                        }
    if (expected_channels is not None and len(channels) != expected_channels or
        expected_video_rows is not None and source_rows != expected_video_rows):
        raise ValueError("HIGH33_FULL_ORIGINAL_CENSUS_MISMATCH")
    if expected != set(found):
        raise ValueError("HIGH33_ORIGINAL_SOURCE_VIDEO_IDS_MISSING: " +
                         repr(sorted(expected - set(found))[:5]))
    canonical = "\n".join("\t".join(
        [vid, found[vid]["channel_id"], found[vid]["title"]]) for vid in sorted(found))
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    if expected_tsv_sha and digest != expected_tsv_sha:
        raise ValueError("HIGH33_ORIGINAL_VIDEO_TITLE_OR_CHANNEL_CHANGED")
    return {
        "original_channel_count": len(channels),
        "original_video_rows": source_rows,
        "matched_video_ids": len(found),
        "sample_unique_channel_ids": len({x["channel_id"] for x in found.values()}),
        "video_channel_title_sha256": digest,
        "videos": found
    }


def replay(doc, original_zip, *, ledger_path=None):
    by_video = check_manifest(doc)
    if ledger_path is not None:
        verify_ledger(doc, ledger_path)
    evidence = doc["replayed_provenance"]
    result = scan_zip(original_zip, by_video,
        expected_sha=SOURCE_SHA, expected_channels=10127,
        expected_video_rows=2230031,
        expected_tsv_sha=evidence["original_video_id_channel_title_tsv_sha256"])
    if result["matched_video_ids"] != 164 or result["sample_unique_channel_ids"] != 146:
        raise ValueError("HIGH33_EXAMPLE_SOURCE_CHANNEL_VIDEO_COUNT_CHANGED")
    return {
        "schema": "atlas-youtube-b024-high33-original-video-title-replay/v1",
        "source_zip_sha256": SOURCE_SHA,
        "reviewed_name_label_groups": 33,
        "old_aggregate_mismatched_groups": 865,
        "original_source_channels": result["original_channel_count"],
        "original_source_video_rows": result["original_video_rows"],
        "original_video_example_occurrences": 165,
        "distinct_original_video_ids": result["matched_video_ids"],
        "distinct_original_sample_channel_ids": result["sample_unique_channel_ids"],
        "title_and_channel_fingerprint_sha256": result["video_channel_title_sha256"],
        "source_id_ledger_verified_in_this_run": ledger_path is not None,
        "actual_video_playback_or_transcript_approved": 0,
        "registered_person_exclusion_completed": False,
        "production_publication_allowed": False,
        "groups": [{
            "raw_name": row["raw_name"],
            "review_status": row["lexical_review_status"],
            "samples": [result["videos"][vid]
                        for vid in row["original_5_example_video_ids"]]
        } for row in doc["cases"]]
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--manifest", default="audits/youtube-b024-high33-real-original-id-crosscheck-20261017.json")
    p.add_argument("--original-zip", required=True)
    p.add_argument("--ledger", help="Optional raw 5,965-name original-ID ledger; SHA-verified if supplied")
    p.add_argument("--output", required=True)
    args = p.parse_args()
    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    result = replay(manifest, args.original_zip, ledger_path=args.ledger)
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n",
                                 encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k != "groups"},
                     ensure_ascii=False))


if __name__ == "__main__":
    main()
