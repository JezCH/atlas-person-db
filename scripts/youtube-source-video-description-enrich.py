#!/usr/bin/env python3
"""Read-only original YouTube-ID → official snippet.description enrichment.

Source candidate names are discovered WITHOUT the atlas_v2 Person registry.
Description text is REVIEW EVIDENCE, NOT proof that the video concerns a Person.
No Person rank is updated by this script.
"""
import argparse
import gzip
import hashlib
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

SOURCE_SCHEMA="youtube-b024-unreviewed245-title-evidence/v1"
SOURCE_ZIP_SHA="8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946"
VIDEO_ID=re.compile(r"^[A-Za-z0-9_-]{11}$")
CHANNEL_ID=re.compile(r"^UC[A-Za-z0-9_-]{22}$")


def sha256(path):
    with open(path,"rb") as f:
        return hashlib.file_digest(f,"sha256").hexdigest()


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write(path,value):
    dest=Path(path)
    dest.parent.mkdir(parents=True,exist_ok=True)
    tmp=Path(str(dest)+".tmp")
    tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    tmp.replace(dest)


def prepare(source,*,source_digest,source_zip,verify_source_sha=True):
    if source.get("schema")!=SOURCE_SCHEMA or len(source.get("rows",[]))!=245 or source.get("unreviewed_labels_examined")!=245:
        raise ValueError("EXACT_SOURCE_REVIEW_POPULATION_REQUIRED")
    if source.get("source_sha256")!=SOURCE_ZIP_SHA:
        raise ValueError("SOURCE_ORIGINAL_ZIP_HASH_REFERENCE_MISMATCH")
    if verify_source_sha and sha256(source_zip)!=SOURCE_ZIP_SHA:
        raise ValueError("ORIGINAL_ZIP_SHA256_MISMATCH")
    original={}
    for person in source["rows"]:
        for kind,ids in person["title_evidence_buckets"].items():
            for video in ids["video_ids"]:
                if not VIDEO_ID.fullmatch(video):
                    raise ValueError("INVALID_ORIGINAL_VIDEO_ID")
                row=original.setdefault(video,{"video_id":video,"original_channel_id":None,"original_title":None,
                    "name_cues":[],"channel_set":set()})
                row["name_cues"].append({"raw_name":person["raw_name"],"bucket":kind})
                row["channel_set"].update(ids["channel_ids"])
    source_channels=set()
    source_videos=0
    found=set()
    with zipfile.ZipFile(source_zip) as archive:
        for filename in sorted(f for f in archive.namelist() if f.endswith(".ndjson.gz")):
            channel=Path(filename).name.removesuffix(".ndjson.gz")
            if not CHANNEL_ID.fullmatch(channel) or channel in source_channels:
                raise ValueError("ORIGINAL_CHANNEL_ID_DUPLICATE_OR_INVALID")
            source_channels.add(channel)
            with gzip.open(archive.open(filename),"rt",encoding="utf-8") as stream:
                for line in stream:
                    source_videos+=1
                    item=json.loads(line)
                    video=item.get("video_id")
                    if video not in original:continue
                    if video in found:raise ValueError("DUPLICATE_ORIGINAL_VIDEO_ID")
                    if item.get("channel_id")!=channel or channel not in original[video]["channel_set"]:
                        raise ValueError("ORIGINAL_VIDEO_CHANNEL_ID_MISMATCH")
                    row=original[video]
                    row["original_channel_id"]=channel
                    row["original_title"]=str(item.get("title") or "")
                    found.add(video)
    if len(source_channels)!=source["source_channels"] or source_videos!=source["source_videos"] or found!=set(original):
        raise ValueError("WHOLE_ORIGINAL_SOURCE_ID_PARITY_MISMATCH")
    for row in original.values():
        del row["channel_set"]
        row["name_cues"].sort(key=lambda r:(r["raw_name"],r["bucket"]))
    return {
        "schema":"atlas-youtube-description-enrichment-request/v1",
        "source_snapshot_id":source["source_snapshot_id"],
        "source_zip_sha256":SOURCE_ZIP_SHA,
        "source_review_json_sha256":source_digest,
        "source_channel_count":len(source_channels),
        "source_video_count":source_videos,
        "reviewed_candidate_labels":245,
        "unique_original_video_ids":len(original),
        "original_per_video_channel_id_verified":True,
        "source_name_generation_independent_of_registered_persons":True,
        "publication_allowed":False,
        "videos":[original[k] for k in sorted(original)]
    }


