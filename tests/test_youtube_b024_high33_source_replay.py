import copy
import gzip
import hashlib
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "scripts" / "youtube-b024-verify-high33-original-video-ids.py"
MANIFEST = ROOT / "audits" / "youtube-b024-high33-real-original-id-crosscheck-20261017.json"
spec = importlib.util.spec_from_file_location("youtube_high33_exact_source", CODE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
UC1 = "UC" + "A" * 22
UC2 = "UC" + "B" * 22
V1, V2, V3 = "AbCdEfGhI12", "AbCdEfGhI13", "AbCdEfGhI14"


class CriticalOriginalVideoIdSourceEvidence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.audit = json.loads(MANIFEST.read_text(encoding="utf-8"))

    def sample_source(self, changes=None):
        rows = [
            (UC1, V1, "Life of The Ancient Figure"),
            (UC1, V2, "Ancient Figure: Title Mentions Only"),
            (UC2, V3, "Life of a Different Figure"),
        ]
        if changes is not None:
            rows = changes
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        archive = Path(temp.name) / "original.zip"
        by_channel = {}
        for cid, vid, title in rows:
            by_channel.setdefault(cid, []).append(
                {"video_id": vid, "channel_id": cid, "title": title}
            )
        with zipfile.ZipFile(archive, "w") as out:
            for cid, values in sorted(by_channel.items()):
                payload = "".join(json.dumps(x) + "\n" for x in values)
                out.writestr("batch008/videos/" + cid + ".ndjson.gz",
                             gzip.compress(payload.encode("utf-8")))
        return archive, rows

    @staticmethod
    def fingerprint(rows):
        by_id = {vid: (cid, title) for cid, vid, title in rows}
        return hashlib.sha256("\n".join(
            "\t".join([vid, *by_id[vid]]) for vid in sorted(by_id)
        ).encode("utf-8")).hexdigest()

    def test_all_thirty_three_real_original_name_groups_are_source_bound_not_people(self):
        audit = self.audit
        mapping = module.check_manifest(audit)
        self.assertEqual(len(audit["cases"]), 33)
        self.assertEqual(len(mapping), 164)
        self.assertEqual(sum(map(len, mapping.values())), 165)
        self.assertEqual(
            mapping["-YFLVaoppvo"], ["Martin Luther", "Martin Luther King Jr"])
        self.assertEqual(audit["corpus_verified"]["original_video_rows"], 2230031)
        self.assertEqual(audit["diff_population"]["original_legacy_mismatched_name_forms"], 865)
        self.assertFalse(audit["production_one_rank_publishable"])
        self.assertEqual(audit["individual_content_approved"], 0)
        self.assertEqual(audit["reviewed_source_label_categories"], module.KINDS)
        self.assertEqual(audit["replayed_provenance"]["original_video_id_channel_title_tsv_sha256"],
            "d19bbdccf6263c7878b24e9c80825e6cc5b72eb936a28dc6fbc1bf0ff74660a1")
        self.assertEqual(
            {row["raw_name"] for row in audit["cases"]
             if row["lexical_review_status"] == "MULTIPLE_REFERENTS_HOLD"},
            {"John F Kennedy", "St George"})
        self.assertEqual(
            {row["raw_name"] for row in audit["cases"]
             if row["lexical_review_status"] == "LIVING_PERSON_STATUS_REVIEW"},
            {"Ibrahim Traoré"})

    def test_exact_source_video_id_channel_title_hash_and_shared_id_dedup(self):
        archive, rows = self.sample_source()
        output = module.scan_zip(
            archive, [V1, V2, V3, V3],
            expected_sha=module.sha256(archive),
            expected_channels=2,
            expected_video_rows=3,
            expected_tsv_sha=self.fingerprint(rows)
        )
        self.assertEqual(output["matched_video_ids"], 3)
        self.assertEqual(output["sample_unique_channel_ids"], 2)
        self.assertEqual(output["original_video_rows"], 3)
        self.assertEqual(output["videos"][V1]["title"], rows[0][2])

    def test_fails_closed_on_missing_wrong_channel_wrong_hash_or_wrong_title(self):
        archive, rows = self.sample_source()
        digest = self.fingerprint(rows)
        with self.assertRaisesRegex(ValueError, "HIGH33_ORIGINAL_ZIP_DIGEST_CHANGED"):
            module.scan_zip(archive, [V1], expected_sha="0" * 64)
        with self.assertRaisesRegex(ValueError, "HIGH33_FULL_ORIGINAL_CENSUS_MISMATCH"):
            module.scan_zip(archive, [V1], expected_channels=10127)
        with self.assertRaisesRegex(ValueError, "HIGH33_ORIGINAL_SOURCE_VIDEO_IDS_MISSING"):
            module.scan_zip(archive, [V1, "X" * 11])
        with self.assertRaisesRegex(ValueError, "HIGH33_ORIGINAL_VIDEO_TITLE_OR_CHANNEL_CHANGED"):
            module.scan_zip(archive, [V1, V2, V3], expected_tsv_sha="0" * 64)
        corrupted = [(UC1, V1, "Altered Title"),
                     (UC1, V2, rows[1][2]), (UC2, V3, rows[2][2])]
        other_archive, _ = self.sample_source(corrupted)
        with self.assertRaisesRegex(ValueError, "HIGH33_ORIGINAL_VIDEO_TITLE_OR_CHANNEL_CHANGED"):
            module.scan_zip(other_archive, [V1, V2, V3], expected_tsv_sha=digest)
        duplicate = [(UC1, V1, "Example One"), (UC2, V1, "Example Two")]
        duplicate_archive, _ = self.sample_source(duplicate)
        with self.assertRaisesRegex(ValueError, "HIGH33_DUPLICATE_MATCHED_VIDEO_ID_IN_ARCHIVE"):
            module.scan_zip(duplicate_archive, [V1])
        self.assertNotEqual(module.sha256(other_archive), module.sha256(archive))

    def test_fails_closed_on_artificial_ranking_source_label_or_count_change(self):
        original = self.audit
        self.assertEqual(len(module.check_manifest(original)), 164)
        edits = [
            (lambda x: x.update({"production_one_rank_publishable": True}),
             "HIGH33_CANNOT_PUBLISH_OR_CERTIFY_CONTENT"),
            (lambda x: x.update({"individual_content_approved": 1}),
             "HIGH33_CANNOT_PUBLISH_OR_CERTIFY_CONTENT"),
            (lambda x: x.update({"full_original_id_ledger_sha256": "0" * 64}),
             "HIGH33_MANIFEST_LEDGER_SHA_MISMATCH"),
            (lambda x: x["cases"][0].update({"channel_delta": 624}),
             "HIGH33_CHANGED_AGGREGATE_EVIDENCE_INVALID"),
            (lambda x: x["cases"][0].update({"raw_name": "Martin Luther"}),
             "HIGH33_DUPLICATE_OR_UNREVIEWED_NAME"),
            (lambda x: x["cases"][0].update({"original_5_example_video_ids": [V1] * 5}),
             "HIGH33_EXACT_FIVE_ORIGINAL_VIDEO_IDS_REQUIRED"),
            (lambda x: x["cases"][0].update(
                {"source_id_membership_verified_in_independent_5965_ledger": False}),
             "HIGH33_UNPROVEN_PUBLICATION_STATE"),
            (lambda x: x.update({"reviewed_source_label_categories":
                     {"NON_SINGLE_PERSON_LABEL": 33}}),
             "HIGH33_REVIEW_CATEGORY_DRIFT"),
        ]
        for mutate, expect in edits:
            changed = copy.deepcopy(original)
            mutate(changed)
            with self.subTest(mutation=expect):
                with self.assertRaisesRegex(ValueError, expect):
                    module.check_manifest(changed)


if __name__ == "__main__":
    unittest.main()
