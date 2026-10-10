import copy
import importlib.util
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read_module(filename,name):
    spec=importlib.util.spec_from_file_location(name,ROOT/"scripts"/filename)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

select=read_module("youtube-b024-select-first-biography-metadata-tranche.py","b024_first_tranche")
collector=read_module("youtube-source-video-description-enrich.py","b024_desc_batch_checkpoint")

class RealSourcePriorityAndResumableMetadataTest(unittest.TestCase):
    def source(self):
        originals=[
            ("V0000000001","UC"+"A"*22,
                "The Life of Emmett Till","Emmett Till","BIOGRAPHICAL_TITLE_CUE_REVIEW"),
            ("V0000000002","UC"+"B"*22,
                "What is Emmett Till's legacy?","Emmett Till","QUESTION_TOPIC_CUE_REVIEW"),
            ("V0000000003","UC"+"C"*22,
                "The Life of Carter G Woodson","Carter G Woodson","BIOGRAPHICAL_TITLE_CUE_REVIEW")
        ]
        return {
            "schema":"atlas-youtube-description-enrichment-request/v1",
            "source_zip_sha256":select.ORIGINAL_SHA256,
            "source_snapshot_id":select.ORIGINAL_SNAPSHOT,
            "source_channel_count":10127,
            "source_video_count":2230031,
            "reviewed_candidate_labels":245,
            "unique_original_video_ids":len(originals),
            "original_per_video_channel_id_verified":True,
            "publication_allowed":False,
            "source_review_json_sha256":"sourcereview",
            "videos":[{
                "video_id":v,"original_channel_id":c,"original_title":t,
                "name_cues":[{"raw_name":n,"bucket":b}]
            } for v,c,t,n,b in originals]
        }

    def test_prioritize_actual_historical_biography_title_cues_only(self):
        out=select.select(self.source(),enforce_original_counts=False)
        self.assertEqual(out["unique_original_video_ids"],2)
        self.assertEqual(out["reviewed_historical_person_identities"],2)
        self.assertEqual({v["video_id"] for v in out["videos"]},
                         {"V0000000001","V0000000003"})
        self.assertEqual(out["metadata_fetch_batches_at_50"],1)
        self.assertFalse(out["production_publication_allowed"])
        self.assertTrue(all(not v["content_focus_confirmed"] for v in out["videos"]))

    def large_source(self):
        return {
            "schema":"atlas-youtube-description-enrichment-request/v1",
            "source_snapshot_id":"test-snap","source_zip_sha256":"trusted-archive",
            "source_review_json_sha256":"trusted-review",
            "unique_original_video_ids":60,
            "original_per_video_channel_id_verified":True,
            "videos":[{"video_id":f"{i:011d}",
                "original_channel_id":"UC"+f"{i:022d}",
                "original_title":f"Life of test Person {i}",
                "name_cues":[]} for i in range(60)]
        }

    def test_checkpoint_every_successful_batch_and_resumption(self):
        request=self.large_source()
        by_video={v["video_id"]:v for v in request["videos"]}
        checkpoints=[]
        calls=[]
        def flaky(ids):
            calls.append(len(ids))
            if len(calls)==2:raise RuntimeError("YOUTUBE_DATA_API_HTTP_503")
            return {"items":[{
                "id":id,"snippet":{
                    "channelId":by_video[id]["original_channel_id"],
                    "title":by_video[id]["original_title"],
                    "description":"Review-only person related snippet"}}
                for id in ids]}
        with self.assertRaisesRegex(RuntimeError,"HTTP_503"):
            collector.fetch_descriptions(request,api_call=flaky,max_batches=2,
                 on_batch=lambda x:checkpoints.append(copy.deepcopy(x)))
        self.assertEqual(calls,[50,10])
        self.assertEqual(len(checkpoints),1)
        self.assertEqual(checkpoints[0]["fetched_metadata_rows"],50)
        self.assertEqual(checkpoints[0]["not_yet_fetched"],10)
        def remaining(ids):
            self.assertEqual(len(ids),10)
            return {"items":[{"id":vid,"snippet":{
                "channelId":by_video[vid]["original_channel_id"],
                "description":"Person named in description"}} for vid in ids]}
        final=collector.fetch_descriptions(request,api_call=remaining,
                                         prior=checkpoints[0],max_batches=1)
        self.assertEqual(final["fetched_metadata_rows"],60)
        self.assertEqual(final["not_yet_fetched"],0)
        self.assertFalse(final["automatic_person_subject_approval"])
        self.assertTrue(all(x["person_video_content_verified"] is False
                            for x in final["records"]))

    def test_resume_rejects_changed_original_and_forged_person_credit(self):
        request=self.large_source()
        checkpoint=collector.fetch_descriptions(request,
            api_call=lambda ids:{"items":[{"id":vid,"snippet":{
                "channelId":request["videos"][int(vid)]["original_channel_id"],
                "description":"An unverified historical description"}} for vid in ids]},
            max_batches=1)
        for mutated in [
            ("source_zip_sha256","other"),
            ("requested_original_video_ids",999),
            ("automatic_person_subject_approval",True),
        ]:
            bad=copy.deepcopy(checkpoint)
            bad[mutated[0]]=mutated[1]
            with self.subTest(field=mutated[0]):
                with self.assertRaisesRegex(ValueError,"PREVIOUS_RESULT_SOURCE_MISMATCH"):
                    collector.fetch_descriptions(request,prior=bad,api_call=lambda ids:{})
        for field,value in [
            ("original_channel_id","UC"+"Z"*22),
            ("original_title","Corrupted original title"),
            ("description","Tampered description"),
            ("status","DESCRIPTION_EMPTY"),
            ("person_video_content_verified",True),
        ]:
            bad=copy.deepcopy(checkpoint)
            bad["records"][0][field]=value
            with self.subTest(record_field=field):
                with self.assertRaisesRegex(ValueError,"PREVIOUS_VIDEO_METADATA_"):
                    collector.fetch_descriptions(request,prior=bad,api_call=lambda ids:{})

    def test_reject_wrong_person_lexicon_source_and_overlap(self):
        v=self.source()
        v["videos"].append(copy.deepcopy(v["videos"][0]))
        with self.assertRaisesRegex(ValueError,"DUPLICATE_SOURCE_VIDEO"):
            select.select(v,enforce_original_counts=False)

if __name__=="__main__":
    unittest.main()
