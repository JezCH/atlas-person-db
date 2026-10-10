#!/usr/bin/env python3
"""Read-only NEW Person-name discovery from original YouTube video titles.

Unknown candidates are extracted by contextual cues, independently of the
registered atlas_v2 Person list AND existing raw name labels. Those raw labels
are consulted only afterward for diagnostic novelty and possible variants.
All evidence is original channel_id/video_id, not aggregated counts. Results
are NOT identity-verified Persons or approved changes to the published rank.
"""
import argparse
import collections
import gzip
import json
import re
import unicodedata
import zipfile
from pathlib import Path

CUES = (
    ("who_was", re.compile(r"\bwho\s+(?:was|is)\s+", re.I)),
    ("did_person", re.compile(r"^\s*did\s+", re.I)),
    ("was_person", re.compile(r"^\s*was\s+", re.I)),
    ("what_happened", re.compile(r"\bwhat\s+happened\s+to\s+", re.I)),
    ("why_did", re.compile(r"\bwhy\s+(?:did|was|is|were)\s+", re.I)),
    ("how_did", re.compile(r"\bhow\s+(?:did|was|is)\s+", re.I)),
    ("where_is", re.compile(r"\bwhere\s+(?:is|was|did)\s+", re.I)),
    ("life_of", re.compile(r"\b(?:life|biography|death|murder|legacy|autopsy|assassination|story)\s+(?:and\s+(?:times|death)\s+)?of\s+", re.I)),
    ("rise_of", re.compile(r"\b(?:the\s+)?rise\s+(?:and\s+fall\s+)?of\s+", re.I)),
)
TOKEN = re.compile(r"[^\W\d_][\w’'.-]*", re.UNICODE)
JOINERS = frozenset("de del da di du la le van von der den al el bin ibn the of bint ap".split())
STOP_WORDS = frozenset("""and or with from into after before despite against at in on for to by vs versus
 die died killed murder murdered survive survived become became change changed go gone end start begin escape escaped
 disappear disappeared refuse refused fail failed win won lose lost visit visited meet met happen happened
 believe believed marry married rise fall fight fought live lived leave left speak spoke break broke
 hated hate love loved make made get got create created stop stopped invent invented discover discovered
 unknown forgotten secret tragic mysterious shocking about when why what how where did was is are were has have
 the a an their his her our your my its do does ever never still will would could can should who whom which
 history story real true fact facts incredible strange entire world first last ultimate untold whole legend documentary
 empire kingdom dynasty revolution battle war explained famous greatest mystery people reason actually today now
 part episode chapter full official reaction documentary interview speech video film movie audio lesson book
 """.split())
LEAD_STOP = frozenset("""it he she we they everyone everybody nobody somebody someone no one any one more most our my your his her its
 the a an this that these those how what why who when where was were did is are has have
 ancient modern medieval best top new old real true great full history story facts secrets secret unknown forgotten
 untold legendary tragic shocking powerful amazing unbelievable mysterious incredible most last first rise fall
 life death book everything about inside behind man woman empire dynasty country nation city state people
 world worldwar english myth mythology greatest""".split())
NONPERSON_COMBOS = frozenset({
    "middle east", "new york", "united states", "north korea", "south korea", "world war",
    "roman empire", "british empire", "ottoman empire", "great britain", "ancient rome",
    "cold war", "golden age", "industrial revolution", "social media", "black death",
    "prime minister", "civil war", "american revolution", "second world",
})

def label_key(value):
    return unicodedata.normalize("NFKC", str(value)).casefold().strip()

def orthographic_key(value):
    normalized = unicodedata.normalize("NFKD", label_key(value))
    return "".join(c for c in normalized if c.isalnum() and not unicodedata.combining(c))

def candidate_after(title, start):
    tail = title[start:start + 160]
    tokens = list(TOKEN.finditer(tail))
    if not tokens or tokens[0].start() > 3:
        return None
    words = []
    last_end = None
    for tok in tokens[:7]:
        part = tok.group().strip("’'-.")
        low = part.casefold()
        if not part or (low in STOP_WORDS and low not in JOINERS):
            break
        if not ((part[0].isupper() and part[0].isalpha() and len(part) <= 28)
                or low in JOINERS):
            break
        if last_end is not None and tail[last_end:tok.start()].strip() not in ("", "-"):
            break
        words.append(part)
        last_end = tok.end()
    while words and words[-1].casefold() in JOINERS:
        words.pop()
    if not 2 <= len(words) <= 6 or words[0].casefold() in LEAD_STOP:
        return None
    name = " ".join(words)
    key = label_key(name)
    if key in NONPERSON_COMBOS or any(
        w in {"empire", "war", "world", "country", "history", "university", "kingdom", "episode"}
        for w in key.split()
    ):
        return None
    if not any(w[0].isupper() for w in words[1:] if w.casefold() not in JOINERS):
        return None
    return name

def title_candidates(title):
    out = {}
    for cue, pattern in CUES:
        for found in pattern.finditer(title):
            name = candidate_after(title, found.end())
            if name:
                out.setdefault(label_key(name), (name, cue))
    return list(out.values())

