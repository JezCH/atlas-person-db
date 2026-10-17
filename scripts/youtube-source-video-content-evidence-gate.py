#!/usr/bin/env python3
"""Conservative historical Person-focused video evidence gate (READ-ONLY).

A title or description *never* credits a Person channel automatically.
Only separately reviewed, provenance-bound actual VIDEO/TRANSCRIPT evidence
can enter an individual original Channel-ID / Video-ID union; final registered
Person exclusion and publication require a separate future authorized step.
"""
import argparse
import collections
import datetime as dt
import hashlib
import json
import re
from pathlib import Path

REVIEWED_METHODS={"VIDEO_PLAYBACK_MANUAL","TIMESTAMPED_TRANSCRIPT"}
SHA256=re.compile(r"^[a-f0-9]{64}$")


def validate_collected_metadata(request, metadata):
    """Verify collector artifact independently before ANY content-review credit.

    The 10,126-title request is the authoritative original Video-ID/channel/title
    population; a later public search hit or hand-edited description is not the
    official YouTube snippet. Partially fetched artifacts remain reviewable only
    for their actually fetched records, never for rows not yet fetched.
    """
    if (request.get("schema")!="atlas-youtube-description-enrichment-request/v1" or
        request.get("original_per_video_channel_id_verified") is not True or
        request.get("publication_allowed") is not False):
        raise ValueError("MISSING_VERIFIED_ORIGINAL_VIDEO_ID_CHANNEL_BINDING")
    if metadata.get("schema")!="atlas-youtube-description-enrichment-result/v1":
        raise ValueError("DESCRIPTION_METADATA_SCHEMA_MISMATCH")
    if (metadata.get("source_snapshot_id")!=request.get("source_snapshot_id") or
        metadata.get("source_zip_sha256")!=request.get("source_zip_sha256") or
        metadata.get("request_source_json_sha256")!=request.get("source_review_json_sha256")):
        raise ValueError("SOURCE_PROVENANCE_INCONSISTENCY")
    rows=request.get("videos")
    if not isinstance(rows,list):
        raise ValueError("ORIGINAL_VIDEO_ID_EVIDENCE_POPULATION_MISMATCH")
    original={}
    for row in rows:
        vid=row.get("video_id") if isinstance(row,dict) else None
        if (not isinstance(vid,str) or not vid or vid in original or
            not isinstance(row.get("original_channel_id"),str) or
            not isinstance(row.get("original_title"),str) or
            not isinstance(row.get("name_cues"),list)):
            raise ValueError("ORIGINAL_VIDEO_ID_EVIDENCE_POPULATION_MISMATCH")
        original[vid]=row
    if len(original)!=request.get("unique_original_video_ids"):
        raise ValueError("ORIGINAL_VIDEO_ID_EVIDENCE_POPULATION_MISMATCH")
    records=metadata.get("records")
    if not isinstance(records,list) or metadata.get("automatic_person_subject_approval") is not False:
        raise ValueError("COLLECTED_METADATA_CANNOT_AUTO_APPROVE_PERSON")
    actual={}
    for row in records:
        vid=row.get("video_id") if isinstance(row,dict) else None
        if not isinstance(vid,str) or vid in actual or vid not in original:
            raise ValueError("ORIGINAL_VIDEO_ID_EVIDENCE_POPULATION_MISMATCH")
        actual[vid]=row
    if (metadata.get("requested_original_video_ids")!=len(original) or
        metadata.get("fetched_metadata_rows")!=len(actual) or
        metadata.get("not_yet_fetched")!=len(original)-len(actual)):
        raise ValueError("METADATA_COMPLETENESS_COUNT_MISMATCH")
    for vid, row in actual.items():
        source=original[vid]
        description=row.get("description")
        if description is not None and not isinstance(description,str):
            raise ValueError("COLLECTED_METADATA_DESCRIPTION_INTEGRITY_MISMATCH")
        description=description or ""
        expected_hash=hashlib.sha256(description.encode("utf-8")).hexdigest()
        if (row.get("original_channel_id")!=source["original_channel_id"] or
            row.get("original_title")!=source["original_title"] or
            row.get("person_video_content_verified") is not False or
            row.get("description_sha256")!=expected_hash):
            raise ValueError("COLLECTED_METADATA_ORIGINAL_BINDING_OR_HASH_MISMATCH")
        live_channel=row.get("live_channel_id")
        expected_status=("NOT_FOUND_OR_UNAVAILABLE" if live_channel is None else
            "CHANNEL_MISMATCH" if live_channel!=source["original_channel_id"] else
            "DESCRIPTION_PRESENT" if description.strip() else "DESCRIPTION_EMPTY")
        if row.get("status")!=expected_status:
            raise ValueError("COLLECTED_METADATA_STATUS_INCONSISTENT")
        if live_channel is None and (
            row.get("live_title") is not None or
            row.get("published_at") is not None or
            row.get("description") is not None):
            raise ValueError("COLLECTED_METADATA_UNAVAILABLE_ROW_HAS_PUBLISHER_DATA")
    return original,actual


