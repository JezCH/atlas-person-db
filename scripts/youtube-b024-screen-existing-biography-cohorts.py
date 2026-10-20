#!/usr/bin/env python3
"""ACTUAL existing B024 title-cue cohorts vs prior registered/living evidence.

Read a REAL result from Actions artifact 12238850322 (2,230,031 source
video titles, 10,706 explicit biography-title Video IDs, 2,766 names).
Then union ONLY six historically reviewed same-Person alias forms using the
original Video-ID/Channel-ID SETS. ONLY THEN exclude previously confirmed
registered Persons, avoid confirmed living and hold possible homonyms.

No new YouTube scrape, no fictitious current DB lookup, no Production write.
October 9 registration screening is STALE and cannot prove absence TODAY.
"""
import argparse
import collections
import csv
import hashlib
import json
import re
import unicodedata
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
EXPECTED_SCHEMA="atlas-youtube-b024-existing-originals-biography-title-triage/v1"
OUTPUT_SCHEMA="atlas-youtube-b024-20261020-existing-biography-title-cohort-screen/v1"
SOURCE_SHA="8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"
ALIAS_FILE="audits/youtube-discovery-reviewed-source-unions-b024.json"
SCREEN_FILE="audits/youtube-6358-registration-living-screen-20261009.csv"
SNAPSHOT_DATE="2026-10-09"


def fold(value):
    value=unicodedata.normalize("NFKD",str(value)).casefold()
    return "".join(char for char in value if char.isalnum() and not unicodedata.combining(char))


def read_previous_screen(path):
    confirmed=collections.defaultdict(set)
    living=set()
    previously_reviewed=set()
    with Path(path).open("r",encoding="utf-8-sig",newline="") as stream:
        rows=list(csv.DictReader(stream))
    if len(rows)!=6358 or sorted(int(row["rank"]) for row in rows)!=list(range(1,6359)):
        raise ValueError("OLD_SCREEN_6358_SOURCE_PARITY_FAILED")
    for row in rows:
        name=row["raw_name"]
        if name in previously_reviewed:
            raise ValueError("OLD_SCREEN_DUPLICATE_RAW_NAME")
        previously_reviewed.add(name)
        state=row["review_lane"]
        if state=="REGISTERED":
            if not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f-]{27,}",row["registered_uuids"]):
                raise ValueError("OLD_SCREEN_REGISTERED_UUID_INVALID")
            confirmed[name].add(row["registered_uuids"])
        elif state=="REVIEWED_LIVING":
            if row["reviewed_living"]!="yes":
                raise ValueError("OLD_SCREEN_LIVING_PROVENANCE_INCONSISTENT")
            living.add(name)
        elif state!="NEEDS_REVIEW":
            raise ValueError("OLD_SCREEN_UNEXPECTED_STATUS")
    if not confirmed or not living:
        raise ValueError("OLD_SCREEN_EVIDENCE_EMPTY")
    return confirmed,living,previously_reviewed