def audit(source_zip, known_names, *, max_examples=3, min_channels=3, reviewed_exclusions=()):
    known_names = list(known_names)
    reviewed_nonperson_keys = {orthographic_key(n) for n in reviewed_exclusions}
    known_keys = {label_key(n) for n in known_names}
    known_orthography = {orthographic_key(n) for n in known_names}
    def entry():
        return {"channels": set(), "videos": set(), "names": collections.Counter(),
                "cues": collections.Counter(), "examples": []}
    stats = collections.defaultdict(entry)
    channels_seen = set()
    videos = candidate_hits = 0
    by_cue = collections.Counter()
    with zipfile.ZipFile(source_zip) as archive:
        for path in sorted(n for n in archive.namelist() if n.endswith(".ndjson.gz")):
            channel = Path(path).name.removesuffix(".ndjson.gz")
            if channel in channels_seen:
                raise ValueError("duplicate original channel_id: " + channel)
            channels_seen.add(channel)
            with gzip.open(archive.open(path), "rt", encoding="utf-8") as stream:
                for line in stream:
                    row = json.loads(line)
                    videos += 1
                    title = str(row.get("title") or "")
                    video_id = str(row.get("video_id") or "").strip()
                    for name, cue in title_candidates(title):
                        candidate_hits += 1
                        by_cue[cue] += 1
                        key = label_key(name)
                        if key in known_keys:
                            continue
                        if not video_id:
                            raise ValueError("missing original video_id for " + channel)
                        value = stats[key]
                        value["names"][name] += 1
                        value["channels"].add(channel)
                        value["videos"].add(video_id)
                        value["cues"][cue] += 1
                        if len(value["examples"]) < max_examples:
                            value["examples"].append({
                                "channel_id": channel, "video_id": video_id,
                                "title": title[:250], "cue": cue
                            })
    rows = [{
        "candidate": val["names"].most_common(1)[0][0],
        "candidate_fold_status": ("POSSIBLE_ORTHOGRAPHIC_VARIANT"
                                   if orthographic_key(key) in known_orthography
                                   else "NEW_LABEL_REVIEW"),
        "distinct_channels": len(val["channels"]),
        "distinct_videos": len(val["videos"]),
        "cues": dict(val["cues"]),
        "examples": val["examples"],
    } for key, val in stats.items() if len(val["channels"]) >= min_channels]
    quarantined = [r for r in rows if orthographic_key(r["candidate"]) in reviewed_nonperson_keys]
    rows = [r for r in rows if orthographic_key(r["candidate"]) not in reviewed_nonperson_keys]
    rows.sort(key=lambda r: (-r["distinct_channels"], -r["distinct_videos"], r["candidate"]))
    return {
        "schema": "youtube-open-vocabulary-name-cue-audit/v2",
        "publication_eligible": False, "source_channels": len(channels_seen),
        "source_videos": videos, "known_raw_name_labels": len(known_keys),
        "cue_extracted_occurrences": candidate_hits, "cue_counts": dict(by_cue),
        "minimum_distinct_channels": min_channels,
        "reviewed_nonperson_quarantined_labels": len(quarantined),
        "novel_raw_name_candidate_count": len(rows),
        "possible_orthographic_variant_count": sum(
            row["candidate_fold_status"] == "POSSIBLE_ORTHOGRAPHIC_VARIANT" for row in rows
        ),
        "rows": rows,
        "caveats": [
            "Candidate strings are not verified historical people.",
            "Heuristic title mentions are not certified Person-centered documentaries.",
            "English identity / subject cues are a first pass, not exhaustive multilingual extraction.",
            "Short names, homonyms and variants remain unmerged until original-ID review.",
            "Read-only audit; no Person DB, source snapshot, or published ranking changes.",
        ],
    }

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-zip", required=True)
    p.add_argument("--signal-json", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--min-channels", type=int, default=3)
    args = p.parse_args()
    reference = json.loads(Path(args.signal_json).read_text(encoding="utf-8"))
    rules_path = Path(__file__).with_name("youtube-person-signal-quality-rules.v2.json")
    if not rules_path.exists():
        raise ValueError("source-reviewed non-person quality rules missing")
    rules = json.loads(rules_path.read_text(encoding="utf-8"))
    reviewed_exclusions = rules["non_person_exact"] + rules["nonhistorical_person_exact"]
    result = audit(args.source_zip, (row["raw_name"] for row in reference["signals"]),
                   min_channels=args.min_channels, reviewed_exclusions=reviewed_exclusions)
    metadata = reference["snapshot"]
    if (result["source_channels"] != int(metadata["channel_count"])
            or result["source_videos"] != int(metadata["video_count"])):
        raise ValueError("original source and reference-snapshot parity mismatch")
    result["reference_source_snapshot_id"] = metadata["snapshot_id"]
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2),
                                 encoding="utf-8")
    print(json.dumps({key: value for key, value in result.items() if key != "rows"},
                     ensure_ascii=False))

if __name__ == "__main__":
    main()