def youtube_batch_api(api_key):
    if not api_key:
        raise ValueError("YOUTUBE_DATA_API_KEY_MISSING_METADATA_NOT_COLLECTED")
    def fetch(ids):
        if not 1<=len(ids)<=50:raise ValueError("API_BATCH_TOO_LARGE")
        query=urllib.parse.urlencode({"part":"snippet","id":",".join(ids),"key":api_key,
            "fields":"items(id,snippet(channelId,title,description,publishedAt))"})
        request=urllib.request.Request("https://www.googleapis.com/youtube/v3/videos?"+query)
        try:
            with urllib.request.urlopen(request,timeout=30) as reply:return json.load(reply)
        except urllib.error.HTTPError as e:
            raise RuntimeError("YOUTUBE_DATA_API_HTTP_"+str(e.code)) from None
        except urllib.error.URLError:
            raise RuntimeError("YOUTUBE_DATA_API_NETWORK_ERROR") from None
    return fetch


def fetch_descriptions(request,*,api_call,prior=None,max_batches=30,on_batch=None):
    if request.get("schema")!="atlas-youtube-description-enrichment-request/v1" or not request.get("original_per_video_channel_id_verified"):
        raise ValueError("UNVERIFIED_ORIGINAL_VIDEO_SOURCE_REQUEST")
    if max_batches<1 or max_batches>500:raise ValueError("UNSAFE_API_BATCH_LIMIT")
    previous={}
    if prior:
        if (prior.get("request_source_json_sha256")!=request["source_review_json_sha256"] or
            prior.get("source_snapshot_id")!=request["source_snapshot_id"] or
            prior.get("source_zip_sha256")!=request["source_zip_sha256"] or
            prior.get("requested_original_video_ids")!=request["unique_original_video_ids"] or
            prior.get("schema")!="atlas-youtube-description-enrichment-result/v1" or
            prior.get("automatic_person_subject_approval") is not False):
            raise ValueError("PREVIOUS_RESULT_SOURCE_MISMATCH")
        previous={r["video_id"]:r for r in prior["records"]}
        if len(previous)!=len(prior["records"]):raise ValueError("DUPLICATE_PREVIOUS_METADATA_VIDEO_ID")
    sources={r["video_id"]:r for r in request["videos"]}
    if len(sources)!=request["unique_original_video_ids"] or set(previous)-set(sources):
        raise ValueError("SOURCE_VIDEO_ID_POPULATION_MISMATCH")
    for vid, old in previous.items():
        source=sources[vid]
        if (old.get("original_channel_id")!=source["original_channel_id"] or
            old.get("original_title")!=source["original_title"] or
            old.get("person_video_content_verified") is not False or
            old.get("description_sha256")!=hashlib.sha256(
                (old.get("description") or "").encode("utf-8")).hexdigest() or
            old.get("status") not in ("NOT_FOUND_OR_UNAVAILABLE","CHANNEL_MISMATCH",
                                     "DESCRIPTION_PRESENT","DESCRIPTION_EMPTY")):
            raise ValueError("PREVIOUS_VIDEO_METADATA_TAMPER_OR_SOURCE_MISMATCH")
        status=("NOT_FOUND_OR_UNAVAILABLE" if old.get("live_channel_id") is None else
            "CHANNEL_MISMATCH" if old.get("live_channel_id")!=old["original_channel_id"] else
            "DESCRIPTION_PRESENT" if (old.get("description") or "").strip() else "DESCRIPTION_EMPTY")
        if old["status"]!=status:
            raise ValueError("PREVIOUS_VIDEO_METADATA_STATUS_INCONSISTENT")
    def make_result():
        return {
            "schema":"atlas-youtube-description-enrichment-result/v1",
            "source_snapshot_id":request["source_snapshot_id"],
            "source_zip_sha256":request["source_zip_sha256"],
            "request_source_json_sha256":request["source_review_json_sha256"],
            "requested_original_video_ids":len(sources),
            "fetched_metadata_rows":len(previous),
            "not_yet_fetched":len(sources)-len(previous),
            "automatic_person_subject_approval":False,
            "records":[previous[k] for k in sorted(previous)]
        }
    todo=[v for v in request["videos"] if v["video_id"] not in previous]
    for index in range(0,min(len(todo),max_batches*50),50):
        batch=todo[index:index+50]
        result=api_call([v["video_id"] for v in batch])
        allowed={v["video_id"] for v in batch}
        items={}
        incoming=result.get("items",[])
        seen=set()
        # Check complete ID set BEFORE optional snippet validation so a
        # duplicate video ID cannot be hidden behind a malformed snippet.
        for obj in incoming:
            video=obj.get("id")
            if video not in allowed or video in seen:
                raise ValueError("API_UNKNOWN_OR_DUPLICATE_VIDEO_ID")
            seen.add(video)
        for obj in incoming:
            video=obj["id"]
            snippet=obj.get("snippet")
            if not isinstance(snippet,dict) or not snippet.get("channelId"):
                raise ValueError("API_ITEM_MISSING_REQUIRED_CHANNEL_ID")
            items[video]=snippet
        for source in batch:
            vid=source["video_id"]
            info=items.get(vid)
            channel=info.get("channelId") if info is not None else None
            description=info.get("description") if info is not None else None
            status=("NOT_FOUND_OR_UNAVAILABLE" if info is None else
                "CHANNEL_MISMATCH" if channel!=source["original_channel_id"] else
                "DESCRIPTION_PRESENT" if (description or "").strip() else "DESCRIPTION_EMPTY")
            previous[vid]={
                "video_id":vid,"original_channel_id":source["original_channel_id"],
                "original_title":source["original_title"],
                "live_channel_id":channel,
                "live_title":info.get("title") if info is not None else None,
                "published_at":info.get("publishedAt") if info is not None else None,
                "description":description,
                "description_sha256":hashlib.sha256((description or "").encode()).hexdigest(),
                "status":status,"person_video_content_verified":False}
        if on_batch is not None:
            on_batch(make_result())
    return make_result()


