import copy
import hashlib
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "youtube-source-video-content-evidence-gate.py"
spec = importlib.util.spec_from_file_location("video_name_title_hold_gate", SCRIPT)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
SOURCE_SHA = gate.ORIGINAL_BATCH_024_SOURCE_SHA256


def fixture(video_id, raw_name, channel_id, title, verdict="PERSON_PRIMARY_CONTENT_CONFIRMED"):
    req = {
        "schema": "atlas-youtube-description-enrichment-request/v1",
        "source_snapshot_id": "synthetic-source-identity-test",
        "source_zip_sha256": SOURCE_SHA,
        "source_review_json_sha256": "synthetic-review-digest",
        "original_per_video_channel_id_verified": True,
        "publication_allowed": False,
        "unique_original_video_ids": 1,
        "videos": [{
            "video_id": video_id, "original_channel_id": channel_id,
            "original_title": title, "name_cues": [{
                "raw_name": raw_name, "bucket": "ORIGINAL_TITLE_RAW_NAME_CUE",
            }]
        }]
    }
    description = "Synthetic content description; not a genuine watched/video proof."
    metadata = {
        "schema": "atlas-youtube-description-enrichment-result/v1",
        "source_snapshot_id": req["source_snapshot_id"],
        "source_zip_sha256": SOURCE_SHA,
        "request_source_json_sha256": req["source_review_json_sha256"],
        "automatic_person_subject_approval": False,
        "requested_original_video_ids": 1,
        "fetched_metadata_rows": 1,
        "not_yet_fetched": 0,
        "records": [{
            "video_id": video_id, "original_channel_id": channel_id,
            "original_title": title, "live_channel_id": channel_id,
            "live_title": title, "published_at": "2020-01-01T00:00:00Z",
            "description": description,
            "description_sha256": hashlib.sha256(description.encode()).hexdigest(),
            "status": "DESCRIPTION_PRESENT", "person_video_content_verified": False
        }]
    }
    ids = {"schema": "youtube-b024-source-first-last-registry-screen-36/v1",
           "source_snapshot_id": req["source_snapshot_id"],
           "source_sha256": SOURCE_SHA,
           "source_historical_unmatched_identity_groups": {raw_name:[raw_name]}}
    decisions = {"schema": "atlas-youtube-person-content-review-decisions/v1",
                 "source_snapshot_id": req["source_snapshot_id"],
                 "decisions": [{
                     "video_id": video_id, "raw_name": raw_name,
                     "identity_for_review": raw_name,
                     "verdict": verdict, "evidence_method": "VIDEO_PLAYBACK_MANUAL",
                     "source_url": "https://www.youtube.com/watch?v=" + video_id,
                     "reviewer": "fixture reviewer",
                     "reviewed_at": "2026-10-18T00:00:00Z",
                     "reason": "Synthetic claimed video focus for a regression test, not a real approval.",
                     "content_segment": {"start_seconds": 30, "end_seconds": 55}
                 }]}
    return req,metadata,ids,decisions


