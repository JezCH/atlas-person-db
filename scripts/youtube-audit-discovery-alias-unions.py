#!/usr/bin/env python3
"""Source-ID audit for the single UNREGISTERED YouTube discovery ranking.

Never publish this as a registered-Person leaderboard. A group is a review
target, not a confirmed Person identity. This reads original channel/video IDs,
does not add aggregated channel counts, and does not mutate Production.
"""
import argparse
import collections
import gzip
import hashlib
import importlib.util
import json
import re
import unicodedata
from pathlib import Path

PARSER_PATH = Path(__file__).with_name("youtube-build-person-signal-snapshot.py")
TARGETS_PATH = Path(__file__).with_name("youtube-discovery-alias-audit-targets.v1.json")
AUDIT_SCHEMA = "atlas-youtube-discovery-source-id-audit/v1"
TARGET_SCHEMA = "atlas-youtube-discovery-alias-audit-targets/v1"


def get_parser():
    spec = importlib.util.spec_from_file_location("yt_snapshot_parser_for_discovery", PARSER_PATH)
    parser = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(parser)
    return parser


def identity_key(value):
    text = unicodedata.normalize("NFKD", str(value or "")).lower()
    for source, dest in (("æ", "ae"), ("œ", "oe"), ("ß", "ss")):
        text = text.replace(source, dest)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return "".join(c for c in unicodedata.normalize("NFC", text) if c.isalnum())


def source_name_key(value):
    return unicodedata.normalize("NFKC", str(value or "")).casefold().strip()


def load_targets(path=TARGETS_PATH):
    doc = json.loads(Path(path).read_text(encoding="utf-8"))
    if doc.get("schema") != TARGET_SCHEMA:
        raise ValueError("INVALID_DISCOVERY_AUDIT_TARGET_SCHEMA")
    names = set()
    keys = set()
    targets = []
    for kind, field in (("orthographic", "orthographic_groups"),
                        ("identity_review", "identity_review_groups")):
        for index, row in enumerate(doc.get(field, [])):
            aliases = row.get("aliases")
            if not isinstance(aliases, list) or len(aliases) < 2:
                raise ValueError("INVALID_DISCOVERY_AUDIT_GROUP")
            norm = [source_name_key(alias) for alias in aliases]
            if any(not x for x in norm) or len(set(norm)) != len(norm):
                raise ValueError("DUPLICATE_DISCOVERY_AUDIT_ALIASES")
            if any(x in names for x in norm):
                raise ValueError("ALIAS_IN_MULTIPLE_DISCOVERY_GROUPS")
            names.update(norm)
            candidate_key = identity_key(aliases[0])
            if kind == "orthographic" and any(identity_key(x) != candidate_key for x in aliases):
                raise ValueError("ORTHOGRAPHIC_GROUP_HAS_DIFFERENT_IDENTITY_KEY")
            group_key = kind + ":" + str(index + 1).zfill(3)
            if group_key in keys:
                raise ValueError("DUPLICATE_DISCOVERY_GROUP")
            keys.add(group_key)
            targets.append({"group_id": group_key, "type": kind,
                            "aliases": aliases, "name_keys": norm,
                            "identity_key": candidate_key if kind == "orthographic" else None})
    if not targets:
        raise ValueError("MISSING_DISCOVERY_AUDIT_TARGETS")
    return targets


