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
import math
import re
from pathlib import Path

REVIEWED_METHODS={"VIDEO_PLAYBACK_MANUAL","TIMESTAMPED_TRANSCRIPT"}
SHA256=re.compile(r"^[a-f0-9]{64}$")


# Pin per-original-Video-ID NAME associations, not whole names or video IDs.
# This is a negative title/identity evidence overlay and does NOT certify
# any video as centered on a historical Person.
REVIEWED_TITLE_LINK_HOLDS_PATH = (
    Path(__file__).resolve().parents[1] /
    "audits/youtube-b024-12-original-video-name-link-title-holds-20261018.json"
)
ORIGINAL_BATCH_024_SOURCE_SHA256 = (
    "8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"
)
ORIGINAL_VIDEO_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{11}$")
ORIGINAL_CHANNEL_ID_PATTERN = re.compile(r"^UC[A-Za-z0-9_-]{22}$")


def load_reviewed_title_link_holds(doc):
    """Require exactly source-pinned negative edges; never accept title as bio."""
    if (doc.get("schema")!="atlas-youtube-original-video-name-link-title-holds/v1" or
        doc.get("original_batch008_024_source_zip_sha256")!=ORIGINAL_BATCH_024_SOURCE_SHA256 or
        doc.get("original_source_channel_count")!=10127 or
        doc.get("original_source_video_count")!=2230031 or
        doc.get("original_video_id_samples_in_33_review")!=164 or
        doc.get("title_name_link_holds")!=12 or
        doc.get("title_based_positive_person_content_certified")!=0 or
        doc.get("registered_person_screen_performed") is not False or
        doc.get("original_video_or_channel_data_deleted") is not False or
        doc.get("source_archive_rewritten") is not False or
        doc.get("production_rank_publishable") is not False or
        doc.get("classification")!="TITLE_LEVEL_NEGATIVE_OR_IDENTITY_HOLD_NOT_ACTUAL_VIDEO_PLAYBACK"):
        raise ValueError("REVIEWED_TITLE_LINK_HOLD_PROVENANCE_OR_SCOPE_INVALID")
    rows=doc.get("links")
    if not isinstance(rows,list) or len(rows)!=12:
        raise ValueError("REVIEWED_TITLE_LINK_HOLD_COUNT_INVALID")
    by_video={}
    by_edge={}
    for row in rows:
        vid=row.get("video_id")
        cid=row.get("original_channel_id")
        title=row.get("original_title")
        name=row.get("raw_name")
        reason=row.get("review_reason")
        if (not isinstance(vid,str) or ORIGINAL_VIDEO_ID_PATTERN.fullmatch(vid) is None or
            not isinstance(cid,str) or ORIGINAL_CHANNEL_ID_PATTERN.fullmatch(cid) is None or
            not isinstance(title,str) or not title.strip() or
            not isinstance(name,str) or not name.strip() or
            not isinstance(reason,str) or len(reason)<8 or
            row.get("evidence_level")!="ORIGINAL_ZIP_VIDEO_ID_CHANNEL_ID_TITLE_ONLY" or
            row.get("positive_person_video_credit_blocked_until_review_changed") is not True or
            not isinstance(row.get("source_title_explanation"),str) or
            len(row["source_title_explanation"])<35):
            raise ValueError("REVIEWED_TITLE_LINK_HOLD_ROW_INVALID")
        key=(vid,name.casefold())
        if key in by_edge or vid in by_video:
            raise ValueError("DUPLICATE_REVIEWED_ORIGINAL_VIDEO_NAME_HOLD")
        by_edge[key]=row
        by_video[vid]=row
    return by_video,by_edge


ORIGINAL_TITLE_HOLD_BY_VIDEO, ORIGINAL_TITLE_HOLD_BY_VIDEO_NAME = (
    load_reviewed_title_link_holds(
        json.loads(REVIEWED_TITLE_LINK_HOLDS_PATH.read_text(encoding="utf-8"))
    )
)


def validate_original_title_name_holds(original):
    """Check the archived title/channel if a held original ID is in request.

    Never suppress an entire person's name (including descendants or
    similarly named artists), and never trust a changed name/channel/title.
    """
    known=[]
    for vid,source in original.items():
        reviewed=ORIGINAL_TITLE_HOLD_BY_VIDEO.get(vid)
        if reviewed is None:
            continue
        if (source["original_channel_id"]!=reviewed["original_channel_id"] or
            source["original_title"]!=reviewed["original_title"]):
            raise ValueError("REVIEWED_TITLE_LINK_HOLD_SOURCE_VIDEO_BINDING_CHANGED")
        known.append(vid)
    return frozenset(known)


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


