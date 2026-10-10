#!/usr/bin/env python3
"""Read-only whole-title recall audit over original YouTube Channel IDs/Video IDs.

Candidate names come from the *entire source-derived raw-name snapshot*, never
from the atlas_v2 registered-Person table. Title mentions and heuristic focus
cues are kept separate. Neither is an approved biography-centered count.
This audit never publishes or modifies the Production ranking.
"""
import argparse
import collections
import gzip
import json
import re
import unicodedata
import zipfile
from pathlib import Path

TOKEN_RE = re.compile(r"[^\W_]+", re.UNICODE)
QUARANTINE_NAME_RE = re.compile(r"^(?:the|a|an|untold)\b|^(?:new york|social media|prime minister)$", re.IGNORECASE)
FOCUS_BEFORE = re.compile(
    r"(?:^|\b)(?:"
    r"(?:the\s+)?(?:untold\s+|true\s+|secret\s+)?(?:life|story|biography|autopsy|death|murder|legacy|rise and fall)"
    r"(?:\s+(?:and|or|tragic|mysterious|untold|true|sudden|early|the|death|life|rise|fall|disappearance)){0,5}\s+of"
    r"|who\s+(?:was|is|killed|murdered)"
    r"|what\s+happened\s+to"
    r"|(?:why|how|when|where)\s+(?:did|was|is|were|does|do)"
    r"|did|was|is|were|will|can|could"
    r")\s*$", re.IGNORECASE
)
FOCUS_START = re.compile(r"^\s*[:|\-–—]|^\s*['’]s\b")


def normalize(value):
    s = unicodedata.normalize("NFKD", str(value or "")).casefold()
    s = s.replace("ß", "ss").replace("æ", "ae").replace("œ", "oe")
    return "".join(ch for ch in s if not unicodedata.combining(ch))


def tokens(value):
    return [(normalize(m.group()), m.start(), m.end())
            for m in TOKEN_RE.finditer(str(value or ""))]


def build_index(names, min_words=2):
    """No guessed surname/mononym identity or registered-Person UUID dependency."""
    index = collections.defaultdict(list)
    for name in sorted(set(names)):
        if QUARANTINE_NAME_RE.search(name):
            continue
        ts = tuple(x[0] for x in tokens(name))
        if len(ts) < min_words or len(ts) > 8 or not all(ts):
            continue
        index[(ts[0], ts[1])].append((ts, name))
    for rows in index.values():
        rows.sort(key=lambda x: (-len(x[0]), x[1]))
    return index


def find_names(title, index):
    """Match whole tokens anywhere; prefer longest overlapping name, never alias-sum."""
    words = tokens(title)
    matched, covered = [], set()
    for i, (token, _, _) in enumerate(words):
        if i in covered:
            continue
        for sequence, label in index.get((token, words[i + 1][0] if i + 1 < len(words) else None), ()):
            length = len(sequence)
            if i + length > len(words):
                continue
            if tuple(t[0] for t in words[i:i + length]) != sequence:
                continue
            separators = [title[words[j][2]:words[j + 1][1]]
                          for j in range(i, i + length - 1)]
            if any(
                not gap.isspace()
                and gap not in ("-", "‐", "‑", "–")
                and not (len(words[i + j][0]) == 1 and re.fullmatch(r"\\.\\s*", gap))
                for j, gap in enumerate(separators)
            ):
                continue
            matched.append((label, words[i][1], words[i + length - 1][2]))
            covered.update(range(i, i + length))
            break
    return matched


def classify_match(title, start, end, total_matches):
    """Heuristic review buckets, never authoritative Person-centered adjudication."""
    if total_matches != 1:
        return "multi_person_review"
    prefix, suffix = title[:start], title[end:]
    if FOCUS_BEFORE.search(prefix) or (not prefix.strip() and FOCUS_START.search(suffix)):
        return "focus_cue_review"
    return "mention_only"


