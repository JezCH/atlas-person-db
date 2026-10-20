#!/usr/bin/env python3
"""Refine the ALREADY EXECUTED exact original-ID cohort worklist, no crawl.

Uses previously verified Production registered UUID identity aliases (50 + 28),
dated user-selected 98 historical Production identity reviews, and 4 narrowly
documented corrections to avoid visibly wrong high-rank candidates.
No new-video scan, no inference that remaining people are NOT registered.
"""
import argparse
import collections
import json
import re
import unicodedata
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INPUT_SCHEMA="atlas-youtube-b024-20261020-existing-biography-title-cohort-screen/v1"
OUTPUT_SCHEMA="atlas-youtube-b024-prior-identity-positive-refined-original-cohorts/v1"
UUID=re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

def key(s):
    return unicodedata.normalize("NFKC",str(s)).casefold().strip()

def repo_json(path):
    return json.loads((ROOT/path).read_text(encoding="utf8"))

def checked_ids(ids):
    if not isinstance(ids,list) or not ids or not all(isinstance(x,str) and UUID.fullmatch(x) for x in ids):
        raise ValueError("HISTORIC_PRODUCTION_PERSON_UUID_EVIDENCE_INVALID")
    return set(ids)

def evidence():
    registered=collections.defaultdict(lambda:collections.defaultdict(set))
    living=collections.defaultdict(set)

    def add_register(name,uuid,source):
        if not isinstance(name,str) or not name or not UUID.fullmatch(uuid):
            raise ValueError("REGISTERED_ALIAS_PROVENANCE_INVALID")
        registered[key(name)][uuid].add(source)

    x=repo_json("audits/youtube-source-first-live-registered-aliases-50.json")
    if x.get("schema")!="atlas-youtube-live-registered-person-alias-lookup/v1" or len(x.get("reviewed_aliases",[]))!=50:
        raise ValueError("REGISTERED_REVIEW_50_SOURCE_INVALID")
    for row in x["reviewed_aliases"]:
        add_register(row["source_name"],row["registered_uuid"],"reviewed_live_alias_50")

    x=repo_json("audits/youtube-v5-registered-28-nonoverlap-specific-aliases.json")
    if x.get("schema")!="atlas-youtube-v5-registered-person-28-nonoverlap-aliases/v1" or len(x.get("aliases",[]))!=28:
        raise ValueError("REGISTERED_REVIEW_28_SOURCE_INVALID")
    for row in x["aliases"]:
        add_register(row["alias_name"],row["production_registered_person_id"],"reviewed_live_alias_28")

    x=repo_json("research/person-registration/user-selected-98-identity-reconciliation-20261016.v1.json")
    if x.get("schema")!="atlas-user-selected-person-identity-reconciliation/v1" or len(x.get("entries",[]))!=98:
        raise ValueError("REGISTERED_REVIEW_98_SOURCE_INVALID")
    for row in x["entries"]:
        if row.get("prior_evidence_kind") not in ("production_person_uuid_snapshot",
            "production_youtube_20261009_registered"):
            continue
        ids=row.get("historical_uuid_evidence") or []
        if not ids:
            continue
        checked_ids(ids)
        # Conflicting historical UUIDs stay explicitly conflicting, not merged.
        for name in [row["expected_name_en"],*row.get("aliases_to_check",[])]:
            for uuid in ids:
                add_register(name,uuid,"historical_user_selected_98_positive_uuid")

    x=repo_json("audits/youtube-b024-top-source-identity-corrections-20261020.json")
    if (x.get("schema")!="atlas-youtube-b024-top-known-person-review/v1" or
        x.get("publication_allowed") is not False or
        x.get("person_primary_content_video_verified") is not False or
        x.get("current_production_person_registry_full_check_completed") is not False):
        raise ValueError("TOP_IDENTITY_REVIEW_PROVENANCE_INVALID")
    for row in x["prior_registered_aliases"]:
        add_register(row["source_name"],row["registered_uuid"],"reviewed_exact_same_person_prior_uuid")
    for row in x["living"]:
        if (row.get("reviewed_status")!="LIVING" or not row.get("source_url","").startswith("https://") or
            not re.fullmatch(r"2026-[0-1]\d-[0-3]\d",row.get("source_date",""))):
            raise ValueError("TOP_LIVING_SOURCE_INVALID")
        living[key(row["source_name"])].add(row["source_url"])
    return registered,living