def audit(root, targets_path, *, source_snapshot_id,
          expected_channels, expected_videos, expected_selected):
    parser = get_parser()
    targets = load_targets(targets_path)
    wanted = collections.defaultdict(list)
    for group in targets:
        for i, key in enumerate(group["name_keys"]):
            wanted[key].append((group["group_id"], i))
    tracking = {}
    for group in targets:
        tracking[group["group_id"]] = {
            "channels": [set() for _ in group["aliases"]],
            "videos": [set() for _ in group["aliases"]],
            "samples": [[] for _ in group["aliases"]],
            "seen": set()
        }
    manifests = parser.load_manifest_paths(root)
    labels = sorted(manifests, key=lambda x: (int(x[5:8]), x[8:]))
    if "batch024" not in manifests or any(int(x[5:8]) > 24 for x in labels):
        raise ValueError("DISCOVERY_AUDIT_WRONG_CORPUS_FRONTIER")
    selected = successes = video_rows = eligible_rows = 0
    seen_channels = set()
    for batch in labels:
        manifest = manifests[batch]
        rows = json.loads(manifest.read_text(encoding="utf-8"))
        for entry in rows:
            selected += 1
            cid = str(entry.get("channel_id") or "").strip()
            if not cid or cid in seen_channels:
                raise ValueError("DISCOVERY_AUDIT_DUPLICATE_OR_EMPTY_CHANNEL")
            seen_channels.add(cid)
            status = entry.get("status")
            if status not in ("OK", "ERR", "EMPTY"):
                raise ValueError("DISCOVERY_AUDIT_INVALID_MANIFEST_STATUS")
            if status != "OK":
                continue
            successes += 1
            archive = manifest.parent / "videos" / f"{cid}.ndjson.gz"
            if not archive.is_file():
                raise ValueError("DISCOVERY_AUDIT_MISSING_SOURCE_ARCHIVE")
            local_rows = 0
            with gzip.open(archive, "rt", encoding="utf-8") as handle:
                for line in handle:
                    row = json.loads(line)
                    local_rows += 1
                    if row.get("channel_id") != cid:
                        raise ValueError("DISCOVERY_AUDIT_CHANNEL_PROVENANCE_MISMATCH")
                    raw = parser.title_candidate(row.get("title"))
                    if not raw:
                        continue
                    name = parser.normalize_person_candidate(raw)
                    if not parser.valid_candidate(name):
                        continue
                    eligible_rows += 1
                    key = source_name_key(name)
                    for group_id, position in wanted.get(key, ()):
                        video_id = str(row.get("video_id") or "").strip()
                        if not video_id:
                            raise ValueError("DISCOVERY_AUDIT_VIDEO_ID_MISSING")
                        state = tracking[group_id]
                        state["channels"][position].add(cid)
                        state["videos"][position].add(video_id)
                        if len(state["samples"][position]) < 4:
                            state["samples"][position].append({
                                "channel_id": cid, "video_id": video_id,
                                "title": str(row.get("title") or "")[:240]
                            })
            expected_count = int(entry.get("count") or 0)
            if local_rows != expected_count:
                raise ValueError("DISCOVERY_AUDIT_MANIFEST_VIDEO_COUNT_MISMATCH")
            video_rows += local_rows
    if (selected, successes, video_rows) != (
            expected_selected, expected_channels, expected_videos):
        raise ValueError("DISCOVERY_AUDIT_CORPUS_BASELINE_MISMATCH: " +
                         repr((selected, successes, video_rows)))
    groups = []
    for g in targets:
        state = tracking[g["group_id"]]
        unique_channels = set().union(*state["channels"])
        unique_videos = set().union(*state["videos"])
        per_alias = []
        for i, name in enumerate(g["aliases"]):
            per_alias.append({
                "name": name, "original_channel_count": len(state["channels"][i]),
                "original_video_count": len(state["videos"][i]),
                "channel_ids": sorted(state["channels"][i]),
                "video_ids": sorted(state["videos"][i]),
                "sample_titles": state["samples"][i],
            })
        groups.append({
            "group_id": g["group_id"], "type": g["type"],
            "identity_key": g["identity_key"],
            "aliases": g["aliases"],
            "decision": "orthographic_candidate_for_identity_review"
                        if g["type"] == "orthographic" else "do_not_auto_merge",
            "channel_id_union_count": len(unique_channels),
            "video_id_union_count": len(unique_videos),
            "overlapping_channel_memberships": sum(len(ids) for ids in state["channels"]) -
                                               len(unique_channels),
            "overlapping_video_memberships": sum(len(ids) for ids in state["videos"]) -
                                             len(unique_videos),
            "complete_published_aliases": all(len(ids) >= 3 for ids in state["channels"]),
            "union_channel_ids": sorted(unique_channels),
            "union_video_ids_sha256": hashlib.sha256(
                "\n".join(sorted(unique_videos)).encode("utf-8")).hexdigest(),
            "per_alias": per_alias
        })
    return {
        "schema": AUDIT_SCHEMA,
        "source": {
            "production_snapshot_id": source_snapshot_id,
            "coverage_batches": labels, "selected_channel_count": selected,
            "successful_channel_count": successes, "source_video_rows": video_rows,
            "eligible_title_candidate_rows": eligible_rows
        },
        "policy": {
            "purpose": "UNREGISTERED_PERSON_DISCOVERY",
            "orthographic_only_not_identity_confirmation": True,
            "review_groups_never_auto_merge": True,
            "channel_count": "set union of original channel_id",
            "video_count": "set union of original video_id",
            "original_source_modified": False, "production_writes": False
        },
        "groups": groups,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, required=True)
    ap.add_argument("--targets", type=Path, default=TARGETS_PATH)
    ap.add_argument("--snapshot-id", required=True)
    ap.add_argument("--channels", type=int, required=True)
    ap.add_argument("--videos", type=int, required=True)
    ap.add_argument("--selected", type=int, required=True)
    ap.add_argument("--output", type=Path, required=True)
    args = ap.parse_args()
    result = audit(args.root, args.targets, source_snapshot_id=args.snapshot_id,
                   expected_channels=args.channels, expected_videos=args.videos,
                   expected_selected=args.selected)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "snapshot_id": result["source"]["production_snapshot_id"],
        "successful_channels": result["source"]["successful_channel_count"],
        "original_videos": result["source"]["source_video_rows"],
        "groups": [
            {"id": g["group_id"], "names": g["aliases"],
             "channels": g["channel_id_union_count"],
             "videos": g["video_id_union_count"],
             "overlapping_channels": g["overlapping_channel_memberships"],
             "complete": g["complete_published_aliases"]}
            for g in result["groups"]
        ]
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
