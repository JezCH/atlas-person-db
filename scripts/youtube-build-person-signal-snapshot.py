#!/usr/bin/env python3
import argparse
import collections
import datetime as dt
import gzip
import hashlib
import json
import re
import unicodedata
from pathlib import Path

try:
    import pycountry
except Exception:
    pycountry = None

BATCH_LABEL_RE = re.compile(r"(?:youtube-)?batch(\d{3})", re.I)
SEP_RE = re.compile(r"\s*(?:\||:|\s[-–—]\s)\s*")
PAREN_TRAIL_RE = re.compile(r"\s*[\[(][^\])]{0,80}[\])]?\s*$")
SPACE_RE = re.compile(r"\s+")

LEADING_PATTERNS = (
    "the life of ", "life of ", "biography of ", "the biography of ",
    "the story of ", "story of ", "who was ", "who is ",
    "the rise and fall of ", "rise and fall of ",
)

FUNCTION_WORDS = {
    "de","da","di","del","della","du","des","dos","das","van","von","der","den","ter",
    "of","the","al","el","ibn","bin","bint","la","le","y","and","ap","ferch","mac","mc","st","saint",
}

GENERIC_EXACT = {
    "trailer","teaser","breaking","breaking news","behind the scenes","full documentary","documentary",
    "history","the history","biography","life story","the story","part 1","part 2","episode 1","episode 2",
    "d-day","the black death","black death","world war i","world war ii","world war 1","world war 2",
    "the first crusade","first crusade","the ottoman empire","ottoman empire","operation barbarossa",
    "the cold war","cold war","the roman empire","roman empire","the british empire","british empire",
}

GENERIC_TOKEN_RE = re.compile(
    r"\b(?:war|wars|battle|battles|empire|kingdom|republic|dynasty|revolution|uprising|rebellion|crusade|crusades|"
    r"operation|campaign|invasion|siege|plague|pandemic|disaster|earthquake|civilization|civilisation|country|nation|"
    r"documentary|trailer|teaser|episode|season|history|timeline|explained|facts|mystery|mysteries|scenes|archive|archives|"
    r"news|breaking|tour|guide|geography|language|culture|religion|economy|politics|army|navy|air force|world cup)\b",
    re.I,
)

BAD_PREFIX_RE = re.compile(
    r"^(?:why|how|what|when|where|top\s+\d*|best|worst|ancient|medieval|modern|history of|the history of|facts about|documentary about)\b",
    re.I,
)

EXTRA_GEOGRAPHY = {
    "africa","west africa","east africa","horn of africa","sahel","maghreb","arab world","levant","persia",
    "central asia","southeast asia","eastern europe","latin america","caribbean","central america","pacific islands",
    "north korea","south korea","taiwan","tibet","hong kong","england","scotland","wales","britain","great britain",
    "united kingdom","uk","usa","u.s.a.","united states","america","russia","iran","turkey","vietnam","china","japan",
    "india","brazil","ukraine","venezuela","afghanistan","south africa","thailand","germany","indonesia","egypt",
    "singapore","cuba","madagascar","sri lanka","peru","italy","australia","mexico","canada","pakistan","bangladesh",
    "nepal","mongolia","philippines","malaysia","cambodia","myanmar","ethiopia","nigeria","ghana","kenya","sudan",
    "finland","sweden","norway","denmark","poland","czechia","slovakia","hungary","romania","bulgaria","serbia",
    "croatia","greece","armenia","georgia","colombia","chile","argentina","new zealand","iceland","portugal","spain",
    "france","belgium","netherlands","ireland",
}


def clean_text(value):
    value = unicodedata.normalize("NFKC", str(value or ""))
    value = value.strip(" \t\r\n\"'“”‘’")
    value = SPACE_RE.sub(" ", value)
    value = re.sub(r"[?!]+$", "", value).strip()
    previous = None
    while previous != value:
        previous = value
        value = PAREN_TRAIL_RE.sub("", value).strip()
    return value


def country_stoplist():
    names = set(EXTRA_GEOGRAPHY)
    if pycountry is not None:
        for country in pycountry.countries:
            for attr in ("name","official_name","common_name"):
                value = getattr(country, attr, None)
                if value:
                    names.add(clean_text(value).casefold())
    return names


COUNTRY_NAMES = country_stoplist()