TRANSCRIPT_SCHEMA="atlas-youtube-original-video-transcript-evidence/v1"
TRANSCRIPT_CAPTURE_METHODS={"YOUTUBE_CAPTION_TRACK","MANUAL_VIDEO_PLAYBACK_TRANSCRIPTION"}
MAX_TRANSCRIPT_FILE_BYTES=2_000_000


def aware_utc_datetime(value,code):
    """Demand timezone-aware timestamps: naive dates defeat capture order."""
    try:
        result=dt.datetime.fromisoformat(str(value).replace("Z","+00:00"))
    except (TypeError, ValueError) as e:
        raise ValueError(code) from e
    if result.tzinfo is None or result.utcoffset() is None:
        raise ValueError(code)
    return result.astimezone(dt.timezone.utc)


def normalize_transcript_text(text):
    return " ".join(text.split()).casefold()


def verify_timestamped_transcript_file(item,source,source_snapshot_id,transcript_dir):
    """Hash ACTUAL transcript file bytes, bind Video/Channel/source and excerpt.

    A valid hash proves artifact integrity, NOT YouTube authenticity. Actual
    source capture and independent human subject review are still mandatory.
    Only the exact <original_video_id>.json in the operator-supplied directory
    is accepted. No arbitrary file paths from a reviewer JSON are evaluated.
    """
    vid=item["video_id"]
    supplied=item.get("transcript_sha256")
    excerpt=item.get("transcript_excerpt")
    if not isinstance(supplied,str) or not SHA256.fullmatch(supplied) or (
       not isinstance(excerpt,str) or len(excerpt.strip())<25):
        raise ValueError("TRANSCRIPT_SOURCE_DIGEST_AND_EXCERPT_REQUIRED")
    if transcript_dir is None:
        raise ValueError("ORIGINAL_VIDEO_TRANSCRIPT_ARTIFACT_REQUIRED")
    if ORIGINAL_VIDEO_ID_PATTERN.fullmatch(str(vid)) is None:
        raise ValueError("TRANSCRIPT_ORIGINAL_VIDEO_ID_INVALID")
    # Naming only by the immutable original Video ID avoids path traversal
    # or a reviewer substituting a transcript for a different video.
    evidence_path=Path(transcript_dir)/f"{vid}.json"
    try:
        data=evidence_path.read_bytes()
    except (OSError,ValueError) as e:
        raise ValueError("ORIGINAL_VIDEO_TRANSCRIPT_ARTIFACT_REQUIRED") from e
    if not data or len(data)>MAX_TRANSCRIPT_FILE_BYTES:
        raise ValueError("TRANSCRIPT_EVIDENCE_ARTIFACT_SIZE_INVALID")
    actual_sha=hashlib.sha256(data).hexdigest()
    if actual_sha!=supplied:
        raise ValueError("TRANSCRIPT_ACTUAL_BYTES_SHA256_MISMATCH")
    try:
        artifact=json.loads(data.decode("utf-8"))
    except (ValueError,UnicodeDecodeError) as e:
        raise ValueError("TRANSCRIPT_ARTIFACT_NOT_UTF8_JSON") from e
    if (not isinstance(artifact,dict) or
        artifact.get("schema")!=TRANSCRIPT_SCHEMA or
        artifact.get("video_id")!=vid or
        artifact.get("original_channel_id")!=source["original_channel_id"] or
        artifact.get("original_title")!=source["original_title"] or
        artifact.get("source_snapshot_id")!=source_snapshot_id or
        artifact.get("source_zip_sha256")!=ORIGINAL_BATCH_024_SOURCE_SHA256 or
        artifact.get("source_url")!=f"https://www.youtube.com/watch?v={vid}" or
        artifact.get("capture_method") not in TRANSCRIPT_CAPTURE_METHODS or
        not isinstance(artifact.get("captured_by"),str) or
        len(artifact["captured_by"].strip())<3 or
        not isinstance(artifact.get("caption_language"),str) or
        not re.fullmatch(r"[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}",
                         artifact["caption_language"])):
        raise ValueError("TRANSCRIPT_ORIGINAL_SOURCE_PROVENANCE_MISMATCH")
    capture_time=aware_utc_datetime(artifact.get("captured_at"),"TRANSCRIPT_CAPTURE_TIME_INVALID")
    review_time=aware_utc_datetime(item.get("reviewed_at"),"INVALID_REVIEW_TIMESTAMP")
    if capture_time>review_time:
        raise ValueError("TRANSCRIPT_CAPTURE_AFTER_REVIEW_FORBIDDEN")
    segment=item.get("content_segment")
    if not isinstance(segment,dict):
        raise ValueError("TIMESTAMPED_VIDEO_CONTENT_EVIDENCE_REQUIRED")
    start,end=segment.get("start_seconds"),segment.get("end_seconds")
    if (type(start) not in (int,float) or type(end) not in (int,float) or
        not math.isfinite(start) or not math.isfinite(end) or
        start<0 or end-start<10):
        raise ValueError("TIMESTAMPED_VIDEO_CONTENT_EVIDENCE_REQUIRED")
    cues=artifact.get("segments")
    if not isinstance(cues,list) or not cues or len(cues)>20000:
        raise ValueError("TRANSCRIPT_SEGMENT_POPULATION_INVALID")
    covered=0
    excerpt_cues=[]
    prior_end=0
    for cue in cues:
        if not isinstance(cue,dict):
            raise ValueError("TRANSCRIPT_SEGMENT_INVALID")
        st,ed,txt=cue.get("start_seconds"),cue.get("end_seconds"),cue.get("text")
        if (type(st) not in (int,float) or type(ed) not in (int,float) or
            not math.isfinite(st) or not math.isfinite(ed) or
            st<0 or ed<=st or st<prior_end or
            not isinstance(txt,str) or not txt.strip()):
            raise ValueError("TRANSCRIPT_SEGMENT_INVALID_OR_OVERLAPPING")
        prior_end=ed
        overlap=max(0,min(ed,end)-max(st,start))
        if overlap>0:
            covered+=overlap
            excerpt_cues.append(txt)
    # Do NOT credit 10 seconds of requested span if only a two-second
    # caption cue actually intersects the observed video interval.
    if covered+1e-6<10:
        raise ValueError("TRANSCRIPT_TIMECODE_COVERAGE_BELOW_10_SECONDS")
    text=normalize_transcript_text(" ".join(excerpt_cues))
    if normalize_transcript_text(excerpt) not in text:
        raise ValueError("TRANSCRIPT_EXCERPT_NOT_IN_REVIEWED_VIDEO_SEGMENT")
    return {
        "transcript_evidence_sha256":actual_sha,
        "transcript_capture_method":artifact["capture_method"],
        "transcript_captured_at":artifact["captured_at"],
        "transcript_caption_language":artifact["caption_language"]
    }



