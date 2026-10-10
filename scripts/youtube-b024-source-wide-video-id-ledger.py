#!/usr/bin/env python3
"""Materialize original Video-ID and Channel-ID evidence for all 5,965
independently source-derived B024 title labels. READ ONLY, NOT a Person rank.

- Never use atlas_v2 registered Person names as the source lexicon.
- Preserve the already reviewed 245-name VIDEO ID sets exactly.
- Reindex the older 5,720 names only as a NEW, review-only token grammar.
- Make changed counts visible, never silently overwrite prior aggregates.
- Do not assert every extracted name denotes a Person or a video subject.
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

ORIGINAL_SHA = "8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"
SNAPSHOT = "yt-20261009T111844Z-10127ch-rebuild-v4"
TOKEN = re.compile(r"[^\W_]+", re.UNICODE)


def words(value):
    return tuple(TOKEN.findall(unicodedata.normalize("NFKC", str(value)).casefold()))


def make_index(labels):
    trie = {}
    for label in labels:
        sequence = words(label)
        if not 2 <= len(sequence) <= 16:
            raise ValueError("INVALID_TITLE_NAME_LEXICON_TOKEN_LENGTH")
        node = trie
        for word in sequence:
            node = node.setdefault(word, {})
        node.setdefault("", []).append(label)
    return trie


def title_name_matches(title, trie):
    parts = words(title)
    hits = []
    for i, token in enumerate(parts):
        node = trie.get(token)
        if node is None:
            continue
        if "" in node:
            hits.extend((i, i + 1, label) for label in node[""])
        for j, token2 in enumerate(parts[i + 1:i + 16], start=i + 1):
            node = node.get(token2)
            if node is None:
                break
            if "" in node:
                hits.extend((i, j + 1, label) for label in node[""])
    # Longer literal names win at overlapping positions. E.g. "Martin Luther"
    # does not get an extra credit inside "Dr Martin Luther King Jr".
    kept = []
    for start, end, label in sorted(hits,
                                    key=lambda x: (-(x[1] - x[0]), x[0], x[2])):
        if not any(left <= start and end <= right for left, right, _ in kept):
            kept.append((start, end, label))
    return {label for _, _, label in kept}


def original_reviewed_video_names(reviewed_rows):
    reverse = collections.defaultdict(set)
    evidence = {}
    for row in reviewed_rows:
        name = row["raw_name"]
        video_ids, channel_ids = set(), set()
        for group in row["title_evidence_buckets"].values():
            video_ids.update(group["video_ids"])
            channel_ids.update(group["channel_ids"])
        evidence[name] = (video_ids, channel_ids)
        for vid in video_ids:
            reverse[vid].add(name)
    return reverse, evidence


def replay(source_archive, old_recall, new_review, prefix, *,
           verify_archive=True, expected_channels=10127, expected_videos=2230031,
           expected_old=5720, expected_new=245):
    if verify_archive:
        with Path(source_archive).open("rb") as f:
            if hashlib.file_digest(f, "sha256").hexdigest() != ORIGINAL_SHA:
                raise ValueError("IMMUTABLE_ORIGINAL_SOURCE_ZIP_SHA256_MISMATCH")
    for doc in (old_recall, new_review):
        if doc["source_snapshot_id"] != SNAPSHOT:
            raise ValueError("CROSS_SNAPSHOT_EVIDENCE_NOT_ALLOWED")
    if (old_recall["successful_channels"] != expected_channels or
        old_recall["original_videos"] != expected_videos or
        new_review["source_channels"] != expected_channels or
        new_review["source_videos"] != expected_videos):
        raise ValueError("SOURCE_POPULATION_MISMATCH")
    older = {r["raw_name"]: r for r in old_recall["rows"]}
    new = {r["raw_name"]: r for r in new_review["rows"]}
    if (len(older) != expected_old or len(new) != expected_new or
        set(older) & set(new) or
        new_review["unreviewed_labels_examined"] != expected_new):
        raise ValueError("INDEPENDENT_LABEL_POPULATION_OR_COLLISION")
    trie = make_index(older)
    trusted_video_names, trusted_name_sets = original_reviewed_video_names(new.values())
    seen_trusted = set()
    source_channels, seen_matched_video_ids = set(), set()
    video_rows = 0
    label_video_ids = collections.defaultdict(set)
    label_channel_ids = collections.defaultdict(set)
    prefix = Path(prefix)
    with zipfile.ZipFile(source_archive) as archive, gzip.open(
            str(prefix) + ".ndjson.gz", "wt", encoding="utf8", compresslevel=6) as output:
        for filename in sorted(x for x in archive.namelist()
                               if x.endswith(".ndjson.gz")):
            channel_id = Path(filename).name.removesuffix(".ndjson.gz")
            if channel_id in source_channels:
                raise ValueError("DUPLICATE_ORIGINAL_CHANNEL_ID")
            source_channels.add(channel_id)
            with gzip.open(archive.open(filename), "rt", encoding="utf8") as file:
                for line in file:
                    item = json.loads(line)
                    video_rows += 1
                    vid = item.get("video_id")
                    if item.get("channel_id") != channel_id:
                        raise ValueError("ORIGINAL_VIDEO_CHANNEL_ID_MISMATCH")
                    matched = title_name_matches(item.get("title") or "", trie)
                    # Exact original reviewed source VIDEO sets take precedence;
                    # DO NOT re-run the broader substring grammar on those 245.
                    if vid in trusted_video_names:
                        seen_trusted.add(vid)
                        for name in trusted_video_names[vid]:
                            if channel_id not in trusted_name_sets[name][1]:
                                raise ValueError("TRUSTED_245_ORIGINAL_CHANNEL_ID_MISMATCH")
                        matched.update(trusted_video_names[vid])
                    if not matched:
                        continue
                    if vid in seen_matched_video_ids:
                        raise ValueError("DUPLICATE_MATCHED_ORIGINAL_VIDEO_ID")
                    seen_matched_video_ids.add(vid)
                    for label in matched:
                        label_video_ids[label].add(vid)
                        label_channel_ids[label].add(channel_id)
                    output.write(json.dumps({
                        "video_id": vid, "channel_id": channel_id,
                        "title": item.get("title") or "",
                        "source_name_labels": sorted(matched)
                    }, ensure_ascii=False, separators=(",", ":")) + "\n")
    if len(source_channels) != expected_channels or video_rows != expected_videos:
        raise ValueError("ACTUAL_ORIGINAL_SOURCE_TOTALS_CHANGED")
    if seen_trusted != set(trusted_video_names):
        raise ValueError("REVIEWED_ORIGINAL_245_VIDEO_IDS_NOT_FOUND")
    for name, (videos, channels) in trusted_name_sets.items():
        if label_video_ids[name] != videos or label_channel_ids[name] != channels:
            raise ValueError("REVIEWED_245_ORIGINAL_ID_SETS_CHANGED: " + name)
    old_diffs = []
    rows = []
    for name in sorted(set(older) | set(new)):
        channel_ids = sorted(label_channel_ids[name])
        video_ids = sorted(label_video_ids[name])
        rows.append({
            "raw_name": name,
            "origin": ("previously_extracted_5720" if name in older else
                       "additional_exact_source_245"),
            "original_distinct_channel_count": len(channel_ids),
            "original_distinct_video_count": len(video_ids),
            "original_channel_ids": channel_ids,
            "original_video_ids": video_ids,
            "name_personhood": "UNREVIEWED_NOT_CERTIFIED",
            "actual_video_subjecthood": "NOT_VERIFIED",
            "registered_person_exclusion": "PENDING_FINAL_GATE"
        })
        if name in older:
            prior = older[name]
            if (len(channel_ids) != prior["title_mention_distinct_channels"] or
                len(video_ids) != prior["title_mention_distinct_videos"]):
                old_diffs.append({
                    "raw_name": name,
                    "previous_channels": prior["title_mention_distinct_channels"],
                    "recount_channels": len(channel_ids),
                    "previous_videos": prior["title_mention_distinct_videos"],
                    "recount_videos": len(video_ids)
                })
    result = {
        "schema": "atlas-youtube-b024-independent-full-source-original-video-evidence/v1",
        "source_zip_sha256": ORIGINAL_SHA,
        "source_snapshot_id": SNAPSHOT,
        "source_original_channel_count": len(source_channels),
        "source_original_video_rows": video_rows,
        "independent_raw_name_labels": len(rows),
        "previous_independent_name_labels": len(older),
        "additional_reviewed_name_labels": len(new),
        "matched_original_video_ids": len(seen_matched_video_ids),
        "original_video_name_link_rows": sum(len(x) for x in label_video_ids.values()),
        "additional245_exact_original_id_parity": True,
        "legacy5720_changed_aggregate_rows_REVIEW_ONLY": len(old_diffs),
        "legacy5720_mismatch_examples": old_diffs[:30],
        "live_8713_candidates_reconciled": False,
        "historical_individual_personhood_verified": False,
        "actual_video_content_subjecthood_verified": False,
        "registered_persons_excluded": False,
        "production_rank_publishable": False,
        "rows": rows
    }
    Path(str(prefix) + ".json").write_text(
        json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf8")
    print(json.dumps({k: v for k, v in result.items()
                      if k not in ("rows", "legacy5720_mismatch_examples")},
                     ensure_ascii=False))
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    for arg in ("source-zip", "old-recall", "additional245", "output-prefix"):
        p.add_argument("--" + arg, required=True)
    a = p.parse_args()
    def load(path):
        return json.loads(Path(path).read_text(encoding="utf8"))
    replay(a.source_zip, load(a.old_recall), load(a.additional245),
           a.output_prefix)


if __name__ == "__main__":
    main()
