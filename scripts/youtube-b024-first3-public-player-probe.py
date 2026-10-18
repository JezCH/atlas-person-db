#!/usr/bin/env python3
"""Bounded NO-KEY public YouTube player metadata probe for THREE original B024 IDs.

This is a source-availability probe, NOT YouTube Data API videos.list, a
downloaded caption, a viewed video, or PERSON_PRIMARY_CONTENT_CONFIRMED.
It intentionally outputs no signed subtitle URLs, cookies, player tokens or
raw yt-dlp metadata. All failures HOLD (not proof the videos were deleted).
"""
import argparse
import datetime as dt
import hashlib
import importlib.util
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE_RUNNER=ROOT/"scripts/youtube-b024-first3-official-metadata.py"
EXPECTED_IDS=("-13y_Jm-pzI","-1CalygxBrM","-5Lg5mk74NA")
VIDEO=re.compile(r"^[A-Za-z0-9_-]{11}$")
CHANNEL=re.compile(r"^UC[A-Za-z0-9_-]{22}$")
SCHEMA="atlas-youtube-b024-three-original-public-player-probe/v1"


def verified_request():
    """Reuse #2513 source ZIP/12-video replay, never a public-search name."""
    spec=importlib.util.spec_from_file_location("atlas_youtube_first3_source",SOURCE_RUNNER)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    request=module.validated_request()
    if tuple(row["video_id"] for row in request["videos"])!=EXPECTED_IDS:
        raise ValueError("PUBLIC_PLAYER_UNEXPECTED_ORIGINAL_VIDEO_IDS")
    return request


def public_player_extract(video_id):
    # yt-dlp is ALREADY used by the ATLAS B024 collection workflow.
    # No YouTube Data API quota/key, no cookies, no full video or caption media.
    import yt_dlp
    opts={"quiet":True,"no_warnings":True,"skip_download":True,
          "noplaylist":True,"ignoreerrors":False,"socket_timeout":12,
          "retries":0,"extractor_retries":0,"cachedir":False,
          "simulate":True,"noprogress":True}
    with yt_dlp.YoutubeDL(opts) as downloader:
        return downloader.extract_info(
            f"https://www.youtube.com/watch?v={video_id}",download=False)


def tracks(info,key):
    """Track LANGUAGE metadata only; never report expiring player URLs."""
    raw=info.get(key) or {}
    if not isinstance(raw,dict):
        return {"count":0,"languages":[]}
    langs=sorted(k for k,v in raw.items()
                 if isinstance(k,str) and isinstance(v,list) and v
                 and re.fullmatch(r"[A-Za-z0-9_-]{2,24}",k))
    return {"count":len(langs),"languages":langs[:20]}