def title_candidate(title):
    title = clean_text(title)
    if not title:
        return None
    lowered = title.casefold()
    for prefix in LEADING_PATTERNS:
        if lowered.startswith(prefix):
            rest = title[len(prefix):].strip()
            parts = SEP_RE.split(rest, maxsplit=1)
            return clean_text(parts[0]) if parts else None

    # Preserve the strong patterns used by yt-title-person-raw-v1:
    # "Name: ...", "Name | ...", and "Name - ...".
    match = re.match(r"^(.{2,90}?)\s*(?::|\||\s[-–—]\s)\s+.+$", title)
    if match:
        return clean_text(match.group(1))
    return None


def titlecase_like(candidate):
    words = candidate.split()
    latin = []
    for word in words:
        core = re.sub(r"^[^A-Za-z]+|[^A-Za-z'.-]+$", "", word)
        if re.search(r"[A-Za-z]", core):
            latin.append(core)
    if not latin:
        return True
    good = 0
    for word in latin:
        lowered = word.casefold().strip(".'-")
        if not lowered:
            continue
        if lowered in FUNCTION_WORDS:
            good += 1
            continue
        if word.isupper() and len(word) <= 6:
            good += 1
            continue
        if word[0].isupper():
            good += 1
    return good >= max(1, len(latin) - 1)


def valid_candidate(candidate):
    candidate = clean_text(candidate)
    if len(candidate) < 3 or len(candidate) > 70:
        return False
    lowered = candidate.casefold()
    if lowered in GENERIC_EXACT or lowered in COUNTRY_NAMES:
        return False
    if BAD_PREFIX_RE.search(candidate) or GENERIC_TOKEN_RE.search(candidate):
        return False
    if re.search(r"https?://|[#@]", candidate):
        return False
    if re.search(r"[.!;]", candidate):
        return False
    if not any(ch.isalpha() for ch in candidate):
        return False
    if len(candidate.split()) > 8:
        return False
    if not titlecase_like(candidate):
        return False
    latin_chars = [ch for ch in candidate if ("A" <= ch <= "Z" or "a" <= ch <= "z")]
    if latin_chars and not any(ch.isupper() for ch in latin_chars):
        return False
    return True


def batch_label(path):
    match = BATCH_LABEL_RE.search(str(path).replace("\\", "/"))
    if not match:
        raise RuntimeError(f"cannot classify batch path: {path}")
    return f"batch{match.group(1)}"


def load_manifest_paths(root):
    found = {}
    for path in Path(root).rglob("manifest.json"):
        try:
            label = batch_label(path)
        except RuntimeError:
            continue
        if label in found:
            raise RuntimeError(f"duplicate manifest for {label}: {found[label]} and {path}")
        found[label] = path
    if not found:
        raise RuntimeError("no YouTube batch manifests found")
    numbers = sorted(int(label.removeprefix("batch")) for label in found)
    if numbers[0] != 8:
        raise RuntimeError(f"reconstructable corpus must start at batch008, found batch{numbers[0]:03d}")
    expected = list(range(8, numbers[-1] + 1))
    if numbers != expected:
        raise RuntimeError(f"batch sequence is not contiguous: found={numbers}, expected={expected}")
    return found


