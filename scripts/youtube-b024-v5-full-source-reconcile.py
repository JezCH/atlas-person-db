#!/usr/bin/env python3
"""Reconcile the COMPLETE live Production v5 title-candidate population with
independently discovered B024 source-name VIDEO-ID evidence. READ ONLY.

Crucially v5 Production candidate rows and source-side B024 v4 name labels
are NOT interchangeable populations. An exact name match DOES NOT approve
historical personhood, same-Person alias identity, actual video content or
registered Person exclusion. This script publishes no ranking.
"""
import argparse
import collections
import hashlib
import json
import re
import unicodedata
from pathlib import Path

PRODUCTION_SCHEMA="atlas-youtube-live-v5-unregistered-title-candidate-reference/v1"
SOURCE_SCHEMA="atlas-youtube-b024-independent-full-source-original-video-evidence/v1"
REFERENCE_SNAPSHOT="yt-20261010T083657Z-10127ch-rebuild-v5"
SOURCE_SNAPSHOT="yt-20261009T111844Z-10127ch-rebuild-v4"
ZIP_SHA="8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"
LEDGER_SHA="b9d9bcdb4fa98e0f917a1dc32106a84fc11b788b86780078e9c207b5c44e550c"
PRIOR_RECALL_SHA="c9939919465af516e94aacbed72b737df376c370d0c8f8a349e69c717ddca1dd"


def strict_key(name):
    return unicodedata.normalize("NFKC",str(name)).casefold().strip()


def variation_tags(name):
    tags=[]
    if re.search(r"[&/'’‘\"“”–—-]",name): tags.append("PUNCTUATION_OR_SEPARATOR_SENSITIVITY_REVIEW")
    if any(ord(c)>127 for c in name): tags.append("UNICODE_OR_DIACRITIC_REVIEW")
    if len(name.split())<=2: tags.append("SHORT_OR_GENERIC_NAME_REVIEW")
    if re.search(r"\b[A-Z]\.?\s",name): tags.append("INITIALS_REVIEW")
    return tags or ["TITLE_MATCHING_RULE_CHANGE_REVIEW"]