def assess(request,extract=None,*,captured_at="2026-10-18T00:00:00Z"):
    """Synthetic fake extractor is allowed for TESTING only, not content credit."""
    # Only the replay-validated immutable #2513 original-ID request is admissible.
    # A caller must never redefine an archived title/channel and then compare
    # a public player against their own forged before-state.
    if request!=verified_request():
        raise ValueError("PUBLIC_PLAYER_SOURCE_THREE_ORIGINAL_BINDINGS_INVALID")
    rows=request.get("videos")
    if (request.get("schema")!="atlas-youtube-description-enrichment-request/v1"
        or request.get("publication_allowed") is not False
        or request.get("original_per_video_channel_id_verified") is not True
        or not isinstance(rows,list) or len(rows)!=3
        or tuple(r.get("video_id") for r in rows)!=EXPECTED_IDS
        or len({r["original_channel_id"] for r in rows})!=3
        or not all(CHANNEL.fullmatch(r["original_channel_id"]) for r in rows)):
        raise ValueError("PUBLIC_PLAYER_SOURCE_THREE_ORIGINAL_BINDINGS_INVALID")
    if extract is not None:
        parsed=dt.datetime.fromisoformat(str(captured_at).replace("Z","+00:00"))
        if parsed.tzinfo is None:
            raise ValueError("PUBLIC_PLAYER_CAPTURE_TIME_NOT_TIMEZONE_AWARE")
    output=[]
    for row in rows:
        video=row["video_id"]
        item={"video_id":video,
              "original_channel_id":row["original_channel_id"],
              "original_title":row["original_title"],
              "source_url":f"https://www.youtube.com/watch?v={video}",
              "current_player_channel_id":None,
              "current_player_title":None,
              "player_subtitle_tracks":{"count":0,"languages":[]},
              "player_automatic_caption_tracks":{"count":0,"languages":[]},
              "public_player_status":"NOT_PROBED",
              "metadata_method":"UNVERIFIED_PUBLIC_PLAYER_NOT_OFFICIAL_API",
              "actually_watched_or_transcript_bytes_acquired":False,
              "person_primary_content_certified":False}
        if extract is not None:
            try:
                metadata=extract(video)
            except Exception:
                item["public_player_status"]="PUBLIC_PLAYER_REQUEST_FAILED_HOLD"
            else:
                if not isinstance(metadata,dict):
                    item["public_player_status"]="PUBLIC_PLAYER_UNUSABLE_RESPONSE_HOLD"
                elif metadata.get("id")!=video:
                    item["public_player_status"]="PUBLIC_PLAYER_VIDEO_ID_MISMATCH_HOLD"
                elif (metadata.get("extractor_key")!="Youtube"
                      or metadata.get("webpage_url")!=item["source_url"]):
                    item["public_player_status"]="PUBLIC_PLAYER_ORIGIN_UNVERIFIED_HOLD"
                else:
                    channel=metadata.get("channel_id")
                    item["current_player_channel_id"]=channel if isinstance(channel,str) and CHANNEL.fullmatch(channel) else None
                    title=metadata.get("title")
                    item["current_player_title"]=title[:400] if isinstance(title,str) else None
                    item["player_subtitle_tracks"]=tracks(metadata,"subtitles")
                    item["player_automatic_caption_tracks"]=tracks(metadata,"automatic_captions")
                    item["public_player_status"]=(
                        "PUBLIC_PLAYER_CHANNEL_MATCH_NOT_OFFICIAL"
                        if item["current_player_channel_id"]==row["original_channel_id"]
                        else "PUBLIC_PLAYER_CHANNEL_MISMATCH_OR_UNKNOWN_HOLD")
        output.append(item)
    matched=sum(r["public_player_status"]=="PUBLIC_PLAYER_CHANNEL_MATCH_NOT_OFFICIAL" for r in output)
    blocked=sum(r["public_player_status"].endswith("_HOLD") for r in output)
    return {"schema":SCHEMA,
            "source_snapshot_id":request["source_snapshot_id"],
            "source_zip_sha256":request["source_zip_sha256"],
            "source_original_video_count":len(rows),
            "no_youtube_data_api_calls":True,
            "public_player_queries_attempted":len(rows) if extract else 0,
            "public_player_channel_matches_not_official":matched,
            "public_player_hold_count":blocked,
            "captured_at":captured_at if extract else None,
            "original_video_watched_or_transcript_bytes_verified":0,
            "person_primary_content_certifications":0,
            "last_registered_person_exclusion_completed":False,
            "production_writes":0,"publication_authorized":False,
            "records":output}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch-public-player",action="store_true",
                        help="Explicitly query only the exact three original public YouTube watch URLs; NO API key")
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    timestamp=dt.datetime.now(dt.timezone.utc).isoformat()
    result=assess(verified_request(),
                  extract=public_player_extract if args.fetch_public_player else None,
                  captured_at=timestamp)
    path=Path(args.output)
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"schema":SCHEMA,"public_queries":result["public_player_queries_attempted"],
                      "channel_matches_not_official":result["public_player_channel_matches_not_official"],
                      "holds":result["public_player_hold_count"],
                      "video_content_certifications":0,"production_writes":0},ensure_ascii=False))


if __name__=="__main__":
    main()