MANUAL_PLAYBACK_SCHEMA="atlas-youtube-original-video-manual-playback-evidence/v1"
MAX_MANUAL_PLAYBACK_RECEIPT_BYTES=100_000


def verify_manual_playback_file(item,source,source_snapshot_id,playback_dir):
    """Require inspectable, byte-pinned timecoded observation, not a text-only claim.

    An operator-produced record CANNOT by itself prove a YouTube video was
    watched; source capture/witness authenticity is an independent human gate.
    """
    vid=item["video_id"]
    digest=item.get("manual_playback_sha256")
    if not isinstance(digest,str) or not SHA256.fullmatch(digest):
        raise ValueError("MANUAL_PLAYBACK_EVIDENCE_DIGEST_REQUIRED")
    if playback_dir is None:
        raise ValueError("MANUAL_PLAYBACK_SOURCE_ARTIFACT_REQUIRED")
    if ORIGINAL_VIDEO_ID_PATTERN.fullmatch(str(vid)) is None:
        raise ValueError("MANUAL_PLAYBACK_ORIGINAL_VIDEO_ID_INVALID")
    try:
        raw=(Path(playback_dir)/f"{vid}.json").read_bytes()
    except (OSError,ValueError) as e:
        raise ValueError("MANUAL_PLAYBACK_SOURCE_ARTIFACT_REQUIRED") from e
    if not raw or len(raw)>MAX_MANUAL_PLAYBACK_RECEIPT_BYTES:
        raise ValueError("MANUAL_PLAYBACK_ARTIFACT_SIZE_INVALID")
    actual=hashlib.sha256(raw).hexdigest()
    if digest!=actual:
        raise ValueError("MANUAL_PLAYBACK_ACTUAL_BYTES_SHA256_MISMATCH")
    try:
        receipt=json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError,ValueError) as e:
        raise ValueError("MANUAL_PLAYBACK_ARTIFACT_NOT_UTF8_JSON") from e
    if (not isinstance(receipt,dict) or
        receipt.get("schema")!=MANUAL_PLAYBACK_SCHEMA or
        receipt.get("video_id")!=vid or
        receipt.get("original_channel_id")!=source["original_channel_id"] or
        receipt.get("original_title")!=source["original_title"] or
        receipt.get("source_snapshot_id")!=source_snapshot_id or
        receipt.get("source_zip_sha256")!=ORIGINAL_BATCH_024_SOURCE_SHA256 or
        receipt.get("source_url")!=f"https://www.youtube.com/watch?v={vid}" or
        receipt.get("capture_method")!="MANUAL_VIDEO_PLAYBACK" or
        receipt.get("person_identity_for_review")!=item.get("identity_for_review") or
        receipt.get("captured_by")!=item.get("reviewer")):
        raise ValueError("MANUAL_PLAYBACK_ORIGINAL_SOURCE_PROVENANCE_MISMATCH")
    capture_time=aware_utc_datetime(receipt.get("captured_at"),"MANUAL_PLAYBACK_CAPTURE_TIME_INVALID")
    review_time=aware_utc_datetime(item.get("reviewed_at"),"INVALID_REVIEW_TIMESTAMP")
    if capture_time>review_time:
        raise ValueError("MANUAL_PLAYBACK_CAPTURE_AFTER_REVIEW_FORBIDDEN")
    span=item.get("content_segment") or {}
    lo,hi=span.get("start_seconds"),span.get("end_seconds")
    if (type(lo) not in (int,float) or type(hi) not in (int,float) or
        not math.isfinite(lo) or not math.isfinite(hi) or
        lo<0 or hi-lo<10):
        raise ValueError("MANUAL_PLAYBACK_TIMED_REVIEW_REQUIRED")
    observations=receipt.get("observations")
    if not isinstance(observations,list) or not observations or len(observations)>500:
        raise ValueError("MANUAL_PLAYBACK_OBSERVATIONS_REQUIRED")
    total=0
    previous=0
    for observed in observations:
        if not isinstance(observed,dict):
            raise ValueError("MANUAL_PLAYBACK_OBSERVATION_INVALID")
        start,end=observed.get("start_seconds"),observed.get("end_seconds")
        note=observed.get("observed_evidence")
        if (type(start) not in (int,float) or type(end) not in (int,float) or
            not math.isfinite(start) or not math.isfinite(end) or
            start<0 or end<=start or start<previous or
            not isinstance(note,str) or len(note.strip())<30):
            raise ValueError("MANUAL_PLAYBACK_OBSERVATION_INVALID")
        previous=end
        total+=max(0,min(end,hi)-max(start,lo))
    if total+1e-6<10:
        raise ValueError("MANUAL_PLAYBACK_OBSERVED_COVERAGE_BELOW_10_SECONDS")
    return {"manual_playback_evidence_sha256":actual,
            "manual_playback_capture_method":"MANUAL_VIDEO_PLAYBACK",
            "manual_playback_captured_at":receipt["captured_at"],
            "manual_playback_captured_by":receipt["captured_by"]}


