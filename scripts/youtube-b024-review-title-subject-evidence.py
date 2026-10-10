#!/usr/bin/env python3
"""Conservative TITLE topic-cue QA for source-reviewed historical name forms.

This is not certified Person-centered video evidence. In particular, name
headings can be performance/quotation/fiction, and non-English biographies
can be missed by English-only rules. Keep IDs and review buckets separate.
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


def topic_bucket(title, name_forms):
    for name in name_forms:
        match = re.search(
            r"(?<!\w)" + r"\s+".join(re.escape(word) for word in name.split()) + r"(?!\w)",
            title, re.I
        )
        if not match:
            continue
        before = title[:match.start()].strip().casefold()
        after = title[match.end():].strip().casefold()
        if not before or before in ("the", "a"):
            return "NAME_HEADING_REVIEW"
        latin = "".join(ch for ch in unicodedata.normalize("NFKD", before)
                        if not unicodedata.combining(ch))
        if re.search(
            r"(?:(?:the|a|full|complete|short|brief|untold|tragic|true)\s+){0,3}"
            r"(?:life|biography|documentary|story|death|assassination|legacy|rise|fall|reign"
            r"|life and times)\s+(?:of|about)\s*$", latin
        ):
            return "ENGLISH_BIOGRAPHY_SYNTAX_REVIEW"
        if re.search(
            r"(?:biografia|biographie|biography|biografie|histoire|historia|history"
            r"|la vie|la vida|a vida|das leben|vita)\s+(?:of|de|di|du|del|von|about)\s*$",
            latin
        ):
            return "MULTILINGUAL_BIOGRAPHY_SYNTAX_REVIEW"
        if re.search(
            r"(?:extra history|historical profile|person biography|biografia|biographie)"
            r"\s*:\s*$", latin
        ):
            return "SERIES_SUBJECT_SYNTAX_REVIEW"
        if re.search(
            r"\b(?:who\s+(?:was|is)|why\s+(?:did|was|is)|how\s+(?:did|was|is)"
            r"|what\s+happened\s+to)\s*$", latin
        ):
            return "PERSON_QUESTION_SYNTAX_REVIEW"
        if after.startswith(("biography", "documentary", "life story", "the story", "explained")):
            return "POST_NAME_TOPIC_SYNTAX_REVIEW"
    return "TITLE_MENTION_UNRESOLVED"


def audit(source_zip, alias, manifest, *, max_examples=6):
    if alias["schema"] != "youtube-b024-normalized-original-id-review/v1":
        raise ValueError("WRONG_ALIAS_SOURCE_SCHEMA")
    if alias["source_snapshot_id"] != manifest["source_snapshot_id"]:
        raise ValueError("ALIAS_SOURCE_SNAPSHOT_MISMATCH")
    if (alias["original_channels"], alias["original_videos"]) != (
        manifest["original_channel_count"], manifest["original_video_count"]
    ):
        raise ValueError("ORIGINAL_POPULATION_MISMATCH")
    with Path(source_zip).open("rb") as f:
        if hashlib.file_digest(f, "sha256").hexdigest() != manifest["original_source_zip_sha256"]:
            raise ValueError("SOURCE_ZIP_SHA256_MISMATCH")
    historic = {
        row["normalization_key"]: row for row in alias["rows"]
        if row["review_disposition"] == "SAME_PERSON_HISTORICAL_NAME_FORM"
    }
    if len(historic) != 18:
        raise ValueError("EXPECTED_18_HISTORICAL_VARIANT_GROUPS")
    reverse = collections.defaultdict(set)
    valid_channels = {}
    for key, row in historic.items():
        valid_channels[key] = set(row["union_original_channel_ids"])
        for video_id in row["union_original_video_ids"]:
            reverse[video_id].add(key)
    buckets = collections.defaultdict(
        lambda: collections.defaultdict(
            lambda: {"channels": set(), "videos": set(), "samples": []}
        )
    )
    channels, video_rows = set(), 0
    with zipfile.ZipFile(source_zip) as archive:
        for path in sorted(p for p in archive.namelist() if p.endswith(".ndjson.gz")):
            channel_id = Path(path).name.removesuffix(".ndjson.gz")
            if channel_id in channels:
                raise ValueError("DUPLICATE_ORIGINAL_CHANNEL_ID")
            channels.add(channel_id)
            with gzip.open(archive.open(path), "rt", encoding="utf-8") as stream:
                for line in stream:
                    video_rows += 1
                    entry = json.loads(line)
                    video_id = str(entry.get("video_id") or "")
                    keys = [
                        k for k in reverse.get(video_id, ())
                        if channel_id in valid_channels[k]
                    ]
                    if not keys:
                        continue
                    title = str(entry.get("title") or "")
                    for key in keys:
                        reason = (
                            "MULTIPLE_REVIEWED_PERSON_NAMES_IN_VIDEO"
                            if len(keys) > 1 else topic_bucket(title, historic[key]["labels"])
                        )
                        slot = buckets[key][reason]
                        slot["channels"].add(channel_id)
                        slot["videos"].add(video_id)
                        if len(slot["samples"]) < max_examples:
                            slot["samples"].append({
                                "channel_id": channel_id,
                                "video_id": video_id,
                                "title": title[:250]
                            })
    if (len(channels), video_rows) != (
        manifest["original_channel_count"], manifest["original_video_count"]
    ):
        raise ValueError("ORIGINAL_CORPUS_PARITY_MISMATCH")
    results = []
    for key, original in historic.items():
        groups = buckets[key]
        channel_union = set().union(*(slot["channels"] for slot in groups.values()))
        video_union = set().union(*(slot["videos"] for slot in groups.values()))
        if (len(channel_union) != original["distinct_channel_id_union"] or
            len(video_union) != original["distinct_video_id_union"]):
            raise ValueError("ORIGINAL_ID_SOURCE_RECONCILIATION_FAILED: " + key)
        results.append({
            "normalized_name_key": key,
            "raw_name_forms": original["labels"],
            "title_mention_channels": len(channel_union),
            "title_mention_videos": len(video_union),
            "uncertified_topic_cue_buckets": {
                kind: {
                    "distinct_channels": len(slot["channels"]),
                    "distinct_videos": len(slot["videos"]),
                    "original_title_examples": slot["samples"]
                } for kind, slot in groups.items()
            }
        })
    results.sort(key=lambda r: (-r["title_mention_channels"], r["normalized_name_key"]))
    return {
        "schema": "youtube-b024-18-historical-name-title-focus-evidence/v1",
        "source_snapshot_id": manifest["source_snapshot_id"],
        "original_channels": len(channels), "original_videos": video_rows,
        "person_centered_videos_approved": False,
        "counts_are_title_cues_not_verified_person_focused": True,
        "published_rank_eligible": False,
        "rows": results
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for arg in ("source-zip", "alias-json", "review-json", "output"):
        parser.add_argument("--" + arg, required=True)
    args = parser.parse_args()
    def read(path):
        return json.loads(Path(path).read_text(encoding="utf-8"))
    result = audit(args.source_zip, read(args.alias_json), read(args.review_json))
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k != "rows"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