def validate_result(data):
    if (data.get("schema")!=EXPECTED_SCHEMA or
        data.get("original_zip_sha256")!=SOURCE_SHA or
        data.get("original_channel_files_scanned")!=10127 or
        data.get("original_video_title_rows_scanned")!=2230031 or
        data.get("independent_source_name_label_count")!=5965 or
        data.get("any_source_name_matched_title_video_rows")!=330327 or
        data.get("explicit_biography_title_video_ids")!=10706 or
        data.get("distinct_name_labels_with_explicit_biography_title_cues")!=2766 or
        data.get("video_content_verified_count")!=0 or
        data.get("production_writes")!=0 or
        data.get("rank_publication_allowed") is not False or
        data.get("new_youtube_crawling_attempted") is not False or
        data.get("video_media_retrieval_attempted") is not False):
        raise ValueError("B024_REAL_TITLE_RESULT_SOURCE_INVALID")
    rows=data.get("rows")
    if not isinstance(rows,list) or len(rows)!=2766:
        raise ValueError("B024_REAL_TITLE_RESULT_ROWS_INVALID")
    names=set()
    all_video_ids=set()
    for row in rows:
        name=row.get("raw_name")
        v=row.get("strong_biography_original_video_ids")
        c=row.get("strong_biography_original_channel_ids")
        if (not isinstance(name,str) or name in names or not isinstance(v,list) or
            not isinstance(c,list) or len(v)!=row.get("strong_biography_title_original_video_count") or
            len(c)!=row.get("strong_biography_title_original_channel_count") or
            len(v)!=len(set(v)) or len(c)!=len(set(c)) or
            row.get("historic_person_identity_verified") is not False or
            row.get("original_video_actual_content_watched_verified") is not False or
            row.get("current_registered_person_exclusion_pending") is not True):
            raise ValueError("B024_REAL_TITLE_RESULT_PERSON_ROW_INVALID")
        if all_video_ids.intersection(v):
            raise ValueError("B024_REAL_TITLE_RESULT_ONE_VIDEO_MULTIPLE_LABELS")
        all_video_ids.update(v)
        names.add(name)
    if len(all_video_ids)!=10706:
        raise ValueError("B024_REAL_TITLE_RESULT_VID_SUM_INVALID")
    return rows


def reviewed_union_map(path):
    doc=json.loads(Path(path).read_text(encoding="utf8"))
    if (doc.get("schema")!="atlas-youtube-discovery-reviewed-unions/v1"
        or doc.get("source_artifact",{}).get("sha256")!=SOURCE_SHA
        or len(doc.get("approved_groups",[]))!=6):
        raise ValueError("REVIEWED_HISTORICAL_ALIAS_UNIONS_INVALID")
    aliases={}
    for group in doc["approved_groups"]:
        canonical=group["canonical_name"]
        for entry in group["aliases"]:
            name=entry["name"]
            if name in aliases:
                raise ValueError("REVIEWED_ALIAS_COLLISION")
            aliases[name]=canonical
    return aliases


