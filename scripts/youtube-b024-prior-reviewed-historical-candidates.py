#!/usr/bin/env python3
"""Actually link 15 independently reviewed HISTORICAL Person name identities
to already filtered 10,706 original title-grammar Video-ID / Channel-ID sets.

Read only prior real title scan and historic full 2,145-Person name comparison.
Do not fetch more videos, conflate aliases, or falsely claim present-day absence.
"""
import argparse
import collections
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INPUT_SCHEMA="atlas-youtube-b024-prior-identity-positive-refined-original-cohorts/v1"
OUTPUT_SCHEMA="atlas-youtube-b024-historical-source-candidate-id-evidence/v1"
REVIEW_SCHEMA="youtube-b024-source-first-last-registry-screen-36/v1"
MANIFEST=ROOT/"audits/youtube-b024-source-first-36-final-registered-identity-review.json"
ORIGINAL_ZIP_SHA="8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"

def review(data,manifest):
    if (data.get("schema")!=INPUT_SCHEMA or data.get("input_existing_b024_original_video_ids")!=10706 or
        data.get("input_source_name_labels")!=2766 or data.get("full_current_ATLAS_person_and_alias_census_completed") is not False or
        data.get("publishable") is not False or data.get("real_video_primary_content_certified")!=0 or
        data.get("confirmed_current_unregistered_historical_people")!=0 or
        len(data.get("rows",[]))!=2766 or
        manifest.get("schema")!=REVIEW_SCHEMA or
        manifest.get("source_sha256")!=ORIGINAL_ZIP_SHA or
        manifest.get("production_identity_check",{}).get("person_records_read")!=2145 or
        manifest.get("production_identity_check",{}).get("live_recheck_required_before_any_publication") is not True):
        raise ValueError("B024_HISTORICAL_IDENTITY_SOURCE_CONTRACT_INVALID")
    groups=manifest.get("source_historical_unmatched_identity_groups",{})
    holds=set(manifest.get("identity_context_hold",{}))
    accepted=set(manifest.get("registered_exact",{}))|set(manifest.get("registered_reviewed_alias",{}))
    if len(groups)!=15 or len({name for ns in groups.values() for name in ns})!=16:
        raise ValueError("B024_PRIOR_REVIEW_15_HISTORICAL_IDENTITY_GROUPS_CHANGED")
    if any(n in holds or n in accepted for v in groups.values() for n in v):
        raise ValueError("B024_HISTORIC_REGISTERED_OR_HOLD_IDENTITY_REINTRODUCED")
    rows=data["rows"]
    by_name={}
    for row in rows:
        name=row["identity_label_for_review"]
        if name in by_name:
            raise ValueError("B024_REAL_SOURCE_ORIGINAL_ID_NAME_DUPLICATE")
        by_name[name]=row
    results=[]
    found_count=0
    for canonical,names in groups.items():
        channel_ids=set()
        video_ids=set()
        samples=[]
        found=[]
        protections=[]
        for name in names:
            row=by_name.get(name)
            if row is None:
                protections.append("NO_EXPLICIT_BIOGRAPHY_TITLE_CUE_SOURCE_LABEL")
                continue
            found.append(name)
            state=row["registration_screen_status"]
            if (state in ("CONFIRMED_REGISTERED_AS_OF_2026_10_09_EXCLUDE",
                          "REVIEWED_LIVING_AS_OF_2026_10_09_EXCLUDE",
                          "ADDITIONAL_REGISTERED_UUID_POSITIVE_EXCLUDE",
                          "ADDITIONAL_DATED_LIVING_EVIDENCE_EXCLUDE",
                          "ADDITIONAL_HISTORICAL_IDENTITY_CONFLICT_HOLD",
                          "NORMALIZED_ALIAS_OR_LIVING_IDENTITY_HOLD") or
                row.get("additional_registered_uuid_positive") or
                row.get("additional_living_evidence_urls") or
                row.get("current_complete_production_person_registry_rechecked") is not False or
                row.get("actual_video_content_certified") is not False):
                protections.append("RECENT_REGISTERED_LIVING_OR_AMBIGUITY_CONFLICT_HOLD")
                continue
            original_ch=row["strong_biography_title_distinct_original_channel_ids"]
            original_vid=row["strong_biography_title_distinct_original_video_ids"]
            if (len(set(original_ch))!=row["strong_biography_title_distinct_channels"] or
                len(set(original_vid))!=row["strong_biography_title_distinct_videos"] or
                set(video_ids)&set(original_vid)):
                raise ValueError("B024_HISTORICAL_ORIGINAL_IDS_UNION_PARITY_FAILED")
            channel_ids.update(original_ch)
            video_ids.update(original_vid)
            samples.extend(row.get("source_examples",[]))
        status=("HOLD_REVIEWED_REGISTERED_OR_AMBIGUOUS" if "RECENT_REGISTERED_LIVING_OR_AMBIGUITY_CONFLICT_HOLD" in protections
                else "SOURCE_TITLE_EVIDENCE_AVAILABLE_NEEDS_CURRENT_REGISTRY_AND_MEDIA_REVIEW" if video_ids
                else "NO_EXPLICIT_TITLE_EVIDENCE_REVIEW_HOLD")
        if video_ids:
            found_count+=1
        results.append({
            "historical_identity_for_review":canonical,
            "independent_source_name_forms_reviewed":names,
            "source_labels_with_biography_title_IDs":found,
            "original_distinct_channels_with_explicit_biography_title":len(channel_ids),
            "original_distinct_videos_with_explicit_biography_title":len(video_ids),
            "original_channel_ids":sorted(channel_ids),
            "original_video_ids":sorted(video_ids),
            "examples_original_video_id_and_title":samples[:5],
            "source_2026_10_10_2145_person_name_projection_no_direct_match":True,
            "current_ATLAS_registry_and_aliases_full_recheck_completed":False,
            "historical_personhood_prior_manual_review":True,
            "video_media_content_verified":False,
            "current_unregistered_person_certified":False,
            "eligibility":status,
            "holding_reasons":sorted(set(protections)),
            "independent_public_historical_reference":
                manifest.get("source_links_for_independently_grounded_histories",{}).get(canonical)
        })
    results.sort(key=lambda x:(-x["original_distinct_channels_with_explicit_biography_title"],
                               -x["original_distinct_videos_with_explicit_biography_title"],
                               x["historical_identity_for_review"]))
    for i,item in enumerate(results,1):
        item["review_priority_NOT_PUBLISHED_RANK"]=i
    return {
        "schema":OUTPUT_SCHEMA,"prior_historical_identity_reviewed":15,
        "prior_full_2026_10_10_Production_persons_checked":2145,
        "archived_name_source_original_zip_sha256":ORIGINAL_ZIP_SHA,
        "source_video_id_population_input":10706,
        "historic_reviewed_identities_with_explicit_bio_title_IDs":found_count,
        "no_biography_title_source_or_conflict":15-found_count,
        "live_complete_registration_screened_today":False,
        "actual_video_media_content_verified":0,
        "confirmed_current_unregistered_historical_Persons":0,
        "Production_rank_published":False,
        "new_videos_searched_or_scraped":0,
        "reviewed_candidates":results
    }

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--already-reviewed-id-cohorts",required=True)
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    d=review(json.loads(Path(args.already_reviewed_id_cohorts).read_text(encoding="utf8")),
             json.loads(MANIFEST.read_text(encoding="utf8")))
    out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(d,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print(json.dumps({k:v for k,v in d.items() if k!="reviewed_candidates"},ensure_ascii=False))
    for x in d["reviewed_candidates"]:
        print(json.dumps({"name":x["historical_identity_for_review"],
            "original_channels":x["original_distinct_channels_with_explicit_biography_title"],
            "original_videos":x["original_distinct_videos_with_explicit_biography_title"],
            "source_video_id":x["examples_original_video_id_and_title"][0].get("video_id")
                   if x["examples_original_video_id_and_title"] else None,
            "status":x["eligibility"]},ensure_ascii=False))

if __name__=="__main__":
    main()