def build(root, artifact_id, artifact_digest, legacy_snapshot_id, legacy_channel_count):
    manifests = load_manifest_paths(root)
    channels = []
    seen = set()
    ok_ids = set()
    video_total = 0
    batch_stats = {}
    channel_to_video_dir = {}

    for label in sorted(manifests):
        path = manifests[label]
        rows = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(rows, list):
            raise RuntimeError(f"manifest not list: {path}")
        stats = collections.Counter()
        for row in rows:
            channel_id = str(row.get("channel_id") or "").strip()
            if not channel_id:
                raise RuntimeError(f"missing channel_id in {path}")
            if channel_id in seen:
                raise RuntimeError(f"duplicate channel_id across batches: {channel_id}")
            seen.add(channel_id)
            status = str(row.get("status") or "").upper()
            count = int(row.get("count") or 0)
            if status not in {"OK","ERR","EMPTY"}:
                raise RuntimeError(f"invalid status {status}: {channel_id}")
            channels.append({
                "channel_id": channel_id,
                "channel_name": str(row.get("channel_name") or ""),
                "batch_id": label,
                "scan_status": status,
                "video_count": count,
            })
            stats[status] += 1
            if status == "OK":
                ok_ids.add(channel_id)
                video_total += count
                channel_to_video_dir[channel_id] = path.parent / "videos"
        batch_stats[label] = {
            "selected": len(rows),
            "ok": stats["OK"],
            "err": stats["ERR"],
            "empty": stats["EMPTY"],
        }

    signal_channels = collections.defaultdict(set)
    signal_videos = collections.Counter()
    parsed_video_rows = 0
    for channel_id in sorted(ok_ids):
        archive = channel_to_video_dir[channel_id] / f"{channel_id}.ndjson.gz"
        if not archive.exists():
            raise RuntimeError(f"missing video archive for OK channel {channel_id}: {archive}")
        local_count = 0
        with gzip.open(archive, "rt", encoding="utf-8") as handle:
            for line in handle:
                row = json.loads(line)
                local_count += 1
                candidate = title_candidate(row.get("title"))
                if candidate and valid_candidate(candidate):
                    candidate = clean_text(candidate)
                    signal_channels[candidate].add(channel_id)
                    signal_videos[candidate] += 1
        parsed_video_rows += local_count

    if parsed_video_rows != video_total:
        raise RuntimeError(f"video row total mismatch: manifests={video_total}, archives={parsed_video_rows}")

    raw = []
    for name, channel_ids in signal_channels.items():
        if len(channel_ids) >= 3:
            raw.append((name, len(channel_ids), int(signal_videos[name])))
    raw.sort(key=lambda item: (-item[1], -item[2], item[0].casefold(), item[0]))

    signals = [
        {
            "raw_name": name,
            "rank": rank,
            "distinct_channel_count": channel_count,
            "video_count": videos,
        }
        for rank, (name, channel_count, videos) in enumerate(raw, 1)
    ]
    thresholds = {
        str(threshold): sum(1 for _, channel_count, _ in raw if channel_count >= threshold)
        for threshold in (3,5,10,15,20)
    }

    generated = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    snapshot_id = f"yt-{generated.strftime('%Y%m%dT%H%M%SZ')}-{len(ok_ids)}ch-rebuild-v2"
    source_state = {
        "workspace": "yt-discovery-core-v2",
        "coverage_mode": "reconstructable_id_preserved",
        "coverage_batches": sorted(manifests, key=lambda label: int(label.removeprefix("batch"))),
        "selected_channel_count": len(channels),
        "successful_channel_count": len(ok_ids),
        "failed_channel_count": sum(1 for row in channels if row["scan_status"] == "ERR"),
        "empty_channel_count": sum(1 for row in channels if row["scan_status"] == "EMPTY"),
        "channel_ids_persisted": True,
        "legacy_baseline_snapshot_id": legacy_snapshot_id,
        "legacy_baseline_channel_count": int(legacy_channel_count),
        "legacy_overlap_status": "unknown_not_additive",
        "next_batch": f"batch{max(int(label.removeprefix('batch')) for label in manifests) + 1:03d}",
        "minimum_stored_signal_channels": 3,
        "artifact_id": int(artifact_id),
        "artifact_digest": artifact_digest,
        "batch_stats": batch_stats,
    }
    payload = {
        "schema": "atlas-youtube-person-signal-publication/v2",
        "snapshot": {
            "snapshot_id": snapshot_id,
            "generated_at": generated.isoformat().replace("+00:00", "Z"),
            "channel_count": len(ok_ids),
            "video_count": video_total,
            "threshold_counts": thresholds,
            "parser_version": "yt-title-person-raw-v2",
            "source_state": source_state,
        },
        "channels": channels,
        "signals": signals,
    }
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    payload["publication_fingerprint"] = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--output", required=True)
    parser.add_argument("--artifact-id", type=int, required=True)
    parser.add_argument("--artifact-digest", required=True)
    parser.add_argument("--legacy-snapshot-id", required=True)
    parser.add_argument("--legacy-channel-count", type=int, required=True)
    args = parser.parse_args()

    payload = build(
        args.root,
        args.artifact_id,
        args.artifact_digest,
        args.legacy_snapshot_id,
        args.legacy_channel_count,
    )
    Path(args.output).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    snapshot = payload["snapshot"]
    print(json.dumps({
        "snapshot_id": snapshot["snapshot_id"],
        "channel_count": snapshot["channel_count"],
        "video_count": snapshot["video_count"],
        "signals": len(payload["signals"]),
        "threshold_counts": snapshot["threshold_counts"],
        "channels": len(payload["channels"]),
        "fingerprint": payload["publication_fingerprint"],
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