def reviewed_extra_name_labels(extra, source_snapshot_id, source_names):
    """Validate the cue output's source provenance; names stay UNVERIFIED."""
    if extra is None:
        return {}
    if not isinstance(extra, dict) or extra.get("schema") != "youtube-open-vocabulary-name-cue-audit/v2":
        raise ValueError("invalid open-vocabulary candidate sidecar")
    if extra.get("reference_source_snapshot_id") != source_snapshot_id:
        raise ValueError("open-vocabulary source snapshot mismatch")
    if not isinstance(extra.get("rows"), list):
        raise ValueError("open-vocabulary candidate rows missing")
    rule_path = Path(__file__).with_name("youtube-person-signal-quality-rules.v2.json")
    if not rule_path.is_file():
        raise ValueError("reviewed nonperson quality rules unavailable")
    rules = json.loads(rule_path.read_text(encoding="utf-8"))
    quarantine = {normalize(x).replace(" ", "") for x in
                  rules["non_person_exact"] + rules["nonhistorical_person_exact"]}
    existing = {normalize(n).replace(" ", "") for n in source_names}
    found = {}
    for entry in extra["rows"]:
        if not isinstance(entry, dict):
            raise ValueError("invalid open-vocabulary candidate row")
        label = entry.get("candidate")
        if not isinstance(label, str) or not label.strip():
            raise ValueError("missing open-vocabulary name")
        key = normalize(label).replace(" ", "")
        if not key or key in found:
            raise ValueError("repeated open-vocabulary candidate")
        if key in quarantine or key in existing:
            continue
        if entry.get("candidate_fold_status") not in (
            "NEW_LABEL_REVIEW", "POSSIBLE_ORTHOGRAPHIC_VARIANT"
        ):
            raise ValueError("unknown open-vocabulary identity disposition")
        if not isinstance(entry.get("distinct_channels"), int) or entry["distinct_channels"] < 3:
            raise ValueError("open-vocabulary source channel threshold invalid")
        found[key] = (label, entry["candidate_fold_status"])
    return found


