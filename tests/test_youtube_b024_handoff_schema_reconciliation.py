import copy
import gzip
import hashlib
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/"scripts"/"youtube-b024-reconcile-original-video-handoff.py"
spec=importlib.util.spec_from_file_location("original_video_reconcile",PATH)
bridge=importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)
COLLECTOR=bridge.collector

UC1="UC"+"A"*22
UC2="UC"+"B"*22
VID1="AbCdEfGhI12"
VID2="MnOpQrStU34"

class HistoricalVideoHandoffBridgeTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.archive=Path(self.temp.name)/"archive.zip"
        with zipfile.ZipFile(self.archive,"w") as z:
            for channel,video,title in [
                (UC1,VID1,"The Life of Emmett Till"),
                (UC2,VID2,"Emmett Till: A Biography"),
            ]:
                line=json.dumps({"video_id":video,"channel_id":channel,"title":title})+"\n"
                z.writestr("batch024/videos/"+channel+".ndjson.gz",gzip.compress(line.encode()))
        self.source_sha=hashlib.sha256(self.archive.read_bytes()).hexdigest()
        self.original_default_sha=COLLECTOR.SOURCE_ZIP_SHA
        COLLECTOR.SOURCE_ZIP_SHA=self.source_sha
        self.addCleanup(lambda:setattr(COLLECTOR,"SOURCE_ZIP_SHA",self.original_default_sha))
        raw=[{"raw_name":f"Other Raw Name {i}","title_evidence_buckets":{}}
             for i in range(244)]
        raw.insert(0,{"raw_name":"Emmett Till","title_evidence_buckets":{
            "BIOGRAPHICAL_TITLE_CUE_REVIEW":{
                "channel_ids":[UC1,UC2],
                "video_ids":[VID1,VID2],"samples":[]
            }}})
        self.evidence={"schema":COLLECTOR.SOURCE_SCHEMA,
            "source_sha256":self.source_sha,"source_snapshot_id":"test",
            "source_channels":2,"source_videos":2,
            "unreviewed_labels_examined":245,"rows":raw}
        self.review_sha="a"*64
        canonical=COLLECTOR.prepare(self.evidence,source_digest=self.review_sha,source_zip=self.archive)
        self.legacy={
            "schema":bridge.LEGACY_SCHEMA,
            "source_channel_binding":bridge.EXPECTED_BINDING,
            "publisher_allowed":False,
            "source_review_evidence_sha256":self.review_sha,
            "source_archive_sha256":self.source_sha,
            "original_channel_count":2,
            "original_video_count":2,
            "candidate_labels":245,
            "source_snapshot_id":"test",
            "requested_unique_video_ids":2,
            "videos":[{
                "video_id":v["video_id"],
                "original_channel_id":v["original_channel_id"],
                "original_title":v["original_title"],
                "raw_name_evidence":[{
                    "raw_name":c["raw_name"],"title_cue_bucket":c["bucket"]
                } for c in v["name_cues"]]
            } for v in canonical["videos"]]
        }

    def run_bridge(self,legacy=None):
        return bridge.reconcile(legacy or self.legacy,self.evidence,self.archive,
            evidence_sha256=self.review_sha,legacy_sha256="b"*64)

    def test_legacy_handoff_real_source_videos_become_current_collector_request(self):
        actual=self.run_bridge()
        self.assertEqual(actual["schema"],"atlas-youtube-description-enrichment-request/v1")
        self.assertTrue(actual["original_per_video_channel_id_verified"])
        self.assertTrue(actual["legacy_per_video_source_id_and_cues_equal"])
        self.assertEqual(actual["unique_original_video_ids"],2)
        self.assertFalse(actual["publication_allowed"])
        self.assertEqual({v["original_channel_id"] for v in actual["videos"]},{UC1,UC2})
        # The reconciled artifact MUST be directly accepted by the actual
        # current collector without fetching or inventing real video content.
        channels={v["video_id"]:v["original_channel_id"] for v in actual["videos"]}
        def mock_official_snippets(ids):
            return {"items":[{"id":vid,"snippet":{
                "channelId":channels[vid],"title":"Updated title",
                "description":"Historical content under review", "publishedAt":"2021-01-01T00:00:00Z"
            }} for vid in ids]}
        metadata=COLLECTOR.fetch_descriptions(actual,api_call=mock_official_snippets,max_batches=1)
        self.assertEqual(metadata["fetched_metadata_rows"],2)
        self.assertEqual(metadata["not_yet_fetched"],0)
        self.assertFalse(metadata["automatic_person_subject_approval"])
        resumed=COLLECTOR.fetch_descriptions(actual,api_call=mock_official_snippets,prior=metadata)
        self.assertEqual(resumed["fetched_metadata_rows"],2)

    def test_reject_tampered_video_id_channel_title_or_raw_name(self):
        for mode in ("video_id","original_channel_id","original_title","name"):
            bad=copy.deepcopy(self.legacy)
            record=bad["videos"][0]
            if mode=="video_id":record["video_id"]="ZZZZZZZZZZZ"
            if mode=="original_channel_id":record["original_channel_id"]=UC2
            if mode=="original_title":record["original_title"]="Edited title"
            if mode=="name":record["raw_name_evidence"][0]["raw_name"]="Fake Person"
            with self.subTest(mode=mode):
                with self.assertRaisesRegex(ValueError,"HANDOFF_ORIGINAL_VIDEO_IDS|HANDOFF_ORIGINAL_CHANNEL_OR_TITLE|HANDOFF_NAME_AND_TITLE"):
                    self.run_bridge(bad)

    def test_review_digest_corpus_digest_and_channel_provenance_fail_closed(self):
        for key,val,expected in [
            ("source_review_evidence_sha256","wrong","HANDOFF_REVIEW_FILE_DIGEST"),
            ("source_archive_sha256","0"*64,"HANDOFF_IMMUTABLE_SOURCE"),
            ("requested_unique_video_ids",3,"HANDOFF_VIDEO_ID_POPULATION"),
            ("source_channel_binding","unverified","HANDOFF_PROVENANCE"),
        ]:
            bad=copy.deepcopy(self.legacy)
            bad[key]=val
            with self.subTest(key=key):
                with self.assertRaisesRegex(ValueError,expected):
                    self.run_bridge(bad)

if __name__=="__main__":unittest.main()
