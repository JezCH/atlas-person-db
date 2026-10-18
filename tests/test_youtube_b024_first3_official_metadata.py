import copy
import hashlib
import importlib.util
import json
import os
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
MODULE=ROOT/"scripts/youtube-b024-first3-official-metadata.py"
spec=importlib.util.spec_from_file_location("youtube_three_official",MODULE)
runner=importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
REQ=runner.validated_request()
VIDEO_IDS=[r["video_id"] for r in REQ["videos"]]


def official_items(ids,*,channel_mismatch=False,omit=None):
    result=[]
    for row in REQ["videos"]:
        if row["video_id"] not in ids or row["video_id"]==omit:
            continue
        channel=("UC"+"Z"*22 if channel_mismatch and row["video_id"]==ids[1]
                 else row["original_channel_id"])
        result.append({"id":row["video_id"],"snippet":{
            "channelId":channel,"title":row["original_title"],
            "description":"Original Video ID official publisher snippet only — not actual video playback",
            "publishedAt":"2016-01-01T00:00:00Z"}})
    return {"items":result}


class ThreeBoundedOriginalVideoMetadataTest(unittest.TestCase):
    def test_offline_preflight_cannot_call_external_api_or_claim_channel_match(self):
        def nope(_):
            raise AssertionError("offline mode must not call network")
        result,meta=runner.execute(live_api_call=nope,fetch=False)
        self.assertIsNone(meta)
        self.assertEqual(result["original_video_ids"],VIDEO_IDS)
        self.assertEqual(result["original_channel_ids"],
                         [r["original_channel_id"] for r in REQ["videos"]])
        self.assertTrue(result["original_source_replay_verified"])
        self.assertEqual(result["official_youtube_api_calls"],0)
        self.assertEqual(result["current_channel_ids_verified"],0)
        self.assertEqual(result["actual_video_playback_or_transcript_certified"],0)
        self.assertFalse(result["publication_authorized"])

    def test_one_official_batch_exact_three_original_ids_no_content_credit(self):
        calls=[]
        def fake(ids):
            calls.append(list(ids))
            return official_items(ids)
        out,metadata=runner.execute(live_api_call=fake,fetch=True)
        self.assertEqual(calls,[VIDEO_IDS])
        self.assertEqual(out["official_youtube_videos_list_batches"],1)
        self.assertEqual(out["source_video_channel_id_matches"],3)
        self.assertEqual(out["source_video_channel_id_mismatches"],0)
        self.assertEqual(out["source_video_not_found_or_unavailable"],0)
        self.assertEqual(out["person_primary_content_certifications"],0)
        self.assertEqual(out["actual_video_playback_or_timestamped_transcript_reviews"],0)
        self.assertEqual(out["production_writes"],0)
        self.assertFalse(out["publication_authorized"])
        self.assertEqual(metadata["requested_original_video_ids"],3)
        for row in metadata["records"]:
            self.assertEqual(row["description_sha256"],
              hashlib.sha256(row["description"].encode()).hexdigest())
            self.assertFalse(row["person_video_content_verified"])

    def test_changed_channel_and_unavailable_video_keep_independent_holds(self):
        def api(ids):
            return official_items(ids,channel_mismatch=True,omit=ids[2])
        out,metadata=runner.execute(live_api_call=api,fetch=True)
        self.assertEqual(out["source_video_channel_id_matches"],1)
        self.assertEqual(out["source_video_channel_id_mismatches"],1)
        self.assertEqual(out["source_video_not_found_or_unavailable"],1)
        self.assertEqual(out["person_primary_content_certifications"],0)
        statuses={x["video_id"]:x["review_stage"] for x in out["records"]}
        self.assertEqual(statuses[VIDEO_IDS[0]],"MATCHED_ARCHIVED_CHANNEL")
        self.assertEqual(statuses[VIDEO_IDS[1]],"CHANNEL_MISMATCH_HOLD")
        self.assertEqual(statuses[VIDEO_IDS[2]],"NOT_FOUND_OR_UNAVAILABLE_HOLD")
        self.assertEqual(metadata["records"][2]["status"],"NOT_FOUND_OR_UNAVAILABLE")
        self.assertFalse(out["publication_authorized"])

    def test_duplicate_foreign_api_rows_refuse_and_never_approve(self):
        def bad_duplicate(ids):
            first=official_items(ids)
            first["items"].append(copy.deepcopy(first["items"][0]))
            return first
        with self.assertRaisesRegex(ValueError,"API_UNKNOWN_OR_DUPLICATE_VIDEO_ID"):
            runner.execute(live_api_call=bad_duplicate,fetch=True)
        def foreign(ids):
            wrong=official_items(ids)
            wrong["items"][0]["id"]="NOTINB02401"
            return wrong
        with self.assertRaisesRegex(ValueError,"API_UNKNOWN_OR_DUPLICATE_VIDEO_ID"):
            runner.execute(live_api_call=foreign,fetch=True)
        calls=[]
        def cannot_fetch(ids):
            calls.append(ids)
            raise RuntimeError("YOUTUBE_DATA_API_NETWORK_ERROR")
        with self.assertRaisesRegex(RuntimeError,"YOUTUBE_DATA_API_NETWORK_ERROR"):
            runner.execute(live_api_call=cannot_fetch,fetch=True)
        self.assertEqual(len(calls),1)

    def test_result_tampering_refused_before_any_manual_content_work(self):
        out,metadata=runner.execute(live_api_call=lambda ids:official_items(ids),fetch=True)
        changes=[
            (lambda m:m.update({"automatic_person_subject_approval":True}),
             "OFFICIAL_THREE_VIDEO_METADATA_PARITY_MISMATCH"),
            (lambda m:m.update({"fetched_metadata_rows":2}),
             "OFFICIAL_THREE_VIDEO_METADATA_PARITY_MISMATCH"),
            (lambda m:m["records"][0].update({"original_channel_id":"UC"+"Q"*22}),
             "OFFICIAL_VIDEO_METADATA_ORIGINAL_SOURCE_OR_DESCRIPTION_TAMPERED"),
            (lambda m:m["records"][0].update({"original_title":"An unrelated video"}),
             "OFFICIAL_VIDEO_METADATA_ORIGINAL_SOURCE_OR_DESCRIPTION_TAMPERED"),
            (lambda m:m["records"][0].update({"description":"tampered"}),
             "OFFICIAL_VIDEO_METADATA_ORIGINAL_SOURCE_OR_DESCRIPTION_TAMPERED"),
            (lambda m:m["records"][0].update({"status":"CHANNEL_MISMATCH"}),
             "OFFICIAL_VIDEO_METADATA_STATUS_INCONSISTENT"),
            (lambda m:m["records"][0].update({"person_video_content_verified":True}),
             "OFFICIAL_VIDEO_METADATA_ORIGINAL_SOURCE_OR_DESCRIPTION_TAMPERED"),
            (lambda m:m["records"][2].update({"video_id":"UNKNOWN0001"}),
             "OFFICIAL_THREE_VIDEO_METADATA_VIDEO_IDS_CHANGED")
        ]
        for change,expected in changes:
            item=copy.deepcopy(metadata)
            change(item)
            with self.subTest(error=expected,change=str(change)):
                with self.assertRaisesRegex(ValueError,expected):
                    runner.assess(REQ,item)
        unknown=copy.deepcopy(metadata)
        unknown["records"][0]["live_channel_id"]=None
        unknown["records"][0]["status"]="NOT_FOUND_OR_UNAVAILABLE"
        with self.assertRaisesRegex(ValueError,"OFFICIAL_UNAVAILABLE_VIDEO_HAS_PUBLISHER_DETAILS"):
            runner.assess(REQ,unknown)

    def test_fetch_requires_real_key_without_dependency_injection(self):
        with patch.dict(os.environ,{"YOUTUBE_DATA_API_KEY":""}):
            with self.assertRaisesRegex(ValueError,"YOUTUBE_DATA_API_KEY_MISSING_NO_EXTERNAL_QUERY_PERFORMED"):
                runner.execute(fetch=True)
        self.assertEqual(runner.EXPECTED_IDS,tuple(VIDEO_IDS))


if __name__=="__main__":
    unittest.main()