def refine(data,registered=None,living=None):
    if registered is None or living is None:
        registered,living=evidence()
    if (data.get("schema")!=INPUT_SCHEMA or
        data.get("input_biography_title_name_labels")!=2766 or
        data.get("input_biography_title_video_ids")!=10706 or
        data.get("registered_evidence_as_of")!="2026-10-09" or
        data.get("registered_evidence_not_current") is not True or
        data.get("production_rank_published") is not False or
        data.get("actual_person_primary_content_verified_video_count")!=0 or
        data.get("result_reviewed_identity_cohorts")!=2766 or
        len(data.get("rows",[]))!=2766):
        raise ValueError("ORIGINAL_REAL_COHORT_SCREEN_PROVENANCE_INVALID")
    counters=collections.Counter()
    changed=[]
    after=[]
    complete_vids=set()
    for row in data["rows"]:
        r=dict(row)
        names=[r["identity_label_for_review"],*r["source_raw_name_forms"]]
        vid=r["strong_biography_title_distinct_original_video_ids"]
        channels=r["strong_biography_title_distinct_original_channel_ids"]
        if (len(vid)!=r["strong_biography_title_distinct_videos"] or
            len(set(vid))!=len(vid) or len(set(channels))!=r["strong_biography_title_distinct_channels"] or
            r["actual_video_content_certified"] is not False or
            r["current_2026_10_20_registered_person_database_screen_complete"] is not False or
            complete_vids.intersection(vid)):
            raise ValueError("ORIGINAL_REAL_COHORT_VIDEO_ID_INVALID")
        complete_vids.update(vid)
        known_uuids=set()
        provenance=collections.defaultdict(set)
        known_living=set()
        for name in names:
            for uuid,srcs in registered.get(key(name),{}).items():
                known_uuids.add(uuid)
                provenance[uuid].update(srcs)
            known_living.update(living.get(key(name),set()))
        prior=r["registration_screen_status"]
        if prior in ("CONFIRMED_REGISTERED_AS_OF_2026_10_09_EXCLUDE",
                     "REVIEWED_LIVING_AS_OF_2026_10_09_EXCLUDE"):
            state=prior
        elif len(known_uuids)>1 or (known_uuids and known_living):
            state="ADDITIONAL_HISTORICAL_IDENTITY_CONFLICT_HOLD"
        elif known_uuids:
            state="ADDITIONAL_REGISTERED_UUID_POSITIVE_EXCLUDE"
        elif known_living:
            state="ADDITIONAL_DATED_LIVING_EVIDENCE_EXCLUDE"
        else:
            state=prior
        r["registration_screen_status"]=state
        r["additional_registered_uuid_positive"]=sorted(known_uuids)
        r["additional_registered_uuid_evidence"]={k:sorted(v) for k,v in provenance.items()}
        r["additional_living_evidence_urls"]=sorted(known_living)
        r["current_complete_production_person_registry_rechecked"]=False
        counters[state]+=1
        if state!=prior:
            changed.append({"name":r["identity_label_for_review"],
                            "before":prior,"after":state,
                            "registered_uuids":sorted(known_uuids),
                            "living_urls":sorted(known_living),
                            "original_channels":r["strong_biography_title_distinct_channels"],
                            "original_videos":r["strong_biography_title_distinct_videos"]})
        after.append(r)
    if len(complete_vids)!=10706:
        raise ValueError("ORIGINAL_REAL_COHORT_VIDEO_ID_POPULATION_INVALID")
    excluded={"CONFIRMED_REGISTERED_AS_OF_2026_10_09_EXCLUDE",
              "REVIEWED_LIVING_AS_OF_2026_10_09_EXCLUDE",
              "ADDITIONAL_REGISTERED_UUID_POSITIVE_EXCLUDE",
              "ADDITIONAL_DATED_LIVING_EVIDENCE_EXCLUDE"}
    pending={"PRIOR_2026_10_09_NEEDS_REVIEW_NOT_PROVEN_UNREGISTERED",
             "NO_2026_10_09_EXACT_SCREEN_ROW_RECHECK"}
    after.sort(key=lambda r:(-r["strong_biography_title_distinct_channels"],
                             -r["strong_biography_title_distinct_videos"],
                             r["identity_label_for_review"]))
    review_preview=[{"source_name":r["identity_label_for_review"],
         "original_channels":r["strong_biography_title_distinct_channels"],
         "original_video_titles":r["strong_biography_title_distinct_videos"],
         "sample_original_video_id":r["source_examples"][0]["video_id"] if r["source_examples"] else None,
         "historical_registry_state":r["registration_screen_status"]}
        for r in after if r["registration_screen_status"] in pending][:50]
    return {
        "schema":OUTPUT_SCHEMA,"input_existing_b024_original_video_ids":10706,
        "input_source_name_labels":2766,
        "reference_registration_evidence_latest":"2026-10-20-narrow-positive-review",
        "full_current_ATLAS_person_and_alias_census_completed":False,
        "additional_status_changes":len(changed),
        "actual_positive_registration_or_living_exclusions":sum(counters[x] for x in excluded),
        "remaining_not_proven_unregistered_review_names":sum(counters[x] for x in pending),
        "hold_count":len(after)-sum(counters[x] for x in excluded|pending),
        "status_counts":dict(counters),"changed":changed,
        "top_source_first_review_priority_not_an_official_rank":review_preview,
        "real_video_primary_content_certified":0,"confirmed_current_unregistered_historical_people":0,
        "new_youtube_videos_fetched":0,"production_writes":0,
        "publishable":False,"rows":after
    }

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--previous-cohorts",required=True)
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    result=refine(json.loads(Path(args.previous_cohorts).read_text(encoding="utf8")))
    output=Path(args.output)
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf8")
    print(json.dumps({k:v for k,v in result.items() if k not in ("rows","changed")},ensure_ascii=False))
    print("SOURCE_REVIEW_CHANGED="+json.dumps(result["changed"],ensure_ascii=False))

if __name__=="__main__":
    main()
