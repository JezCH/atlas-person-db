#!/usr/bin/env python3
"""First metadata fetch tranche: historically reviewed name-form candidates only.

This is a subset of the **original-source-verified** 10,126-video request.
Even clear 'Life of X' titles are NOT content-approved videos or verified
ATLAS-unregistered historical Persons. No DB writer is called.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path

PARENT_SHA256="06fe5e584aef1fd0f36231f0e71bc2e594ab654c17f907a8c8cc630cb2a954db"
ORIGINAL_SHA256="8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"
ORIGINAL_SNAPSHOT="yt-20261009T111844Z-10127ch-rebuild-v4"
EXPECTED_FIRST_90_ID_SHA256="e0889583b5d71a9559a1d2aae455d7c1e33f624b2499db1c7bfb4f3f83e4f4f0"
STRONG_CUES=frozenset({"BIOGRAPHICAL_TITLE_CUE_REVIEW","POST_NAME_BIOGRAPHY_CUE_REVIEW"})
HISTORICAL_NAME_FORMS={
  "Emmett Till":["Emmett Till"],
  "Carter G. Woodson":["Carter G Woodson"],
  "Booker T. Washington":["Booker T Washington"],
  "Meriwether Lewis":["Meriwether Lewis"],
  "Simon Kimbangu":["Simon Kimbangu"],
  "Herbert Chitepo":["Herbert Chitepo"],
  "Khudiram Bose":["Khudiram Bose"],
  "Lal Bahadur Shastri":["Lal Bahadur Shastri"],
  "Kazi Nazrul Islam":["Kazi Nazrul Islam"],
  "Hiroo Onoda":["Hiroo Onoda"],
  "A. P. J. Abdul Kalam":["Dr APJ Abdul Kalam"],
  "Shivaji":["Chhatrapati Shivaji Maharaj","Shivaji Maharaj"],
  "Mahendra of Nepal":["King Mahendra"],
  "C. S. Lewis":["C.S Lewis"],
  "Hürrem Sultan":["Hurrem Sultan"],
}

def sha256(path):
    with Path(path).open("rb") as f:
        return hashlib.file_digest(f,"sha256").hexdigest()

def select(request,*,enforce_original_counts=True):
    if (request.get("schema")!="atlas-youtube-description-enrichment-request/v1" or
        request.get("source_zip_sha256")!=ORIGINAL_SHA256 or
        request.get("source_snapshot_id")!=ORIGINAL_SNAPSHOT or
        request.get("original_per_video_channel_id_verified") is not True or
        request.get("publication_allowed") is not False):
        raise ValueError("UNVERIFIED_FIRST_TRANCHE_SOURCE")
    if enforce_original_counts and (
        request.get("unique_original_video_ids")!=10126 or
        request.get("source_channel_count")!=10127 or
        request.get("source_video_count")!=2230031 or
        request.get("reviewed_candidate_labels")!=245):
        raise ValueError("FIRST_TRANCHE_PARENT_POPULATION_CHANGED")
    aliases={}
    for canonical,names in HISTORICAL_NAME_FORMS.items():
        for name in names:
            if name in aliases: raise ValueError("AMBIGUOUS_ALIAS_IDENTITY")
            aliases[name]=canonical
    picked=[]
    by_person=collections.defaultdict(lambda:{"channel_ids":set(),"video_ids":set(),"name_forms":set()})
    all_ids=set()
    for v in request["videos"]:
        vid=v["video_id"]
        if vid in all_ids:raise ValueError("DUPLICATE_SOURCE_VIDEO")
        all_ids.add(vid)
        matching=[x for x in v["name_cues"]
                  if x["raw_name"] in aliases and x["bucket"] in STRONG_CUES]
        if not matching:continue
        keys={aliases[x["raw_name"]] for x in matching}
        if len(keys)!=1:raise ValueError("MULTIPLE_SOURCE_IDENTITIES_PER_VIDEO")
        name=next(iter(keys))
        by_person[name]["video_ids"].add(vid)
        by_person[name]["channel_ids"].add(v["original_channel_id"])
        by_person[name]["name_forms"].update(x["raw_name"] for x in matching)
        picked.append({**v,
            "review_identity_for_queue_only":name,
            "strong_title_cues":matching,
            "content_focus_confirmed":False,
            "actually_unregistered_confirmed":False,
            "youtube_url":"https://www.youtube.com/watch?v="+vid})
    picked.sort(key=lambda v:(v["review_identity_for_queue_only"],v["original_channel_id"],v["video_id"]))
    if enforce_original_counts:
        digest=hashlib.sha256("\n".join(sorted(v["video_id"] for v in picked)).encode()).hexdigest()
        if len(picked)!=90 or len({v["original_channel_id"] for v in picked})!=82 or (
            digest!=EXPECTED_FIRST_90_ID_SHA256 or len(by_person)!=15):
            raise ValueError("EXACT_B024_FIRST_TRANCHE_ID_SET_MISMATCH")
    return {**{k:v for k,v in request.items() if k!="videos"},
        "unique_original_video_ids":len(picked),
        "tranche_schema":"atlas-youtube-historical-first-biography-metadata-tranche/v1",
        "parent_canonical_request_sha256":PARENT_SHA256,
        "parent_canonical_unique_video_ids":request["unique_original_video_ids"],
        "metadata_fetch_batches_at_50":(len(picked)+49)//50,
        "reviewed_historical_person_identities":len(by_person),
        "selection_rule":"Only source original title BIOGRAPHICAL or POST_NAME_BIOGRAPHY syntax cues for 15 previously source-prioritized identity groups, not registered-DB name lexicon",
        "authoritative_person_centered_videos":0,
        "production_publication_allowed":False,
        "people":[{
            "historical_identity_for_review":name,
            "original_name_forms_selected":sorted(x["name_forms"]),
            "original_distinct_video_ids":len(x["video_ids"]),
            "original_distinct_channel_ids":len(x["channel_ids"]),
            "original_channel_ids":sorted(x["channel_ids"]),
            "individual_focus_status":"TITLE_CONTEXT_REVIEW_ONLY"
        } for name,x in sorted(by_person.items())],
        "videos":picked}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--request",required=True)
    p.add_argument("--output",required=True)
    a=p.parse_args()
    if sha256(a.request)!=PARENT_SHA256:raise ValueError("PINNED_CANONICAL_10126_REQUEST_SHA256_MISMATCH")
    request=json.loads(Path(a.request).read_text(encoding="utf-8"))
    output=select(request)
    Path(a.output).write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"video_ids":output["unique_original_video_ids"],
        "distinct_original_channels":len({v["original_channel_id"] for v in output["videos"]}),
        "historical_identity_groups":output["reviewed_historical_person_identities"],
        "metadata_api_batches":output["metadata_fetch_batches_at_50"],
        "actual_video_content_approved":0},ensure_ascii=False))

if __name__=="__main__":
    main()