def screen_title_cohorts(real,screen_csv=ROOT/SCREEN_FILE,alias_manifest=ROOT/ALIAS_FILE):
    rows=validate_result(real)
    registered,living,previous=read_previous_screen(screen_csv)
    reviewed_aliases=reviewed_union_map(alias_manifest)
    known_registered_fold=collections.defaultdict(set)
    known_living_fold=collections.defaultdict(set)
    for name,ids in registered.items():
        known_registered_fold[fold(name)].update(ids)
    for name in living:
        known_living_fold[fold(name)].add(name)
    by_group=collections.defaultdict(list)
    for row in rows:
        name=row["raw_name"]
        by_group[reviewed_aliases.get(name,name)].append(row)
    cohorts=[]
    for canonical,source in by_group.items():
        labels=[r["raw_name"] for r in source]
        video=set().union(*(set(r["strong_biography_original_video_ids"]) for r in source))
        channel=set().union(*(set(r["strong_biography_original_channel_ids"]) for r in source))
        confirmed_uuids=set().union(*(registered.get(n,set()) for n in [canonical,*labels]))
        known_live=any(n in living for n in [canonical,*labels])
        possible_registered=sorted(set().union(*(known_registered_fold.get(fold(n),set())
                                                for n in [canonical,*labels])))
        possible_live=any(known_living_fold.get(fold(n)) for n in [canonical,*labels])
        if len(confirmed_uuids)>1:
            state="CONFLICTING_OLD_REGISTERED_UUID_HOLD"
        elif confirmed_uuids:
            state="CONFIRMED_REGISTERED_AS_OF_2026_10_09_EXCLUDE"
        elif known_live:
            state="REVIEWED_LIVING_AS_OF_2026_10_09_EXCLUDE"
        elif possible_registered or possible_live:
            state="NORMALIZED_ALIAS_OR_LIVING_IDENTITY_HOLD"
        elif not any(n in previous for n in [canonical,*labels]):
            state="NO_2026_10_09_EXACT_SCREEN_ROW_RECHECK"
        else:
            state="PRIOR_2026_10_09_NEEDS_REVIEW_NOT_PROVEN_UNREGISTERED"
        cohorts.append({
            "identity_label_for_review":canonical,
            "source_raw_name_forms":sorted(labels),
            "reviewed_same_person_alias_union":len(source)>1,
            "strong_biography_title_distinct_original_channel_ids":sorted(channel),
            "strong_biography_title_distinct_original_video_ids":sorted(video),
            "strong_biography_title_distinct_channels":len(channel),
            "strong_biography_title_distinct_videos":len(video),
            "registration_screen_status":state,
            "previous_confirmed_registered_person_uuids":sorted(confirmed_uuids),
            "possible_registered_uuids_hold":possible_registered if not confirmed_uuids else [],
            "source_examples":[r["source_title_samples"][0] for r in source if r.get("source_title_samples")][:3],
            "historical_personhood_and_homonym_review_complete":False,
            "current_2026_10_20_registered_person_database_screen_complete":False,
            "actual_video_content_certified":False
        })
    cohorts.sort(key=lambda r:(-r["strong_biography_title_distinct_channels"],
                               -r["strong_biography_title_distinct_videos"],
                               r["identity_label_for_review"]))
    states=collections.Counter(r["registration_screen_status"] for r in cohorts)
    still_pending=[r for r in cohorts if r["registration_screen_status"] in {
        "PRIOR_2026_10_09_NEEDS_REVIEW_NOT_PROVEN_UNREGISTERED",
        "NO_2026_10_09_EXACT_SCREEN_ROW_RECHECK"
    }]
    return {
        "schema":OUTPUT_SCHEMA,
        "input_source_original_video_title_rows":2230031,
        "input_source_original_channels":10127,
        "input_biography_title_video_ids":10706,
        "input_biography_title_name_labels":2766,
        "input_source_zip_sha256":SOURCE_SHA,
        "registered_evidence_as_of":SNAPSHOT_DATE,
        "registered_evidence_not_current":True,
        "existing_same_person_reviewed_alias_manifest":ALIAS_FILE,
        "result_reviewed_identity_cohorts":len(cohorts),
        "screen_status_counts":dict(states),
        "previously_registered_or_living_excluded_cohorts":
            sum(states.get(k,0) for k in [
                "CONFIRMED_REGISTERED_AS_OF_2026_10_09_EXCLUDE",
                "REVIEWED_LIVING_AS_OF_2026_10_09_EXCLUDE"
            ]),
        "provisional_unscreened_review_cohort_count":len(still_pending),
        "current_atlas_v2_registry_recheck_required":True,
        "actual_person_primary_content_verified_video_count":0,
        "confirmed_current_unregistered_historical_person_count":0,
        "production_rank_published":False,
        "new_youtube_videos_fetched":0,
        "rows":cohorts,
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--existing-cue-json",required=True)
    p.add_argument("--output",required=True)
    args=p.parse_args()
    result=screen_title_cohorts(json.loads(Path(args.existing_cue_json).read_text(encoding="utf8")))
    output=Path(args.output)
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n",
                      encoding="utf8")
    print(json.dumps({k:v for k,v in result.items() if k!="rows"},ensure_ascii=False))
    pending=[r for r in result["rows"] if r["registration_screen_status"] in {
        "PRIOR_2026_10_09_NEEDS_REVIEW_NOT_PROVEN_UNREGISTERED",
        "NO_2026_10_09_EXACT_SCREEN_ROW_RECHECK"}]
    for row in pending[:25]:
        print(json.dumps({"name":row["identity_label_for_review"],
                          "status":row["registration_screen_status"],
                          "channels":row["strong_biography_title_distinct_channels"],
                          "videos":row["strong_biography_title_distinct_videos"],
                          "source_video_id":row["source_examples"][0]["video_id"] if row["source_examples"] else None},
                         ensure_ascii=False))

if __name__=="__main__":
    main()