class ReviewedOriginalTitleNameHoldTest(unittest.TestCase):
    def setUp(self):
        self.doc = json.loads(gate.REVIEWED_TITLE_LINK_HOLDS_PATH.read_text(encoding="utf-8"))
        self.rows = self.doc["links"]

    def test_all_twelve_actual_source_name_pairs_are_negative_review_only(self):
        self.assertEqual(len(self.rows), 12)
        self.assertEqual(len(gate.ORIGINAL_TITLE_HOLD_BY_VIDEO), 12)
        self.assertEqual(len(gate.ORIGINAL_TITLE_HOLD_BY_VIDEO_NAME), 12)
        self.assertEqual(self.doc["original_source_video_count"], 2230031)
        self.assertEqual(self.doc["title_based_positive_person_content_certified"], 0)
        self.assertFalse(self.doc["production_rank_publishable"])
        self.assertEqual(
            gate.ORIGINAL_TITLE_HOLD_BY_VIDEO["-YFLVaoppvo"]["raw_name"], "Martin Luther")
        self.assertEqual(
            gate.ORIGINAL_TITLE_HOLD_BY_VIDEO["-l3SKRDABZU"]["raw_name"], "John F Kennedy")
        for row in self.rows:
            with self.subTest(video_id=row["video_id"],raw_name=row["raw_name"]):
                request,metadata,identities,decisions = fixture(
                    row["video_id"],row["raw_name"],
                    row["original_channel_id"],row["original_title"])
                self.assertEqual(gate.validate_original_title_name_holds(
                    {r["video_id"]:r for r in request["videos"]}),frozenset([row["video_id"]]))
                # A fabricated positive reviewer claim MUST NOT override a
                # verified original-title name collision/work/relative/holiday.
                with self.assertRaisesRegex(
                        ValueError,"REVIEWED_ORIGINAL_VIDEO_NAME_TITLE_HOLD_NO_POSITIVE_CREDIT"):
                    gate.adjudicate(request,metadata,identities,decisions)
                decisions["decisions"][0]["verdict"]="INCIDENTAL_MENTION"
                result=gate.adjudicate(request,metadata,identities,decisions)
                self.assertEqual(result["person_centered_video_ids_verified"],0)
                self.assertEqual(result["decision_counts"],{"INCIDENTAL_MENTION":1})
                self.assertFalse(result["production_ranking_publishable"])

    def test_original_title_or_channel_mismatch_does_not_remove_hold(self):
        row=self.rows[4]  # Martin Luther vs Martin Luther King Day
        for field,value in [
            ("original_channel_id","UC"+"B"*22),
            ("original_title","The Full Life of Martin Luther")
        ]:
            req,meta,identities,decisions=fixture(
                row["video_id"],row["raw_name"],
                row["original_channel_id"],row["original_title"])
            req["videos"][0][field]=value
            meta["records"][0][field]=value
            if field=="original_channel_id":
                meta["records"][0]["live_channel_id"]=value
            with self.subTest(field=field):
                with self.assertRaisesRegex(
                        ValueError,"REVIEWED_TITLE_LINK_HOLD_SOURCE_VIDEO_BINDING_CHANGED"):
                    gate.adjudicate(req,meta,identities,decisions)

    def test_same_historical_person_name_remains_eligible_for_other_source_video(self):
        # A negative edge is NOT an exclusion of the person's name or UUID.
        req,meta,ids,decision=fixture(
            "AsDfGhJkL12","Martin Luther","UC"+"C"*22,
            "Martin Luther and the 95 Theses: A Biography")
        result=gate.adjudicate(req,meta,ids,decision)
        self.assertEqual(result["person_centered_video_ids_verified"],1)
        self.assertEqual(result["people"][0]["person_identity_for_review"],"Martin Luther")
        self.assertFalse(result["registered_person_exclusion_completed"])
        self.assertFalse(result["production_ranking_publishable"])

    def test_negative_review_manifest_rejects_tampering(self):
        cases=[
            ("original_batch008_024_source_zip_sha256","bad-sha",
             "REVIEWED_TITLE_LINK_HOLD_PROVENANCE_OR_SCOPE_INVALID"),
            ("title_based_positive_person_content_certified",1,
             "REVIEWED_TITLE_LINK_HOLD_PROVENANCE_OR_SCOPE_INVALID"),
            ("production_rank_publishable",True,
             "REVIEWED_TITLE_LINK_HOLD_PROVENANCE_OR_SCOPE_INVALID"),
        ]
        for field,value,error in cases:
            bad=copy.deepcopy(self.doc)
            bad[field]=value
            with self.subTest(field=field):
                with self.assertRaisesRegex(ValueError,error):
                    gate.load_reviewed_title_link_holds(bad)
        bad=copy.deepcopy(self.doc)
        bad["links"][1]["video_id"]=bad["links"][0]["video_id"]
        with self.assertRaisesRegex(ValueError,"DUPLICATE_REVIEWED_ORIGINAL_VIDEO_NAME_HOLD"):
            gate.load_reviewed_title_link_holds(bad)
        bad=copy.deepcopy(self.doc)
        bad["links"][0]["evidence_level"]="ACTUAL_WATCHED_PROOF"
        with self.assertRaisesRegex(ValueError,"REVIEWED_TITLE_LINK_HOLD_ROW_INVALID"):
            gate.load_reviewed_title_link_holds(bad)


if __name__=="__main__":
    unittest.main()
