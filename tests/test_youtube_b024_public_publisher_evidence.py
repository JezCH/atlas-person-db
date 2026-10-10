import copy
import hashlib
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "youtube-b024-reconcile-public-publisher-descriptions.py"
MANIFEST = ROOT / "audits" / "youtube-b024-first-real-public-publisher-description-evidence.json"
spec = importlib.util.spec_from_file_location("youtube_b024_publisher_review", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def test_fixture():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    row_by_id = {}
    for original in manifest["evidence"]:
        vid = original["video_id"]
        row_by_id[vid] = {
            "video_id": vid,
            "original_channel_id": original["expected_original_channel_id"],
            "original_title": original["expected_original_title"],
            "review_identity_for_queue_only": original["identity_for_review"],
            "name_cues": [{
                "raw_name": original["original_name_cue_raw_name"],
                "bucket": original["original_name_cue_bucket"]
            }]
        }
    # 86 unrelated source candidates are present but deliberately NOT inferred
    # to have available publisher descriptions or verified content.
    for i in range(86):
        vid = f"{i:011d}"
        row_by_id[vid] = {
            "video_id": vid,
            "original_channel_id": "UC" + f"{i:022d}",
            "original_title": f"Unverified candidate title number {i}",
            "review_identity_for_queue_only": "Unreviewed source person",
            "name_cues": [{"raw_name": "Unreviewed source person",
                           "bucket": "NAME_HEADING_UNRESOLVED_REVIEW"}]
        }
    request = {
        "schema": "atlas-youtube-description-enrichment-request/v1",
        "original_per_video_channel_id_verified": True,
        "publication_allowed": False,
        "source_zip_sha256": manifest["original_source_zip_sha256"],
        "source_snapshot_id": manifest["source_snapshot_id"],
        "unique_original_video_ids": 90,
        "videos": list(row_by_id.values())
    }
    sha = hashlib.sha256(json.dumps(request, ensure_ascii=False).encode()).hexdigest()
    manifest["parent_90_request_sha256"] = sha
    return request, manifest, sha


class PublisherDescriptionOriginalIdReviewTests(unittest.TestCase):
    def test_actual_publisher_description_subset_does_not_create_person_credits(self):
        request, manifest, digest = test_fixture()
        output = mod.reconcile(request, manifest, request_sha256=digest)
        self.assertEqual(output["original_review_queue_videos"], 90)
        self.assertEqual(output["actual_public_publisher_description_video_ids"], 4)
        self.assertEqual(output["actual_public_publisher_description_distinct_channel_ids"], 2)
        self.assertEqual(output["public_descriptions_not_found_in_review"], 86)
        self.assertEqual(output["youtube_data_api_descriptions_fetched"], 0)
        self.assertEqual(output["reviewed_content_verified_videos"], 0)
        self.assertFalse(output["production_publication_allowed"])
        self.assertEqual(
            {r["identity_for_review"] for r in output["records"]},
            {"Emmett Till", "A. P. J. Abdul Kalam"}
        )
        self.assertTrue(all(r["person_content_video_approved"] is False for r in output["records"]))

    def test_video_channel_title_and_original_name_cue_fail_closed(self):
        request, manifest, digest = test_fixture()
        checks = [
            ("expected_original_channel_id", "UC" + "Z"*22, "ORIGINAL_CHANNEL_TITLE_PERSON"),
            ("expected_original_title", "Unrelated changed video title", "ORIGINAL_CHANNEL_TITLE_PERSON"),
            ("identity_for_review", "Unreviewed Other Person", "ORIGINAL_CHANNEL_TITLE_PERSON"),
            ("original_name_cue_raw_name", "A Different Name", "SOURCE_NAME_CUES"),
            ("original_name_cue_bucket", "TITLE_MENTION_ONLY", "SOURCE_NAME_CUES"),
            ("original_youtube_url", "https://www.youtube.com/watch?v=00000000000", "ORIGINAL_CHANNEL_TITLE_PERSON"),
            ("person_centered_actual_video_verified", True, "MUST_NOT_CREDIT")
        ]
        for field, value, message in checks:
            bad = copy.deepcopy(manifest)
            bad["evidence"][0][field] = value
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, message):
                mod.reconcile(request, bad, request_sha256=digest)
        duplicate = copy.deepcopy(manifest)
        duplicate["evidence"][1]["video_id"] = duplicate["evidence"][0]["video_id"]
        with self.assertRaisesRegex(ValueError, "UNSOURCED_OR_DUPLICATE"):
            mod.reconcile(request, duplicate, request_sha256=digest)

    def test_source_population_digest_and_publisher_evidence_guards(self):
        request, manifest, digest = test_fixture()
        with self.assertRaisesRegex(ValueError, "SOURCE_PROVENANCE"):
            mod.reconcile(request, manifest, request_sha256="0"*64)
        with self.assertRaisesRegex(ValueError, "SOURCE_PROVENANCE"):
            mod.reconcile({**request, "source_snapshot_id": "different"}, manifest,
                          request_sha256=digest)
        bad = copy.deepcopy(manifest)
        bad["evidence"][0]["corroborating_publisher_page"] = "http://example.org"
        with self.assertRaisesRegex(ValueError, "HTTPS_EVIDENCE"):
            mod.reconcile(request, bad, request_sha256=digest)
        bad = copy.deepcopy(manifest)
        bad["actual_official_youtube_data_api_calls"] = 1
        with self.assertRaisesRegex(ValueError, "UNSUPPORTED_CLAIM"):
            mod.reconcile(request, bad, request_sha256=digest)


if __name__ == "__main__":
    unittest.main()
