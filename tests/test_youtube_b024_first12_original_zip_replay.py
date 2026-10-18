import copy
import gzip
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MOD=ROOT/"scripts/youtube-b024-verify-first-12-original-zip.py"
spec=importlib.util.spec_from_file_location("first12_zip_replay",MOD)
verify=importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)
TRIAGE=json.loads((ROOT/"audits/youtube-b024-first-12-original-title-triage-20261016.json").read_text(encoding="utf8"))
REPORT=json.loads((ROOT/"audits/youtube-b024-first-12-original-zip-direct-replay-20261018.json").read_text(encoding="utf8"))
THREE=json.loads((ROOT/"audits/youtube-b024-first-12-metadata-review-request.json").read_text(encoding="utf8"))


class OriginalB024TwelveZipReplayTest(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.archive=Path(tmp.name)/"synthetic-source.zip"
        self.triage=copy.deepcopy(TRIAGE)
        self.triage["records"]=[copy.deepcopy(TRIAGE["records"][0]),copy.deepcopy(TRIAGE["records"][2])]
        self.triage["review_count"]=2
        self.source=self.triage["records"]
        self.extra_id="ABCdef12345"

    def make_zip(self,*,missing=False,duplicate=False,wrong_channel_binding=False):
        with zipfile.ZipFile(self.archive,"w") as zipped:
            for index, row in enumerate(self.source):
                cid=row["original_channel_id"]
                data=[]
                if index==0:
                    data.append({"video_id":self.extra_id,"channel_id":cid,"title":"Unrelated archive title"})
                if not missing or index==0:
                    data.append({"video_id":row["video_id"],"channel_id":cid,
                                 "title":row["original_title"]})
                if duplicate and index==1:
                    data.append({"video_id":self.source[0]["video_id"],
                                 "channel_id":cid,"title":self.source[0]["original_title"]})
                if wrong_channel_binding and index==1:
                    data[-1]["channel_id"]=self.source[0]["original_channel_id"]
                packed="".join(json.dumps(d,ensure_ascii=False)+"\n" for d in data)
                zipped.writestr(f"out/batch024/videos/{cid}.ndjson.gz",
                                gzip.compress(packed.encode("utf8")))

    def replay(self,**kwargs):
        return verify.scan(self.archive,self.triage,
                           strict=False,verify_digest=False,
                           expected_count=2,expected_channels=2,expected_videos=3,**kwargs)

    def test_real_committed_report_matches_every_original_manifest_video_and_three_video_queue(self):
        self.assertTrue(verify.validate_committed_report(REPORT,TRIAGE))
        self.assertTrue(verify.validate_three_metadata_source_bindings(REPORT,THREE))
        self.assertEqual(len({r["video_id"] for r in REPORT["records"]}),12)
        self.assertEqual(REPORT["original_channel_count"],10127)
        self.assertEqual(REPORT["original_video_rows"],2230031)
        self.assertEqual(REPORT["matched_exact_original_channel_and_title_count"],12)
        self.assertEqual(REPORT["original_zip_sha256"],verify.SOURCE_SHA)
        self.assertEqual(REPORT["official_youtube_current_channel_id_verified"],0)
        self.assertEqual(REPORT["original_video_content_watched_or_timestamped_transcript_verified"],0)
        self.assertFalse(REPORT["publication_authorized"])
        altered=copy.deepcopy(REPORT)
        altered["records"][0]["original_title"]="Other film"
        with self.assertRaisesRegex(ValueError,"ARCHIVED_ORIGINAL_SOURCE_REPLAY_REPORT_PARITY_MISMATCH"):
            verify.validate_committed_report(altered,TRIAGE)
        altered=copy.deepcopy(THREE)
        altered["videos"][2]["original_channel_id"]="UC"+"X"*22
        with self.assertRaisesRegex(ValueError,"THREE_VIDEO_METADATA_REQUEST_ARCHIVED_BINDING_CHANGED"):
            verify.validate_three_metadata_source_bindings(REPORT,altered)

    def test_synthetic_archive_replay_preserves_all_video_channel_title_matches(self):
        self.make_zip()
        actual=self.replay()
        self.assertEqual(actual["matched_exact_original_channel_and_title_count"],2)
        self.assertEqual(actual["original_channel_count"],2)
        self.assertEqual(actual["original_video_rows"],3)
        self.assertEqual(actual["mismatches"],[])
        self.assertEqual(actual["original_video_content_watched_or_timestamped_transcript_verified"],0)
        self.assertEqual(actual["original_zip_sha256"],"SYNTHETIC_TEST_ONLY")

    def test_actual_archive_digest_and_census_are_required_in_production(self):
        self.make_zip()
        with self.assertRaisesRegex(ValueError,"IMMUTABLE_SOURCE_ZIP_BYTE_LENGTH_MISMATCH"):
            verify.scan(self.archive,self.triage,expected_count=2)
        with self.assertRaisesRegex(ValueError,"IMMUTABLE_SOURCE_ZIP_SHA256_MISMATCH"):
            verify.scan(self.archive,self.triage,strict=False,expected_count=2,
                        expected_channels=2,expected_videos=3)
        with self.assertRaisesRegex(ValueError,"ORIGINAL_ZIP_FULL_CORPUS_CENSUS_MISMATCH"):
            verify.scan(self.archive,self.triage,strict=False,verify_digest=False,
                        expected_count=2,expected_channels=3,expected_videos=3)

    def test_tampered_title_channel_video_id_and_duplicate_are_not_accepted(self):
        self.make_zip()
        altered=copy.deepcopy(self.triage)
        altered["records"][0]["original_title"]="Wrong title"
        with self.assertRaisesRegex(ValueError,"ORIGINAL_ZIP_REVIEWED_VIDEO_CHANNEL_OR_TITLE_MISMATCH"):
            verify.scan(self.archive,altered,strict=False,verify_digest=False,
                        expected_count=2,expected_channels=2,expected_videos=3)
        altered=copy.deepcopy(self.triage)
        altered["records"][0]["original_channel_id"]="UC"+"X"*22
        with self.assertRaisesRegex(ValueError,"ORIGINAL_ZIP_REVIEWED_VIDEO_CHANNEL_OR_TITLE_MISMATCH"):
            verify.scan(self.archive,altered,strict=False,verify_digest=False,
                        expected_count=2,expected_channels=2,expected_videos=3)
        self.make_zip(missing=True)
        with self.assertRaisesRegex(ValueError,"ORIGINAL_ZIP_REVIEWED_VIDEO_ID_MISSING"):
            verify.scan(self.archive,self.triage,strict=False,verify_digest=False,
                        expected_count=2,expected_channels=2,expected_videos=2)
        self.make_zip(duplicate=True)
        with self.assertRaisesRegex(ValueError,"ORIGINAL_ZIP_DUPLICATE_REVIEWED_VIDEO_ID"):
            verify.scan(self.archive,self.triage,strict=False,verify_digest=False,
                        expected_count=2,expected_channels=2,expected_videos=4)
        self.make_zip(wrong_channel_binding=True)
        with self.assertRaisesRegex(ValueError,"ORIGINAL_ZIP_VIDEO_CHANNEL_BINDING_INVALID"):
            self.replay()


if __name__=="__main__":
    unittest.main()