def audit(production,source,old_recall,*,enforce_population=True):
    if (production.get("schema")!=PRODUCTION_SCHEMA or
        source.get("schema")!=SOURCE_SCHEMA):
        raise ValueError("SOURCE_OR_LIVE_REFERENCE_SCHEMA_MISMATCH")
    if (production.get("snapshot_id")!=REFERENCE_SNAPSHOT or
        source.get("source_snapshot_id")!=SOURCE_SNAPSHOT or
        source.get("source_zip_sha256")!=ZIP_SHA or
        production.get("original_archive_digest")!="sha256:"+ZIP_SHA):
        raise ValueError("DISTINCT_PINNED_SNAPSHOT_OR_ORIGINAL_SHA_MISMATCH")
    if production.get("is_authoritative_person_rank") is not False:
        raise ValueError("TITLE_CANDIDATE_REFERENCE_MUST_NOT_BE_APPROVED_PERSON_RANK")
    if (source.get("production_rank_publishable") is not False or
        source.get("registered_person_exclusion_performed") is not False or
        source.get("real_video_content_focus_approved") is not False):
        raise ValueError("SOURCE_LEDGER_MUST_NOT_CLAIM_VERIFIED_PERSON_CREDITS")
    prod_rows=production["rows"]
    source_rows=source["rows"]
    if enforce_population and (
        len(prod_rows)!=8713 or production.get("available_count")!=8713 or
        len(source_rows)!=5965 or
        source.get("independently_discovered_source_labels")!=5965 or
        source.get("original_source_videos_with_any_label")!=330327 or
        source.get("video_label_occurrences")!=359250 or
        old_recall.get("matched_name_labels")!=5720):
        raise ValueError("LIVE_SOURCE_FULL_CORPUS_POPULATION_CHANGED")
    if (production.get("original_channel_count")!=source.get("original_channel_population") or
        production.get("original_video_rows")!=source.get("original_video_population")):
        raise ValueError("SAME_ARCHIVE_CHANNEL_VIDEO_TOTALS_DIFFER")
    thresholds=production.get("threshold_counts") or {}
    if thresholds and any(str(k) not in thresholds for k in (3,5,10,15,20)):
        raise ValueError("MISSING_ALL_FIVE_LIVE_THRESHOLD_COUNTS")
    exact=collections.defaultdict(list)
    by_source={}
    for s in source_rows:
        name=s["name"]
        if name in by_source:
            raise ValueError("DUPLICATE_SOURCE_NAME")
        if (s.get("personhood_and_video_focus")!="UNREVIEWED_NOT_CERTIFIED" or
            s.get("registered_status")!="UNSCREENED_LAST_STAGE"):
            raise ValueError("FALSE_PERSON_IDENTITY_OR_REGISTRATION_APPROVAL")
        if (s.get("original_channel_count")!=len(s["original_channel_ids"]) or
            s.get("original_video_count")!=len(s["original_video_ids"]) or
            len(set(s["original_video_ids"]))!=len(s["original_video_ids"]) or
            len(set(s["original_channel_ids"]))!=len(s["original_channel_ids"])):
            raise ValueError("SOURCE_ORIGINAL_ID_SET_PARITY_MISMATCH")
        exact[strict_key(name)].append(s)
        by_source[name]=s
    prior={r["raw_name"]:r for r in old_recall["rows"]}
    if len(prior)!=len(old_recall["rows"]):
        raise ValueError("DUPLICATE_LEGACY_LABEL")
    name_mismatches=[]
    for name,s in by_source.items():
        if s.get("origin")!="preexisting_independent_5720":
            continue
        if name not in prior:
            raise ValueError("PREEXISTING_NAME_MISSING_FROM_ORIGINAL_RECALL")
        row=prior[name]
        delta_ch=s["original_channel_count"]-row["title_mention_distinct_channels"]
        delta_vid=s["original_video_count"]-row["title_mention_distinct_videos"]
        if delta_ch or delta_vid:
            name_mismatches.append({
                "source_name":name,
                "old_channels":row["title_mention_distinct_channels"],
                "new_review_channels":s["original_channel_count"],
                "channel_delta":delta_ch,
                "old_videos":row["title_mention_distinct_videos"],
                "new_review_videos":s["original_video_count"],
                "video_delta":delta_vid,
                "reasons_to_review_not_automatic_explanations":variation_tags(name),
                "critical_recount_risk":abs(delta_ch)>=30 or abs(delta_vid)>=100,
                "disposition":"SOURCE_MATCH_GRAMMAR_REVIEW_REQUIRED_NO_COUNT_PUBLICATION"
            })
    if enforce_population and (len(name_mismatches)!=865 or
        source.get("older5720_aggregate_count_mismatches")!=865 or
        source.get("additional245_mismatch_count")!=0 or
        source.get("additional245_exact_original_id_parity") is not True):
        raise ValueError("ORIGINAL_865_RECONCILIATION_DIFFERENCE_OR_245_PARITY_CHANGED")
    name_mismatches.sort(key=lambda x:(-abs(x["channel_delta"]),-abs(x["video_delta"]),x["source_name"]))
    crosswalk=[]
    seen=set()
    matched_source=set()
    collisions=0
    for idx,p in enumerate(prod_rows,1):
        name=p["name"]
        if p["rank"]!=idx or name in seen or p["channels"]<3:
            raise ValueError("PRODUCTION_FULL_RANK_OR_DUPLICATE_NAME_INVALID")
        seen.add(name)
        names=exact.get(strict_key(name),[])
        if len(names)>1:collisions+=1
        for src in names:matched_source.add(src["name"])
        crosswalk.append({
            "production_raw_name":name,
            "production_title_signal_rank":p["rank"],
            "production_title_signal_channels":p["channels"],
            "production_title_signal_videos":p["videos"],
            "source_name_exact_nfkc_casefold_match_count":len(names),
            "source_names_matched":[v["name"] for v in names],
            "status":("NO_EXACT_NAME_IN_INDEPENDENT_SOURCE_LEXICON" if not names
                else "MULTIPLE_SOURCE_LABEL_COLLISION_HOLD" if len(names)>1
                else "EXACT_RAW_NAME_ONLY_VIDEO_SUBJECT_AND_IDENTITY_NOT_CERTIFIED"),
            "original_source_channel_ids":names[0]["original_channel_ids"] if len(names)==1 else [],
            "original_source_video_ids":names[0]["original_video_ids"] if len(names)==1 else [],
            "source_vs_v5_channel_delta_REVIEW_ONLY":(
                names[0]["original_channel_count"]-p["channels"] if len(names)==1 else None),
            "safe_to_publish_as_historical_person":False
        })
    source_unmatched=sorted(set(by_source)-matched_source)
    return {
        "schema":"atlas-youtube-b024-v5-exhaustive-raw-name-source-crosswalk/v1",
        "production_snapshot_id":REFERENCE_SNAPSHOT,
        "independent_source_snapshot_id":SOURCE_SNAPSHOT,
        "same_original_source_archive_zip_sha256":ZIP_SHA,
        "source_original_channel_count":production["original_channel_count"],
        "source_original_video_rows":production["original_video_rows"],
        "production_candidate_raw_labels_scanned":len(prod_rows),
        "independent_source_name_labels_scanned":len(source_rows),
        "production_names_exact_source_matched":sum(x["source_name_exact_nfkc_casefold_match_count"]==1 for x in crosswalk),
        "production_names_not_exact_source_matched":sum(x["source_name_exact_nfkc_casefold_match_count"]==0 for x in crosswalk),
        "production_names_source_collision_holds":collisions,
        "source_labels_not_exact_in_production":len(source_unmatched),
        "older_source_count_mismatches":len(name_mismatches),
        "critical_older_source_count_mismatches":sum(x["critical_recount_risk"] for x in name_mismatches),
        "additional245_original_video_and_channel_sets_preserved":source.get("additional245_exact_original_id_parity") is True,
        "production_registered_filter_not_reapplied_to_original_sources":True,
        "historical_personhood_verified":False,
        "video_content_subjecthood_verified":False,
        "source_title_counts_are_not_same_as_production_title_signals":True,
        "final_registered_identity_screen_pending":True,
        "single_unregistered_person_rank_publishable":False,
        "notes":[
            "The existing Production 8713 name rows and source-side 5965 names originate from two different source-extraction snapshots; no blind count union.",
            "Even EXACT name string match does not prove real historical individual, same-person identity, content focus or not already registered.",
            "Historical source reviewed 245 original ID sets were not reclassified or overwritten.",
            "The older 865 aggregate mismatches are review blocks, NOT automatically adopted channel-count improvements.",
            "Production channel counts are title-derived signals, NOT confirmed videos primarily about that Person."
        ],
        "older_aggregate_mismatch_rows":name_mismatches,
        "source_only_raw_name_labels":source_unmatched,
        "production_source_crosswalk":crosswalk
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for arg in ("production-reference","source-ledger","old-recall","output"):
        p.add_argument("--"+arg,required=True)
    a=p.parse_args()
    def load(path,sha=None):
        if sha:
            with Path(path).open("rb") as f:
                if hashlib.file_digest(f,"sha256").hexdigest()!=sha:
                    raise ValueError("IMMUTABLE_INPUT_FILE_SHA256_MISMATCH")
        return json.loads(Path(path).read_text(encoding="utf8"))
    result=audit(load(a.production_reference),
                 load(a.source_ledger,LEDGER_SHA),
                 load(a.old_recall,PRIOR_RECALL_SHA))
    Path(a.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print(json.dumps({k:v for k,v in result.items()
                      if k not in ("older_aggregate_mismatch_rows",
                                  "source_only_raw_name_labels","production_source_crosswalk",
                                  "notes")},ensure_ascii=False))


if __name__=="__main__":
    main()
