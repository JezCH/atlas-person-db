#!/usr/bin/env python3
"""Review-only step toward ONE unregistered historical-Person discovery ranking.

Start with independent source-extracted Person labels, do source-ID unions
ONLY on manually reviewed same-person names, and exclude registered Persons
LAST. Neither title mention nor title syntax establishes video content focus.
"""
import argparse
import collections
import hashlib
import json
import unicodedata
from pathlib import Path

DEFAULT_CUES = frozenset((
    "BIOGRAPHICAL_TITLE_CUE_REVIEW", "POST_NAME_BIOGRAPHY_CUE_REVIEW",
    "QUESTION_TOPIC_CUE_REVIEW", "NAME_HEADING_TOPIC_CUE_REVIEW",
))
STRICT_CUES = frozenset((
    "BIOGRAPHICAL_TITLE_CUE_REVIEW", "POST_NAME_BIOGRAPHY_CUE_REVIEW"
,))

def identity_key(value):
    text = unicodedata.normalize("NFKD", str(value)).casefold()
    return "".join(c for c in text if c.isalnum() and not unicodedata.combining(c))

def as_names(data):
    return {row["raw_name"]:row for row in data["rows"]}

def id_union(evidence, labels, allowed=None):
    channels, videos = set(), set()
    for label in labels:
        for kind, entry in evidence[label]["title_evidence_buckets"].items():
            if allowed is None or kind in allowed:
                channels.update(entry["channel_ids"])
                videos.update(entry["video_ids"])
    return channels, videos

def validate_registry_projection(manifest, projection):
    if projection is None:
        return "PINNED_2026_10_10_REVIEW_ONLY_RECHECK_REQUIRED"
    if not isinstance(projection.get("persons"), list):
        raise ValueError("LIVE_PERSON_IDENTITY_PROJECTION_INVALID")
    by_id = {str(row["id"]):row for row in projection["persons"]}
    found = collections.defaultdict(set)
    for row in projection["persons"]:
        for n in row.get("names",[]):
            found[identity_key(n["name"])].add(row["id"])
    registered = {**manifest["registered_exact"], **manifest["registered_reviewed_alias"]}
    for label, row in registered.items():
        if row["uuid"] not in by_id or row["uuid"] not in found.get(identity_key(row["registered_name"]),set()):
            raise ValueError("PINNED_REGISTERED_IDENTITY_CHANGED: " + label)
    for raw in (x for group in manifest["source_historical_unmatched_identity_groups"].values() for x in group):
        if found.get(identity_key(raw)):
            raise ValueError("NEW_REGISTRATION_MATCH_REQUIRES_REVIEW: "+raw)
    return "LIVE_PERSON_NAME_PROJECTION_RECHECK_PASSED_NEGATIVE_ALIASES_UNPROVEN"

