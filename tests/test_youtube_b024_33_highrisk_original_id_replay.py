import copy
import gzip
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "youtube-b024-verify-33-original-highrisk.py"
spec = importlib.util.spec_from_file_location("youtube_b024_33", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class OriginalHighRiskIdTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.archive = Path(tmp.name) / "sample.zip"
        self.vid1 = "AbCdEfGhI12"
        self.vid2 = "AbCdEfGhI13"
        self.vid3 = "AbCdEfGhI14"
        self.ch1 = "UC" + "A" * 22
        self.ch2 = "UC" + "B" * 22
        self.manifest = {
            "schema": module.SCHEMA,
            "source_snapshot_id": "yt-20261009T111844Z-10127ch-rebuild-v4",
            "original_source_zip_sha256": module.ORIGINAL_SHA,
            "prior_name_forms": 5720,
            "total_name_form_differences": 865,
            "historical_biography_approved": False,
            "production_publication_approved": False,
            "original_sources_deleted": False,
            "rows": [
                {"raw_name": "Martin Luther", "source_title_label_review": "HISTORICAL_PERSON_NAME_REVIEW",
                 "previous_channels": 1, "recount_channels": 2,
                 "previous_videos": 1, "recount_videos": 2,
                 "original_example_video_ids": [self.vid1, self.vid2, self.vid3, "12345678900", "12345678901"]},
                {"raw_name": "Martin Luther King Jr", "source_title_label_review": "HISTORICAL_PERSON_NAME_REVIEW",
                 "previous_channels": 2, "recount_channels": 3,
                 "previous_videos": 2, "recount_videos": 3,
                 "original_example_video_ids": [self.vid2, "12345678902", "12345678903", "12345678904", "12345678905"]}
            ]
        }
        vids = [self.vid1, self.vid2, self.vid3] + [f"1234567890{i}" for i in range(6)]
        with zipfile.ZipFile(self.archive, "w") as z:
            for cid, pairs in [(self.ch1, vids[:5]), (self.ch2, vids[5:])]:
                payload = "".join(json.dumps({"video_id": vid, "channel_id": cid,
                          "title": "The life of " + ("Martin Luther King Jr" if vid == self.vid2 else "Martin Luther")}) + "\n" for vid in pairs)
                z.writestr("out/batch024/videos/" + cid + ".ndjson.gz", gzip.compress(payload.encode()))

    def replay(self, **options):
        return module.audit_original_archive(self.archive, self.manifest,
                   verify_digest=False, channels=2, videos=9, labels=2, links=10, unique=9, **options)

    def test_original_zip_video_id_union_and_no_content_promotion(self):
        result = self.replay()
        self.assertEqual(result["distinct_original_sample_video_ids"], 9)
        self.assertEqual(result["same_original_video_id_across_raw_name_labels"],
                         {self.vid2: ["Martin Luther", "Martin Luther King Jr"]})
        self.assertEqual(result["original_source_channel_count"], 2)
        self.assertEqual(result["original_source_video_count"], 9)
        self.assertEqual(result["actual_video_subject_watched_or_transcript_confirmed"], 0)
        self.assertFalse(result["production_rank_publishable"])
        self.assertEqual(result["rows"][0]["recovered_original_videos"][1]["original_title"],
                         "The life of Martin Luther King Jr")

    def test_digest_and_source_population_are_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "IMMUTABLE_ORIGINAL_ZIP_SHA256_MISMATCH"):
            module.audit_original_archive(self.archive, self.manifest, labels=2, links=10, unique=9)
        with self.assertRaisesRegex(ValueError, "IMMUTABLE_ORIGINAL_CORPUS_TOTALS_MISMATCH"):
            module.audit_original_archive(self.archive, self.manifest, verify_digest=False,
                                          channels=3, videos=9, labels=2, links=10, unique=9)

    def test_incorrect_or_missing_video_id_is_blocked(self):
        altered = copy.deepcopy(self.manifest)
        altered["rows"][0]["original_example_video_ids"][0] = "Missing0001"
        with self.assertRaisesRegex(ValueError, "ORIGINAL_HIGH_RISK_VIDEO_ID_NOT_IN_IMMUTABLE_ARCHIVE"):
            module.audit_original_archive(self.archive, altered, verify_digest=False,
                                          channels=2, videos=9, labels=2, links=10, unique=9)
        altered = copy.deepcopy(self.manifest)
        altered["rows"][0]["original_example_video_ids"][1] = self.vid1
        with self.assertRaisesRegex(ValueError, "HIGH_RISK_FIVE_EXACT_SOURCE_VIDEO_IDS_REQUIRED"):
            module.verify_manifest(altered, labels=2, sample_links=10, sample_unique=9)

    def test_no_fabricated_positive_or_duplicate_label(self):
        bad = copy.deepcopy(self.manifest)
        bad["historical_biography_approved"] = True
        with self.assertRaisesRegex(ValueError, "SOURCE_ONLY_REFERENCE_CONTRACT_VIOLATED"):
            module.verify_manifest(bad, labels=2, sample_links=10, sample_unique=9)
        bad = copy.deepcopy(self.manifest)
        bad["rows"][1]["raw_name"] = "Martin Luther"
        with self.assertRaisesRegex(ValueError, "HIGH_RISK_DUPLICATE_OR_EMPTY_LABEL"):
            module.verify_manifest(bad, labels=2, sample_links=10, sample_unique=9)
        bad = copy.deepcopy(self.manifest)
        bad["rows"][1]["source_title_label_review"] = "PERSON_PRIMARY_CONTENT_CONFIRMED"
        with self.assertRaisesRegex(ValueError, "HIGH_RISK_UNKNOWN_IDENTITY_REVIEW"):
            module.verify_manifest(bad, labels=2, sample_links=10, sample_unique=9)


if __name__ == "__main__":
    unittest.main()
