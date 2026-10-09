#!/usr/bin/env python3
"""Read-only Person UUID sidecar for the preserved cumulative YouTube corpus.

Evidence is exact, reviewed name evidence only. No fuzzy or substring matching,
no production writes, and no modification of raw-title signal rankings.
"""
import argparse
import collections
import csv
import gzip
import importlib.util
import json
import re
import unicodedata
from pathlib import Path

PARSER_PATH = Path(__file__).with_name("youtube-build-person-signal-snapshot.py")
_UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)


def load_parser():
    spec = importlib.util.spec_from_file_location("youtube_signal_parser", PARSER_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def key(name):
    return unicodedata.normalize("NFKC", str(name or "")).casefold().strip()


def read_registered_audit(path):
    by_name, names_by_id = {}, collections.defaultdict(set)
    total = 0
    with Path(path).open("r", newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            total += 1
            if row.get("review_lane") != "REGISTERED" or row.get("reviewed_living") != "no":
                continue
            raw, uuid = row.get("raw_name", ""), row.get("registered_uuids", "").strip()
            if not _UUID.fullmatch(uuid) or not key(raw):
                continue  # ambiguous/multiple UUID decisions are not authoritatively linked
            lookup = key(raw)
            if lookup in by_name and by_name[lookup] != uuid:
                raise ValueError("AUDIT_IDENTITY_CONFLICT: " + raw)
            by_name[lookup] = uuid
            names_by_id[uuid].add(raw)
    if not total or not by_name:
        raise ValueError("MISSING_REVIEWED_IDENTITY_SOURCE")
    return by_name, names_by_id, total


def build_resolution(audit_path, registration_path, reviewed_path):
    verified, labels_by_id, audit_total = read_registered_audit(audit_path)
    assignments = collections.defaultdict(set)
    provenance = collections.defaultdict(set)
    for name, uuid in verified.items():
        assignments[name].add(uuid)
        provenance[name].add("registration_audit")

    for row in json.loads(Path(registration_path).read_text(encoding="utf-8")):
        alias, canonical = row["alias_name"], row["canonical_key"]
        sources = {verified[k] for k in (key(alias), key(canonical)) if k in verified}
        if len(sources) > 1:
            # Conflicting canonical identities require human adjudication.
            assignments[key(alias)].update(sources)
            continue
        if len(sources) == 1:
            uuid = next(iter(sources))
            # Even a reviewed representative alias is matched only as an exact
            # parsed name, not an arbitrary mention or substring in a title.
            assignments[key(alias)].add(uuid)
            provenance[key(alias)].add("reviewed_registration_alias")
            labels_by_id[uuid].add(canonical)

    reviewed = json.loads(Path(reviewed_path).read_text(encoding="utf-8"))
    if reviewed.get("schema") != "atlas-youtube-person-identity-aliases/v1":
        raise ValueError("INVALID_REVIEWED_ALIASES_SCHEMA")
    for row in reviewed["aliases"]:
        alias, base = row["alias"], row["registered_basis"]
        basis_id = verified.get(key(base))
        if not basis_id:
            raise ValueError("REVIEWED_ALIAS_WITHOUT_REGISTERED_PERSON: " + alias)
        assignments[key(alias)].add(basis_id)
        provenance[key(alias)].add("curated_multilingual_alias")
        labels_by_id[basis_id].add(base)

    # Never pick a winner for names that point at different Person UUIDs.
    resolved = {label: next(iter(ids)) for label, ids in assignments.items() if len(ids) == 1}
    ambiguous = {label: sorted(ids) for label, ids in assignments.items() if len(ids) > 1}
    for label in ambiguous:
        resolved.pop(label, None)
    return resolved, ambiguous, labels_by_id, provenance, audit_total


def aggregate(root, audit, registration, reviewed, *, source_run_id, source_artifact_id,
              source_digest, expected_channels, expected_videos, expected_selected,
              production_snapshot_id):
    parser = load_parser()
    resolved, ambiguous, display_names, provenance, reviewed_rows = build_resolution(
        audit, registration, reviewed
    )
    manifests = parser.load_manifest_paths(root)
    expected_batches = sorted(manifests, key=lambda x: (int(x[5:8]), x[8:]))
    if "batch024" not in manifests or "batch025" in manifests:
        raise ValueError("WRONG_SOURCE_FRONTIER")
    seen_channels, successful, source_rows = set(), set(), 0
    distinct_channels = collections.defaultdict(set)
    distinct_videos = collections.defaultdict(set)
    variant_channels = collections.defaultdict(lambda: collections.defaultdict(set))
    variant_videos = collections.defaultdict(lambda: collections.defaultdict(set))
    matched_records, uncertain_records, parsed_video_rows = 0, 0, 0
    for batch in expected_batches:
        manifest = manifests[batch]
        rows = json.loads(manifest.read_text(encoding="utf-8"))
        for item in rows:
            channel_id = str(item.get("channel_id") or "").strip()
            status = item.get("status")
            if not channel_id or channel_id in seen_channels:
                raise ValueError("DUPLICATE_OR_MISSING_CHANNEL_ID")
            seen_channels.add(channel_id)
            source_rows += 1
            if status not in ("OK", "ERR", "EMPTY"):
                raise ValueError("INVALID_MANIFEST_STATUS")
            if status != "OK":
                continue
            successful.add(channel_id)
            archive = manifest.parent / "videos" / (channel_id + ".ndjson.gz")
            if not archive.is_file():
                raise ValueError("MISSING_ORIGINAL_ARCHIVE: " + channel_id)
            local_rows = 0
            with gzip.open(archive, "rt", encoding="utf-8") as handle:
                for line in handle:
                    row = json.loads(line)
                    local_rows += 1
                    title = row.get("title")
                    raw = parser.title_candidate(title)
                    if not raw:
                        continue
                    normalized = parser.normalize_person_candidate(raw)
                    label = key(normalized)
                    if label in ambiguous:
                        uncertain_records += 1
                        continue
                    pid = resolved.get(label)
                    if pid is None:
                        continue
                    # The reviewed, full-name exact match can include short
                    # non-Latin names omitted by the legacy >=3-character rule.
                    if label not in resolved:
                        continue
                    video_id = row.get("video_id")
                    if not video_id or row.get("channel_id") != channel_id:
                        raise ValueError("MISSING_OR_MISMATCHED_VIDEO_PROVENANCE")
                    matched_records += 1
                    distinct_channels[pid].add(channel_id)
                    distinct_videos[pid].add(video_id)
                    variant_channels[pid][label].add(channel_id)
                    variant_videos[pid][label].add(video_id)
            if local_rows != int(item.get("count") or 0):
                raise ValueError("MANIFEST_VIDEO_COUNT_MISMATCH")
            parsed_video_rows += local_rows
    if (len(successful), parsed_video_rows, source_rows) != (
        expected_channels, expected_videos, expected_selected
    ):
        raise ValueError("CORPUS_BASELINE_MISMATCH: " + repr(
            (len(successful), parsed_video_rows, source_rows)
        ))

    persons = []
    for uuid, channels in distinct_channels.items():
        variants = [
            {"raw_name_key": alias, "channels": len(ids),
             "videos": len(variant_videos[uuid][alias]),
             "provenance": sorted(provenance[alias])}
            for alias, ids in sorted(variant_channels[uuid].items())
        ]
        # Every entity-level count derives from unions of original IDs.
        if len(channels) > sum(item["channels"] for item in variants):
            raise ValueError("INVALID_CHANNEL_UNION")
        persons.append({
            "person_id": uuid,
            "display_name_basis": sorted(display_names[uuid], key=lambda x: (len(x), x))[0]
                if display_names[uuid] else uuid,
            "distinct_channel_count": len(channels),
            "distinct_video_count": len(distinct_videos[uuid]),
            "matched_variants": variants,
        })
    persons.sort(key=lambda p: (-p["distinct_channel_count"],
                              -p["distinct_video_count"], p["person_id"]))
    for i, p in enumerate(persons, 1):
        p["rank"] = i
    return {
        "schema": "atlas-youtube-person-identity-sidecar/v1",
        "source": {
            "production_snapshot_id": production_snapshot_id,
            "run_id": source_run_id,
            "artifact_id": source_artifact_id,
            "artifact_digest": source_digest,
            "coverage_batches": expected_batches,
            "successful_channel_count": len(successful),
            "selected_channel_count": len(seen_channels),
            "source_video_rows": parsed_video_rows,
            "registration_audit_rows": reviewed_rows,
        },
        "method": {
            "identity": "registered_uuid_exact_reviewed_alias_only",
            "evidence": "legacy_strong_title_prefix_only",
            "channel_dedup": "set_of_original_channel_ids_per_person_id",
            "video_dedup": "set_of_original_video_ids_per_person_id",
            "raw_title_rankings_modified": False,
            "production_writes": False,
        },
        "summary": {
            "person_identities_with_evidence": len(persons),
            "matched_video_rows": matched_records,
            "ambiguous_video_rows_withheld": uncertain_records,
            "ambiguous_alias_keys": len(ambiguous),
        },
        "persons": persons,
        "ambiguous_labels_withheld": sorted(ambiguous),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, required=True)
    ap.add_argument("--audit", type=Path, required=True)
    ap.add_argument("--registration-aliases", type=Path, required=True)
    ap.add_argument("--reviewed-aliases", type=Path, required=True)
    ap.add_argument("--output", type=Path, required=True)
    ap.add_argument("--run-id", required=True)
    ap.add_argument("--artifact-id", required=True)
    ap.add_argument("--artifact-digest", required=True)
    ap.add_argument("--snapshot-id", required=True)
    ap.add_argument("--channels", type=int, required=True)
    ap.add_argument("--videos", type=int, required=True)
    ap.add_argument("--selected", type=int, required=True)
    args = ap.parse_args()
    result = aggregate(
        args.root, args.audit, args.registration_aliases, args.reviewed_aliases,
        source_run_id=args.run_id, source_artifact_id=args.artifact_id,
        source_digest=args.artifact_digest, expected_channels=args.channels,
        expected_videos=args.videos, expected_selected=args.selected,
        production_snapshot_id=args.snapshot_id
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = result["summary"]
    examples = [
        {"person_id": p["person_id"], "channels": p["distinct_channel_count"],
         "videos": p["distinct_video_count"],
         "variants": [v["raw_name_key"] for v in p["matched_variants"]]}
        for p in result["persons"] if any(v["raw_name_key"] in
           {"napoleon", "beethoven", "mozart", "shakespeare", "van gogh", "yi sun-sin"}
           for v in p["matched_variants"])
    ]
    print(json.dumps({"source": result["source"], "summary": summary,
                      "focus_examples": examples}, ensure_ascii=False))


if __name__ == "__main__":
    main()
