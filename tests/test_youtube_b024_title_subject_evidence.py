import gzip
import hashlib
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "youtube-b024-review-title-subject-evidence.py"
spec = importlib.util.spec_from_file_location("youtube_topic_qa", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class TitleSubjectReviewTest(unittest.TestCase):
    def test_multilingual_biography_is_not_incidental(self):
        self.assertEqual(
            mod.topic_bucket("Biografía de Frédéric Chopin", ["Frédéric Chopin"]),
            "MULTILINGUAL_BIOGRAPHY_SYNTAX_REVIEW"
        )
        self.assertEqual(
            mod.topic_bucket("Extra History: Simón Bolívar", ["Simón Bolívar"]),
            "SERIES_SUBJECT_SYNTAX_REVIEW"
        )
        self.assertEqual(
            mod.topic_bucket("Life of Salvador Dalí", ["Salvador Dalí"]),
            "ENGLISH_BIOGRAPHY_SYNTAX_REVIEW"
        )

    def test_heading_is_not_approved_biography(self):
        self.assertEqual(
            mod.topic_bucket(
                "Frederic Chopin - Raindrop Prelude No 15", ["Frederic Chopin"]
            ),
            "NAME_HEADING_REVIEW"
        )
        self.assertEqual(
            mod.topic_bucket(
                "The Savage Rivalry of Elizabeth I and Mary, Queen of Scots",
                ["Mary, Queen of Scots"]
            ),
            "TITLE_MENTION_UNRESOLVED"
        )
        self.assertEqual(
            mod.topic_bucket(
                "Meryem Uzerli | Hurrem Sultan | Turkish Actress",
                ["Hurrem Sultan"]
            ),
            "TITLE_MENTION_UNRESOLVED"
        )

    def test_original_id_reconciliation_and_publication_gate(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "original.zip"
            rows = [
                ("UC1", "v1", "Biografía de Frédéric Chopin"),
                ("UC1", "v2", "Frédéric Chopin - Raindrop Prelude"),
                ("UC2", "v3", "Extra History: Simón Bolívar")
            ]
            with zipfile.ZipFile(source, "w") as z:
                for channel in ("UC1", "UC2"):
                    body = "".join(
                        json.dumps({"video_id": vid, "title": title}, ensure_ascii=True) + "\n"
                        for c, vid, title in rows if c == channel
                    )
                    z.writestr(
                        f"batch024/videos/{channel}.ndjson.gz", gzip.compress(body.encode())
                    )
            sha = hashlib.sha256(source.read_bytes()).hexdigest()
            manifest = {
                "source_snapshot_id": "local",
                "original_channel_count": 2,
                "original_video_count": 3,
                "original_source_zip_sha256": sha
            }
            def name(key, labels, vids, channels):
                return {
                    "normalization_key": key, "labels": labels,
                    "review_disposition": "SAME_PERSON_HISTORICAL_NAME_FORM",
                    "union_original_video_ids": vids, "union_original_channel_ids": channels,
                    "distinct_channel_id_union": len(channels),
                    "distinct_video_id_union": len(vids)
                }
            members = [
                name("fredericchopin", ["Frédéric Chopin", "Frederic Chopin"],
                     ["v1", "v2"], ["UC1"]),
                name("simonbolivar", ["Simón Bolívar", "Simon Bolivar"], ["v3"], ["UC2"]),
            ]
            for i in range(16):
                members.append(name(f"empty{i}", [f"Missing Name {i}"], [], []))
            alias = {
                "schema": "youtube-b024-normalized-original-id-review/v1",
                "source_snapshot_id": "local",
                "original_channels": 2, "original_videos": 3, "rows": members
            }
            result = mod.audit(source, alias, manifest)
            self.assertEqual(len(result["rows"]), 18)
            self.assertFalse(result["person_centered_videos_approved"])
            chopin = next(v for v in result["rows"] if v["normalized_name_key"] == "fredericchopin")
            self.assertEqual(chopin["title_mention_channels"], 1)
            self.assertEqual(chopin["title_mention_videos"], 2)
            self.assertEqual(
                chopin["uncertified_topic_cue_buckets"]
                ["MULTILINGUAL_BIOGRAPHY_SYNTAX_REVIEW"]["distinct_videos"], 1
            )
            with self.assertRaisesRegex(ValueError, "SHA256"):
                mod.audit(source, alias, {**manifest, "original_source_zip_sha256": "0"*64})


if __name__ == "__main__":
    unittest.main()
