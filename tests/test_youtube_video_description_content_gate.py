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

def import_script(path,name):
    spec=importlib.util.spec_from_file_location(name,ROOT/"scripts"/path)
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

enrich=import_script("youtube-source-video-description-enrich.py","youtube_description_enrich")
gate=import_script("youtube-source-video-content-evidence-gate.py","youtube_content_gate")
VID1="AbCdEfGhI12"
VID2="MnOpQrStU34"
UC1="UC"+"A"*22
UC2="UC"+"B"*22


class MetadataEvidenceTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.source=Path(self.tmp.name)/"original.zip"
        originals=[
            (UC1,VID1,"The Life of Emmett Till"),
            (UC2,VID2,"The Story of Emmett Till")
        ]
        with zipfile.ZipFile(self.source,"w") as archive:
            for ch,vid,title in originals:
                raw=json.dumps({"video_id":vid,"channel_id":ch,"title":title})+"\n"
                archive.writestr(f"batch024/videos/{ch}.ndjson.gz",gzip.compress(raw.encode()))
        rows=[{"raw_name":f"Unreviewed Other Name {i}","title_evidence_buckets":{}}
              for i in range(244)]
        rows.insert(0,{"raw_name":"Emmett Till","title_evidence_buckets":{
            "BIOGRAPHICAL_TITLE_CUE_REVIEW":{
                "video_ids":[VID1,VID2],"channel_ids":[UC1,UC2],
                "samples":[{"video_id":VID1,"channel_id":UC1,"title":"The Life of Emmett Till"}]
            }
        }})
        self.original_source={"schema":enrich.SOURCE_SCHEMA,
            "source_sha256":enrich.SOURCE_ZIP_SHA,"source_snapshot_id":"test-source",
            "source_channels":2,"source_videos":2,
            "unreviewed_labels_examined":245,"rows":rows}
        self.req=enrich.prepare(self.original_source,source_digest="digest-from-source-review",
                                source_zip=self.source,verify_source_sha=False)
        self.assertEqual(self.req["unique_original_video_ids"],2)
        self.assertTrue(self.req["original_per_video_channel_id_verified"])

    def api(self,ids):
        lookup={r["video_id"]:r for r in self.req["videos"]}
        return {"items":[{"id":vid,"snippet":{
            "channelId":lookup[vid]["original_channel_id"],
            "title":lookup[vid]["original_title"],
            "description":"Biographical source notes about the individual.",
            "publishedAt":"2021-01-01T00:00:00Z"
        }} for vid in ids]}

    def test_original_individual_channel_binding_no_positional_zip(self):
        req=self.req
        self.assertEqual({r["original_channel_id"] for r in req["videos"]},{UC1,UC2})
        self.assertEqual({r["video_id"] for r in req["videos"]},{VID1,VID2})
        wrong=copy.deepcopy(self.original_source)
        wrong["rows"][0]["title_evidence_buckets"]["BIOGRAPHICAL_TITLE_CUE_REVIEW"]["channel_ids"]=[UC1]
        with self.assertRaisesRegex(ValueError,"ORIGINAL_VIDEO_CHANNEL_ID_MISMATCH"):
            enrich.prepare(wrong,source_digest="a",source_zip=self.source,verify_source_sha=False)

    def test_mock_official_snippet_no_auto_credit_and_resume(self):
        m=enrich.fetch_descriptions(self.req,api_call=self.api,max_batches=1)
        self.assertEqual(m["fetched_metadata_rows"],2)
        self.assertEqual(m["not_yet_fetched"],0)
        self.assertFalse(m["automatic_person_subject_approval"])
        self.assertTrue(all(r["person_video_content_verified"] is False for r in m["records"]))
        resumed=enrich.fetch_descriptions(self.req,api_call=self.api,prior=m)
        self.assertEqual(resumed["fetched_metadata_rows"],2)
        self.assertEqual(enrich.fetch_descriptions(self.req,api_call=lambda ids:{"items":[]})["records"][0]["status"],
                         "NOT_FOUND_OR_UNAVAILABLE")
        with self.assertRaisesRegex(ValueError,"API_UNKNOWN_OR_DUPLICATE_VIDEO_ID"):
            enrich.fetch_descriptions(self.req,api_call=lambda ids:{"items":[{"id":ids[0]},{"id":ids[0]}]})
        with self.assertRaisesRegex(ValueError,"YOUTUBE_DATA_API_KEY_MISSING"):
            enrich.youtube_batch_api(None)

    def decisions(self):
        return {"schema":"atlas-youtube-person-content-review-decisions/v1",
                "source_snapshot_id":"test-source",
                "decisions":[{
                    "video_id":VID1,"raw_name":"Emmett Till",
                    "identity_for_review":"Emmett Till",
                    "verdict":"PERSON_PRIMARY_CONTENT_CONFIRMED",
                    "evidence_method":"VIDEO_PLAYBACK_MANUAL",
                    "source_url":"https://www.youtube.com/watch?v="+VID1,
                    "reviewer":"human reviewer",
                    "reviewed_at":"2026-10-10T00:00:00Z",
                    "reason":"Observed video segment principally explaining this historical person's life.",
                    "content_segment":{"start_seconds":30,"end_seconds":60}
                }]}
    def identities(self):
        return {"schema":"youtube-b024-source-first-last-registry-screen-36/v1",
                "source_sha256":enrich.SOURCE_ZIP_SHA,
                "source_snapshot_id":"test-source",
                "source_historical_unmatched_identity_groups":{"Emmett Till":["Emmett Till"]}}

    def test_content_focus_credit_requires_playback_or_transcript_not_description(self):
        metadata=enrich.fetch_descriptions(self.req,api_call=self.api)
        decisions=self.decisions()
        result=gate.adjudicate(self.req,metadata,self.identities(),decisions)
        self.assertEqual(result["person_centered_video_ids_verified"],1)
        self.assertEqual(result["people"][0]["distinct_content_verified_channels"],1)
        self.assertFalse(result["registered_person_exclusion_completed"])
        self.assertFalse(result["production_ranking_publishable"])
        title_only=copy.deepcopy(decisions)
        title_only["decisions"][0]["evidence_method"]="DESCRIPTION_ONLY"
        with self.assertRaisesRegex(ValueError,"TITLE_OR_DESCRIPTION_CANNOT_PROVE_CONTENT_SUBJECT"):
            gate.adjudicate(self.req,metadata,self.identities(),title_only)
        bad=copy.deepcopy(decisions)
        bad["decisions"][0]["content_segment"]={"start_seconds":2,"end_seconds":6}
        with self.assertRaisesRegex(ValueError,"TIMESTAMPED_VIDEO_CONTENT_EVIDENCE_REQUIRED"):
            gate.adjudicate(self.req,metadata,self.identities(),bad)
        bad=copy.deepcopy(decisions)
        bad["decisions"].append(copy.deepcopy(bad["decisions"][0]))
        with self.assertRaisesRegex(ValueError,"DUPLICATE_OR_UNSOURCED"):
            gate.adjudicate(self.req,metadata,self.identities(),bad)
        mismatched=copy.deepcopy(metadata)
        mismatched["records"][0]["status"]="CHANNEL_MISMATCH"
        with self.assertRaisesRegex(ValueError,"CANNOT_CREDIT_MISSING_OR_CHANNEL_MISMATCH"):
            gate.adjudicate(self.req,mismatched,self.identities(),decisions)
        empty_reviews={"schema":"atlas-youtube-person-content-review-decisions/v1",
                       "source_snapshot_id":"test-source","decisions":[]}
        result=gate.adjudicate(self.req,metadata,self.identities(),empty_reviews)
        self.assertEqual(result["person_centered_video_ids_verified"],0)

    def test_transcript_evidence_requires_sha_and_excerpt(self):
        metadata=enrich.fetch_descriptions(self.req,api_call=self.api)
        decision=self.decisions()
        decision["decisions"][0]["evidence_method"]="TIMESTAMPED_TRANSCRIPT"
        with self.assertRaisesRegex(ValueError,"TRANSCRIPT_SOURCE_DIGEST_AND_EXCERPT_REQUIRED"):
            gate.adjudicate(self.req,metadata,self.identities(),decision)
        decision["decisions"][0]["transcript_sha256"]="a"*64
        decision["decisions"][0]["transcript_excerpt"]="The detailed historical biography explains the primary individual's life."
        output=gate.adjudicate(self.req,metadata,self.identities(),decision)
        self.assertEqual(output["person_centered_video_ids_verified"],1)


if __name__=="__main__":
    unittest.main()