def adjudicate(request,metadata,identities,decisions,*,transcript_evidence_dir=None,playback_evidence_dir=None):
    # Do not trust an alleged collector artifact just because its source SHA
    # strings and one reviewed Channel ID match. Validate ALL rows and counts.
    original,actual=validate_collected_metadata(request,metadata)
    validate_original_title_name_holds(original)
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
        # Exact reviewed original title/name edge only. A positive reviewer
        # cannot silently credit a wrong Person, song, group or place. A
        # negative human decision is allowed and never destroys source IDs.
        if (vid,label.casefold()) in ORIGINAL_TITLE_HOLD_BY_VIDEO_NAME:
            if verdict=="PERSON_PRIMARY_CONTENT_CONFIRMED":
                raise ValueError("REVIEWED_ORIGINAL_VIDEO_NAME_TITLE_HOLD_NO_POSITIVE_CREDIT")
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
        transcript_proof={}
        if method=="TIMESTAMPED_TRANSCRIPT":
            transcript_proof=verify_timestamped_transcript_file(
                item,original[vid],source,transcript_evidence_dir)
        elif method=="VIDEO_PLAYBACK_MANUAL":
            transcript_proof=verify_manual_playback_file(
                item,original[vid],source,playback_evidence_dir)
        group=ranked[name]
        group["channels"].add(channel)
        group["videos"].add(vid)
        group["source_reviews"].append({"video_id":vid,"channel_id":channel,
            "reviewer":item["reviewer"],"reviewed_at":item["reviewed_at"],
            "content_segment":span,"evidence_method":method,**transcript_proof})
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
    p.add_argument("--transcript-evidence-dir",
        help="Directory containing the actual <original-video-id>.json UTF-8 caption artifacts; required for any confirmed TIMESTAMPED_TRANSCRIPT review")
    p.add_argument("--playback-evidence-dir",
        help="Directory containing actual <original-video-id>.json manual playback evidence receipts; required for positive VIDEO_PLAYBACK_MANUAL reviews")
    a=p.parse_args()
    load=lambda path:json.loads(Path(path).read_text(encoding="utf-8"))
    result=adjudicate(load(a.request),load(a.metadata),load(a.identities),load(a.decisions),
        transcript_evidence_dir=a.transcript_evidence_dir,
        playback_evidence_dir=a.playback_evidence_dir)
    Path(a.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k!="people"},ensure_ascii=False))


if __name__=="__main__":main()