def adjudicate(request,metadata,identities,decisions):
    # Do not trust an alleged collector artifact just because its source SHA
    # strings and one reviewed Channel ID match. Validate ALL rows and counts.
    original,actual=validate_collected_metadata(request,metadata)
    if identities.get("schema")!="youtube-b024-source-first-last-registry-screen-36/v1":
        raise ValueError("HISTORICAL_INDEPENDENT_IDENTITY_REVIEW_SCHEMA_MISMATCH")
    if decisions.get("schema")!="atlas-youtube-person-content-review-decisions/v1":
        raise ValueError("VIDEO_CONTENT_REVIEW_SCHEMA_MISMATCH")
    source=request["source_snapshot_id"]
    if (identities.get("source_snapshot_id")!=source or
        decisions.get("source_snapshot_id")!=source or
        identities.get("source_sha256")!=request["source_zip_sha256"] or
        decisions.get("source_archive_sha256",request["source_zip_sha256"])!=request["source_zip_sha256"]):
        raise ValueError("SOURCE_PROVENANCE_INCONSISTENCY")
    aliases=identities["source_historical_unmatched_identity_groups"]
    ranked=collections.defaultdict(lambda:{"channels":set(),"videos":set(),"source_reviews":[]})
    counted=collections.Counter()
    review_ids=set()
    for item in decisions["decisions"]:
        vid=item.get("video_id")
        if vid not in original or vid in review_ids:
            raise ValueError("INVALID_DUPLICATE_OR_UNSOURCED_VIDEO_REVIEW")
        review_ids.add(vid)
        name=item.get("identity_for_review")
        label=item.get("raw_name")
        if name not in aliases or label not in aliases[name]:
            raise ValueError("UNREVIEWED_ALIAS_OR_PERSON_IDENTITY")
        if label not in {r["raw_name"] for r in original[vid]["name_cues"]}:
            raise ValueError("ORIGINAL_VIDEO_DID_NOT_SUPPORT_THIS_NAME")
        verdict=item.get("verdict")
        if verdict in ("WORK_OR_PERFORMANCE","JOINT_PERSON_OR_EVENT","INCIDENTAL_MENTION","UNRESOLVED"):
            counted[verdict]+=1
            continue
        if verdict!="PERSON_PRIMARY_CONTENT_CONFIRMED":
            raise ValueError("UNKNOWN_VIDEO_CONTENT_REVIEW_VERDICT")
        meta=actual.get(vid)
        if not meta or meta.get("status") not in ("DESCRIPTION_PRESENT","DESCRIPTION_EMPTY"):
            raise ValueError("CANNOT_CREDIT_MISSING_OR_CHANNEL_MISMATCH_VIDEO")
        channel=original[vid]["original_channel_id"]
        if meta["original_channel_id"]!=channel or meta.get("live_channel_id")!=channel:
            raise ValueError("ORIGINAL_LIVE_CHANNEL_ID_DISAGREEMENT")
        method=item.get("evidence_method")
        if method not in REVIEWED_METHODS:
            raise ValueError("TITLE_OR_DESCRIPTION_CANNOT_PROVE_CONTENT_SUBJECT")
        if (len(str(item.get("reviewer") or "").strip())<3 or
            len(str(item.get("reason") or "").strip())<25 or
            item.get("source_url")!=f"https://www.youtube.com/watch?v={vid}"):
            raise ValueError("HUMAN_REVIEWER_AND_EXPLICIT_ORIGINAL_SOURCE_REQUIRED")
        try:
            dt.datetime.fromisoformat(str(item["reviewed_at"]).replace("Z","+00:00"))
        except (KeyError,ValueError) as e:
            raise ValueError("INVALID_REVIEW_TIMESTAMP") from e
        span=item.get("content_segment") or {}
        start=span.get("start_seconds")
        end=span.get("end_seconds")
        if not isinstance(start,(int,float)) or not isinstance(end,(int,float)) or not (0<=start<end and end-start>=10):
            raise ValueError("TIMESTAMPED_VIDEO_CONTENT_EVIDENCE_REQUIRED")
        if method=="TIMESTAMPED_TRANSCRIPT":
            if not SHA256.fullmatch(str(item.get("transcript_sha256") or "")) or len(str(item.get("transcript_excerpt") or ""))<25:
                raise ValueError("TRANSCRIPT_SOURCE_DIGEST_AND_EXCERPT_REQUIRED")
        group=ranked[name]
        group["channels"].add(channel)
        group["videos"].add(vid)
        group["source_reviews"].append({"video_id":vid,"channel_id":channel,
            "reviewer":item["reviewer"],"reviewed_at":item["reviewed_at"],
            "content_segment":span,"evidence_method":method})
        counted[verdict]+=1
    out=[]
    for name,raw_forms in aliases.items():
        entry=ranked[name]
        out.append({"person_identity_for_review":name,"reviewed_source_name_forms":raw_forms,
            "distinct_content_verified_channels":len(entry["channels"]),
            "distinct_content_verified_videos":len(entry["videos"]),
            "original_channel_ids":sorted(entry["channels"]),
            "original_video_ids":sorted(entry["videos"]),
            "content_review_provenance":entry["source_reviews"],
            "final_registered_person_exclusion_pending":True})
    out.sort(key=lambda r:(-r["distinct_content_verified_channels"],r["person_identity_for_review"]))
    return {"schema":"atlas-youtube-content-verified-original-id-candidate-gate/v1",
        "source_snapshot_id":source,"source_zip_sha256":request["source_zip_sha256"],
        "original_requested_video_ids":len(original),
        "actual_metadata_video_ids":len(actual),
        "explicit_content_review_decisions":len(review_ids),
        "decision_counts":dict(counted),
        "person_centered_video_ids_verified":len(set().union(*(set(p["original_video_ids"]) for p in out))),
        "registered_person_exclusion_completed":False,
        "production_ranking_publishable":False,
        "people":out}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for key in ("request","metadata","identities","decisions","output"):
        p.add_argument("--"+key,required=True)
    a=p.parse_args()
    load=lambda path:json.loads(Path(path).read_text(encoding="utf-8"))
    result=adjudicate(load(a.request),load(a.metadata),load(a.identities),load(a.decisions))
    Path(a.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k!="people"},ensure_ascii=False))


if __name__=="__main__":main()
