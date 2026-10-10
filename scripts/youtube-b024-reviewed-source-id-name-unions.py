#!/usr/bin/env python3
"""Read-only reviewed name-variant unions from original YouTube video/channel IDs.

Only the immutable Batch008–024 original corpus is accepted by its SHA256.
Never sum aggregate channel counts, infer held short names, use registered
Person UUIDs as a lexicon, or publish title mentions as biographies.
"""
import argparse
import collections
import gzip
import hashlib
import json
import re
import zipfile
from pathlib import Path

HINTS = {
    "Simón Bolívar": ("bolivar", "bolívar"),
    "Mary, Queen of Scots": ("queen of scots",),
    "Imam al-Bukhari": ("bukhari",),
    "Khalid ibn al-Walid": ("walid",),
    "Elizabeth I": ("elizabeth",),
    "Henry VIII": ("henry",),
    "Elizabeth Báthory": ("bathory", "báthory"),
    "Mansa Musa": ("mansa",),
    "Carter G. Woodson": ("woodson",),
    "Martin Luther King [father-son HOLD]": ("luther king",),
    "Princess Diana [short HOLD]": ("diana",),
    "Prince Edward [place HOLD]": ("prince edward",),
}


def audit(source_zip, config, *, check_sha=True):
    if config.get("schema") != "youtube-b024-reviewed-original-id-variant-groups/v1":
        raise ValueError("INVALID_B024_ALIAS_CONFIG")
    specs = config["groups"]
    if {g["name"] for g in specs} != set(HINTS) or len(specs) != len(HINTS):
        raise ValueError("ALIAS_GROUP_CONFIG_MISMATCH")
    source_zip = Path(source_zip)
    if check_sha:
        with source_zip.open("rb") as reader:
            digest = hashlib.file_digest(reader, "sha256").hexdigest()
        if digest != config["source_zip_sha256"]:
            raise ValueError("ORIGINAL_SOURCE_SHA256_MISMATCH")
    matchers = {
        g["name"]: [(label, re.compile(
            r"(?<!\w)" + r"\s+".join(re.escape(w) for w in label.split()) + r"(?!\w)",
            re.IGNORECASE
        )) for label in g["variants"]]
        for g in specs
    }
    evidence = {
        name: {label: {"channel_ids": set(), "video_ids": set(), "examples": []}
               for label, _ in variants}
        for name, variants in matchers.items()
    }
    hints_to_groups = collections.defaultdict(set)
    for name, hints in HINTS.items():
        for hint in hints:
            hints_to_groups[hint].add(name)
    hints = tuple(hints_to_groups)
    channels = set()
    video_rows = 0
    with zipfile.ZipFile(source_zip) as archive:
        for path in sorted(x for x in archive.namelist() if x.endswith(".ndjson.gz")):
            channel_id = Path(path).name.removesuffix(".ndjson.gz")
            if not channel_id or channel_id in channels:
                raise ValueError("SOURCE_CHANNEL_ID_COLLISION")
            channels.add(channel_id)
            with gzip.open(archive.open(path), "rt", encoding="utf-8") as stream:
                for raw in stream:
                    video_rows += 1
                    lower = raw.casefold()
                    # Escaped Unicode source strings require decoding before hint search.
                    parsed = json.loads(raw) if r"\u" in lower else None
                    candidate_text = (str(parsed.get("title") or "").casefold()
                                      if parsed is not None else lower)
                    selected = {name for hint in hints if hint in candidate_text
                                for name in hints_to_groups[hint]}
                    if not selected:
                        continue
                    if parsed is None:
                        parsed = json.loads(raw)
                    title = str(parsed.get("title") or "")
                    video_id = str(parsed.get("video_id") or "")
                    if not video_id:
                        raise ValueError("MATCHED_VIDEO_WITHOUT_ORIGINAL_ID")
                    for name in selected:
                        for label, pattern in matchers[name]:
                            if not pattern.search(title):
                                continue
                            entry = evidence[name][label]
                            entry["channel_ids"].add(channel_id)
                            entry["video_ids"].add(video_id)
                            if len(entry["examples"]) < 3:
                                entry["examples"].append({
                                    "channel_id": channel_id, "video_id": video_id,
                                    "title": title[:240]
                                })
    if (len(channels), video_rows) != (
        config["expected_source_channel_count"], config["expected_source_video_count"]
    ):
        raise ValueError("ORIGINAL_SOURCE_POPULATION_MISMATCH")

    results = []
    for group in specs:
        name = group["name"]
        variant_data = evidence[name]
        union_channels = set().union(*(v["channel_ids"] for v in variant_data.values()))
        union_videos = set().union(*(v["video_ids"] for v in variant_data.values()))
        variants = []
        for label, source in variant_data.items():
            variants.append({
                "raw_label": label,
                "distinct_original_channels": len(source["channel_ids"]),
                "distinct_original_videos": len(source["video_ids"]),
                "original_channel_ids": sorted(source["channel_ids"]),
                "original_video_ids": sorted(source["video_ids"]),
                "source_title_examples": source["examples"]
            })
        inflation = sum(v["distinct_original_channels"] for v in variants) - len(union_channels)
        if (len(union_channels) != group["expected_unique_original_channel_ids"] or
            len(union_videos) != group["expected_unique_original_video_ids"] or
            inflation != group["expected_invalid_channel_sum_inflation"]):
            raise ValueError("REVIEWED_ORIGINAL_ID_COUNTS_MISMATCH: " + name)
        results.append({
            "name": name, "identity_review": group["identity_review"],
            "eligible_for_person_union": group["identity_review"].startswith("SAME_PERSON_"),
            "title_only_evidence_not_verified_biography": True,
            "distinct_original_channel_id_union": len(union_channels),
            "distinct_original_video_id_union": len(union_videos),
            "incorrect_sum_channel_inflation": inflation,
            "union_original_channel_ids": sorted(union_channels),
            "union_original_video_ids": sorted(union_videos),
            "variants": variants,
        })
    return {
        "schema": "youtube-b024-source-id-alias-review-audit/v1",
        "source_sha256": config["source_zip_sha256"],
        "source_channel_count": len(channels),
        "source_video_count": video_rows,
        "registered_person_uuid_based": False,
        "production_publication_eligible": False,
        "title_occurrence_is_person_centered": False,
        "groups": results
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-zip", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    config = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    result = audit(args.source_zip, config)
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2),
                                 encoding="utf-8")
    print(json.dumps([{
        "name": g["name"], "review": g["identity_review"],
        "channels": g["distinct_original_channel_id_union"],
        "videos": g["distinct_original_video_id_union"]
    } for g in result["groups"]], ensure_ascii=False))


if __name__ == "__main__":
    main()