def main():
    p=argparse.ArgumentParser(description=__doc__)
    cmd=p.add_subparsers(dest="cmd",required=True)
    prepare_parser=cmd.add_parser("prepare")
    prepare_parser.add_argument("--source-evidence",required=True)
    prepare_parser.add_argument("--source-zip",required=True)
    prepare_parser.add_argument("--output",required=True)
    fetch_parser=cmd.add_parser("fetch")
    fetch_parser.add_argument("--request",required=True)
    fetch_parser.add_argument("--output",required=True)
    fetch_parser.add_argument("--previous")
    fetch_parser.add_argument("--max-batches",type=int,default=30)
    args=p.parse_args()
    if args.cmd=="prepare":
        output=prepare(read(args.source_evidence),
            source_digest=sha256(args.source_evidence),source_zip=args.source_zip)
    else:
        # Atomically persist each successful official API batch before the next
        # network request: an intermittent failure cannot erase past progress.
        output=fetch_descriptions(read(args.request),
            api_call=youtube_batch_api(os.environ.get("YOUTUBE_DATA_API_KEY")),
            prior=read(args.previous) if args.previous else None,
            max_batches=args.max_batches,
            on_batch=lambda partial:write(args.output,partial))
    write(args.output,output)
    print(json.dumps({k:v for k,v in output.items() if k not in ("videos","records")},ensure_ascii=False))


if __name__=="__main__":main()
