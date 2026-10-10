import gzip
import hashlib
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "youtube-b024-stratified-title-qa.py"
spec = importlib.util.spec_from_file_location("b024_stratified_title_qa", SCRIPT)
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


class OriginalIdStratifiedTitleQATest(unittest.TestCase):
    def test_topic_cues_are_not_person_centered_truth(self):
        self.assertEqual(
            qa.syntax_bucket("Frédéric Chopin — Nocturne performance",
                             ["Frédéric Chopin"]), "NAME_HEADING_REVIEW"
        )
        self.assertEqual(
            qa.syntax_bucket("Biografía de Frédéric Chopin",
                             ["Frédéric Chopin"]), "MULTILINGUAL_BIOGRAPHY_CUE_REVIEW"
        )
        self.assertEqual(
            qa.syntax_bucket("The Prince by Niccolò Machiavelli",
                             ["Niccolò Machiavelli"]), "TITLE_MENTION_ONLY_REVIEW"
        )

    def test_original_ids_annotation_lock_and_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "original.zip"
            titles = {
                "UC1": [("v1", "Frédéric Chopin: Nocturne recording"),
                        ("v2", "The Prince by Frédéric Chopin")],
                "UC2": [("v3", "Biografía de Frédéric Chopin")]
            }
            with zipfile.ZipFile(source, "w") as z:
                for channel, videos in titles.items():
                    raw = "".join(json.dumps(
                        {"video_id": video_id, "title": title}, ensure_ascii=True
                    ) + "\n" for video_id, title in videos)
                    z.writestr(f"batch024/videos/{channel}.ndjson.gz",
                               gzip.compress(raw.encode()))
            sha = hashlib.sha256(source.read_bytes()).hexdigest()
            alias = {
                "schema": "youtube-b024-normalized-original-id-review/v1",
                "rows": [{
                    "normalization_key": "fredericchopin",
                    "labels": ["Frédéric Chopin", "Frederic Chopin"],
                    "review_disposition": "SAME_PERSON_HISTORICAL_NAME_FORM",
                    "union_original_channel_ids": ["UC1", "UC2"],
                    "union_original_video_ids": ["v1", "v2", "v3"]
                }]
            }
            identity = "\n".join([
                "fredericchopin|HEADING|v1",
                "fredericchopin|MENTION|v2",
                "fredericchopin|OTHER|v3"
            ])
            key = {
                "source_zip_sha256": sha,
                "source_channel_count": 2, "source_video_count": 3,
                "source_name_group_count": 1,
                "seed": "test-seed", "expected_sample_rows": 3,
                "expected_sample_identity_sha256": hashlib.sha256(identity.encode()).hexdigest(),
                "default_review_label": "PERSON_PRIMARY_TITLE",
                "explicit_overrides": {
                    "v1": {"label": "WORK_PERFORMANCE_OR_DRAMATIZATION_TITLE",
                           "note": "Music performance"}
                },
                "expected_review_counts": {
                    "PERSON_PRIMARY_TITLE": 2,
                    "WORK_PERFORMANCE_OR_DRAMATIZATION_TITLE": 1
                }
            }
            result = qa.analyze(source, alias, key)
            self.assertEqual(result["sample_size"], 3)
            self.assertEqual(result["review_counts"],
                             key["expected_review_counts"])
            self.assertFalse(result["publication_eligible"])
            self.assertIn("not watched video ground truth", result["reviewer_scope"])
            with self.assertRaisesRegex(ValueError, "SHA256"):
                qa.analyze(source, alias, {**key, "source_zip_sha256": "0" * 64})
            with self.assertRaisesRegex(ValueError, "fingerprint mismatch"):
                qa.analyze(source, alias, {
                    **key, "expected_sample_identity_sha256": "0" * 64
                })
            with self.assertRaisesRegex(ValueError, "outside locked sample"):
                qa.analyze(source, alias, {
                    **key, "explicit_overrides": {
                        "not-in-source": {"label": "PERSON_PRIMARY_TITLE", "note": "invalid"}
                    }
                })


if __name__ == "__main__":
    unittest.main()