def review(source_evidence, queue, manifest, *, archive=None, registry_projection=None):
    if source_evidence.get("source_sha256") != manifest["source_sha256"] or (
        queue.get("source_sha256") != manifest["source_sha256"]
    ):
        raise ValueError("SOURCE_SHA_MISMATCH")
    if queue.get("source_snapshot_id") != manifest["source_snapshot_id"] or (
        source_evidence.get("source_snapshot_id") != manifest["source_snapshot_id"]
    ):
        raise ValueError("SOURCE_SNAPSHOT_MISMATCH")
    src = manifest["source_population"]
    if (queue.get("source_channels"),queue.get("source_videos"),
        queue.get("total_unreviewed_raw_names")) != (
        src["distinct_channel_ids"],src["original_video_rows"],
        src["prior_unreviewed_raw_name_labels"]
    ):
        raise ValueError("SOURCE_CANDIDATE_TOTAL_MISMATCH")
    if source_evidence.get("unreviewed_labels_examined") != src["prior_unreviewed_raw_name_labels"]:
        raise ValueError("SOURCE_EVIDENCE_COUNT_MISMATCH")
    if archive is not None:
        with Path(archive).open("rb") as fh:
            if hashlib.file_digest(fh,"sha256").hexdigest()!=manifest["source_sha256"]:
                raise ValueError("ORIGINAL_CORPUS_SHA256_MISMATCH")
    selected = {row["raw_name"] for row in queue["prioritized_title_evidence_examples"]}
    groups = manifest["source_historical_unmatched_identity_groups"]
    known_registered = set(manifest["registered_exact"])|set(manifest["registered_reviewed_alias"])
    holds = set(manifest["identity_context_hold"])
    source_labels = [label for labels in groups.values() for label in labels]
    if (len(source_labels)!=len(set(source_labels)) or
        set(source_labels)&(known_registered|holds) or known_registered&holds or
        selected != set(source_labels)|known_registered|holds):
        raise ValueError("HISTORICAL_REVIEW_SOURCE_PARTITION_INCONSISTENT")
    evidence = as_names(source_evidence)
    if set(source_labels)-evidence.keys():
        raise ValueError("MISSING_SOURCE_ORIGINAL_ID_EVIDENCE")
    for name,row in evidence.items():
        if row["candidate_status"] != "UNREVIEWED_PERSONHOOD":
            raise ValueError("NONPERSON_OR_IDENTITY_HOLD_REINTRODUCED")
    registry_state = validate_registry_projection(manifest,registry_projection)
    candidates=[]
    allowed = set(manifest["allowed_broad_title_cues"])
    strict = set(manifest["allowed_strong_title_cues"])
    for canonical,raws in groups.items():
        original_ch,original_v = id_union(evidence,raws)
        focus_ch,focus_v = id_union(evidence,raws,allowed)
        strong_ch,strong_v = id_union(evidence,raws,strict)
        if len(raws)==1:
            r=evidence[raws[0]]
            if (len(original_ch)!=r["raw_title_mention_distinct_channels"] or
                len(original_v)!=r["raw_title_mention_distinct_videos"] or
                len(focus_ch)!=r["biographical_or_topic_cue_distinct_channels_REVIEW_ONLY"]):
                raise ValueError("ORIGINAL_ID_EVIDENCE_PARITY_MISMATCH: "+canonical)
        samples=[]
        for raw in raws:
            for kind,data in evidence[raw]["title_evidence_buckets"].items():
                if kind in strict:
                    samples.extend({"raw_label":raw,"syntax_bucket":kind,**x}
                                   for x in data.get("samples",[])[:2])
        candidates.append({
            "identity_for_review":canonical,
            "original_source_raw_labels":raws,
            "historic_person_name_review":"SOURCE_REVIEWED_PLAUSIBLE",
            "production_registry_screen":"NO_NAME_MATCH_AS_OF_2026_10_10_NOT_CERTIFIED_UNREGISTERED",
            "distinct_title_mention_channels":len(original_ch),
            "distinct_title_mention_videos":len(original_v),
            "distinct_topic_title_cue_channels_REVIEW_ONLY":len(focus_ch),
            "distinct_topic_title_cue_videos_REVIEW_ONLY":len(focus_v),
            "distinct_stronger_biography_title_cue_channels_REVIEW_ONLY":len(strong_ch),
            "distinct_stronger_biography_title_cue_videos_REVIEW_ONLY":len(strong_v),
            "topic_cue_original_channel_ids":sorted(focus_ch),
            "topic_cue_original_video_ids":sorted(focus_v),
            "title_syntax_evidence_examples":samples[:8],
            "content_video_topic_verified":False
        })
    candidates.sort(key=lambda x:(-x["distinct_topic_title_cue_channels_REVIEW_ONLY"],
                                  -x["distinct_stronger_biography_title_cue_channels_REVIEW_ONLY"],
                                  -x["distinct_title_mention_channels"],x["identity_for_review"]))
    for order,item in enumerate(candidates,1):
        item["source_review_order_NOT_GLOBAL_RANK"]=order
    return {
        "schema":"youtube-b024-first-source-first-last-registry-historical-candidates/v1",
        "publication_eligible":False,
        "single_discovery_rank_target_not_changed":True,
        "source_snapshot_id":manifest["source_snapshot_id"],
        "reviewed_label_population":len(selected),
        "registered_labels_excluded":len(known_registered),
        "ambiguous_identity_labels_held":len(holds),
        "remaining_source_raw_labels":len(source_labels),
        "remaining_historical_identity_review_groups":len(candidates),
        "registry_state":registry_state,
        "registered_match_evidence":[{"source_name":label,**data}
         for label,data in {**manifest["registered_exact"],
                            **manifest["registered_reviewed_alias"]}.items()],
        "held_identity_or_person_focus":manifest["identity_context_hold"],
        "registered_person_exclusion_is_final_step":True,
        "caveats":[
            "Candidate list covers only the 36 source-prioritized names, NOT the whole YouTube corpus.",
            "Exact registry-name nonmatch is not proof of unique absence: recheck all alternate names before publication.",
            "Title-level biography syntax is not certified video content or independent channel topic credit.",
            "No registered UUID was used to generate the source candidate names.",
            "Reviewed aliases union ORIGINAL channel/video IDs, never sum preaggregated counts."
        ],
        "candidates":candidates
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for a in ("source-evidence-json","review-queue-json","manifest-json","output"):
        p.add_argument("--"+a,required=True)
    p.add_argument("--source-archive")
    p.add_argument("--live-registry-json")
    a=p.parse_args()
    get=lambda path:json.loads(Path(path).read_text(encoding="utf-8"))
    result=review(get(a.source_evidence_json),get(a.review_queue_json),get(a.manifest_json),
                  archive=a.source_archive,
                  registry_projection=get(a.live_registry_json) if a.live_registry_json else None)
    Path(a.output).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k not in ("candidates","registered_match_evidence")},ensure_ascii=False))

if __name__=="__main__":
    main()