def audit_source(source_zip, snapshot, *, min_words=2, max_examples=3, extra_candidates=None):
    if not isinstance(snapshot.get("signals"), list) or not isinstance(snapshot.get("snapshot"), dict):
        raise ValueError("invalid source candidate snapshot")
    snapshot_meta = snapshot["snapshot"]
    if min_words < 2:
        raise ValueError("min_words must be >=2: mononyms require identity review")
    source_names = [v["raw_name"] for v in snapshot["signals"]]
    extra = reviewed_extra_name_labels(
        extra_candidates, snapshot_meta["snapshot_id"], source_names
    )
    index = build_index(source_names + [name for name, _ in extra.values()], min_words)
    stats = collections.defaultdict(lambda: {
        "title_mention_channel_ids": set(), "title_mention_video_ids": set(),
        "focus_cue_channel_ids": set(), "focus_cue_video_ids": set(),
        "multi_person_channel_ids": set(), "multi_person_video_ids": set(),
        "examples": collections.defaultdict(list),
    })
    channels_seen = set()
    total_videos, videos_with_any_match, total_match_rows = 0, 0, 0
    with zipfile.ZipFile(source_zip) as z:
        paths = sorted(p for p in z.namelist() if p.endswith(".ndjson.gz"))
        for path in paths:
            channel_id = Path(path).name.split(".")[0]
            if channel_id in channels_seen:
                raise ValueError(f"duplicate original channel_id {channel_id}")
            channels_seen.add(channel_id)
            with gzip.open(z.open(path), "rt", encoding="utf-8") as f:
                for line in f:
                    data = json.loads(line)
                    total_videos += 1
                    title = str(data.get("title") or "")
                    video_id = str(data.get("video_id") or "").strip()
                    if not video_id:
                        raise ValueError(f"missing original video_id in {channel_id}")
                    matches = find_names(title, index)
                    if matches:
                        videos_with_any_match += 1
                    distinct_labels = {label for label, _, _ in matches}
                    processed_labels = set()
                    for label, start, end in matches:
                        if label in processed_labels:
                            continue
                        processed_labels.add(label)
                        total_match_rows += 1
                        kind = classify_match(title, start, end, len(distinct_labels))
                        item = stats[label]
                        item["title_mention_channel_ids"].add(channel_id)
                        item["title_mention_video_ids"].add(video_id)
                        if kind == "focus_cue_review":
                            item["focus_cue_channel_ids"].add(channel_id)
                            item["focus_cue_video_ids"].add(video_id)
                        if kind == "multi_person_review":
                            item["multi_person_channel_ids"].add(channel_id)
                            item["multi_person_video_ids"].add(video_id)
                        if len(item["examples"][kind]) < max_examples:
                            item["examples"][kind].append({
                                "channel_id": channel_id, "video_id": video_id,
                                "title": title[:240],
                            })
    if (len(channels_seen) != int(snapshot_meta["channel_count"])
            or total_videos != int(snapshot_meta["video_count"])):
        raise ValueError(
            f"cumulative source/snapshot parity mismatch: {len(channels_seen)}/{total_videos}"
        )
    rows = []
    for label, s in stats.items():
        rows.append({
            "raw_name": label,
            "candidate_origin": ("open_vocabulary_cue" if
                                 normalize(label).replace(" ", "") in extra
                                 else "source_prefix_candidate"),
            "identity_disposition": (extra[normalize(label).replace(" ", "")][1]
                                     if normalize(label).replace(" ", "") in extra else None),
            "title_mention_distinct_channels": len(s["title_mention_channel_ids"]),
            "title_mention_distinct_videos": len(s["title_mention_video_ids"]),
            "focus_cue_review_distinct_channels": len(s["focus_cue_channel_ids"]),
            "focus_cue_review_distinct_videos": len(s["focus_cue_video_ids"]),
            "multi_person_review_distinct_channels": len(s["multi_person_channel_ids"]),
            "multi_person_review_distinct_videos": len(s["multi_person_video_ids"]),
            "examples": dict(s["examples"]),
        })
    rows.sort(key=lambda x: (-x["title_mention_distinct_channels"],
                            -x["title_mention_distinct_videos"], x["raw_name"]))
    return {
        "schema": "atlas-youtube-whole-title-recall-audit/v1",
        "published_rank_eligible": False,
        "evidence_disposition": "read_only_diagnostic_non_authoritative",
        "source_snapshot_id": snapshot_meta["snapshot_id"],
        "lexicon_source": ("source_prefix_plus_unverified_open_vocabulary"
                           if extra_candidates is not None
                           else "all_source_extracted_names_not_registered_person_uuid"),
        "extra_candidate_labels_indexed": len(extra),
        "source_candidate_name_labels": len(snapshot["signals"]),
        "min_name_words": min_words,
        "matched_name_labels": len(rows),
        "indexed_name_labels": sum(len(v) for v in index.values()),
        "successful_channels": len(channels_seen),
        "original_videos": total_videos,
        "videos_with_any_known_candidate_name": videos_with_any_match,
        "total_label_video_matches": total_match_rows,
        "caveats": [
            "Full-title name occurrence is not person-centered documentary evidence.",
            "Focus cues are heuristic REVIEW ONLY, not approved Person/video assignments.",
            "Overlapping names choose longest phrase; this does NOT merge distinct aliases.",
            ("Names missed by prior source extractor are absent unless separately "
             "supplied as an unverified, source-matched cue candidate sidecar."),
            "Names with fewer than min_name_words tokens are excluded (hold for identity review).",
            "Obvious generic source-label phrases are quarantined, not counted as Person.",
        ],
        "rows": rows,
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-zip", required=True)
    p.add_argument("--signal-json", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--min-name-words", type=int, default=2)
    p.add_argument("--max-examples", type=int, default=3)
    p.add_argument("--open-vocabulary-json", help="Same-snapshot cue candidate sidecar; no identity unions")
    args = p.parse_args()
    snapshot = json.loads(Path(args.signal_json).read_text(encoding="utf-8"))
    extra_candidates = (
        json.loads(Path(args.open_vocabulary_json).read_text(encoding="utf-8"))
        if args.open_vocabulary_json else None
    )
    result = audit_source(
        args.source_zip, snapshot, min_words=args.min_name_words,
        max_examples=args.max_examples, extra_candidates=extra_candidates
    )
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2),
                                 encoding="utf-8")
    print(json.dumps({key: val for key, val in result.items() if key != "rows"},
                     ensure_ascii=False))


if __name__ == "__main__":
    main()
