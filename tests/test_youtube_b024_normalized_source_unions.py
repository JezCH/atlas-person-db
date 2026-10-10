import gzip
import hashlib
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "youtube-b024-normalized-name-source-unions.py"
spec = importlib.util.spec_from_file_location("b024_normalized_aliases", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class OrthographicSourceUnionTest(unittest.TestCase):
    def setup_corpus(self, path):
        videos = {
            "UC1": [
                {"video_id": "x1", "title": "A biography of Simón Bolívar"},
                {"video_id": "x2", "title": "Simon Bolivar's legacy and Simón Bolívar"},
            ],
            "UC2": [
                {"video_id": "x3", "title": "Why did Simón Bolívar lead the revolt?"}
            ],
        }
        with zipfile.ZipFile(path, "w") as z:
            for channel, rows in videos.items():
                z.writestr(
                    f"batch024/videos/{channel}.ndjson.gz",
                    gzip.compress(
                        "".join(json.dumps(r, ensure_ascii=True) + "\n" for r in rows).encode()
                    )
                )
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def fixtures(self, sha):
        signal = {
            "snapshot": {"snapshot_id": "source-v1", "channel_count": 2, "video_count": 3},
            "signals": [{"raw_name": "Simón Bolívar"}]
        }
        cue = {
            "reference_source_snapshot_id": "source-v1",
            "rows": [{"candidate": "Simon Bolivar"}]
        }
        manifest = {
            "source_snapshot_id": "source-v1",
            "original_source_zip_sha256": sha,
            "original_channel_count": 2,
            "original_video_count": 3,
            "accepted_collision_group_count": 1,
            "disposition_by_normalized_key": {
                "simonbolivar": "SAME_PERSON_HISTORICAL_NAME_FORM"
            }
        }
        return signal, cue, manifest

    def test_accented_raw_json_match_and_actual_original_id_union(self):
        with tempfile.TemporaryDirectory() as tmp:
            original = Path(tmp) / "videos.zip"
            sha = self.setup_corpus(original)
            signal, cue, manifest = self.fixtures(sha)
            self.assertEqual(mod.lossless_ascii_anchor(
                ["Simon Bolivar", "Simón Bolívar"]), "sim")
            result = mod.audit(original, signal, cue, manifest)
            self.assertEqual((result["original_channels"], result["original_videos"]), (2, 3))
            self.assertEqual(result["collision_groups"], 1)
            r = result["rows"][0]
            self.assertEqual(r["distinct_channel_id_union"], 2)
            self.assertEqual(r["distinct_video_id_union"], 3)
            self.assertEqual(r["incorrect_channel_sum_inflation"], 1)
            self.assertEqual(r["review_disposition"], "SAME_PERSON_HISTORICAL_NAME_FORM")
            self.assertFalse(result["publication_allowed"])
            self.assertFalse(result["title_mention_is_verified_person_centered"])

    def test_source_guards_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            original = Path(tmp) / "videos.zip"
            sha = self.setup_corpus(original)
            signal, cue, manifest = self.fixtures(sha)
            with self.assertRaisesRegex(ValueError, "SHA256"):
                mod.audit(original, signal, cue, {
                    **manifest, "original_source_zip_sha256": "0" * 64
                })
            with self.assertRaisesRegex(ValueError, "CUE_SOURCE"):
                mod.audit(original, signal, {
                    **cue, "reference_source_snapshot_id": "wrong"
                }, manifest)
            with self.assertRaisesRegex(ValueError, "COLLISION_GROUPS"):
                mod.audit(original, signal, cue, {
                    **manifest, "disposition_by_normalized_key": {}
                })


if __name__ == "__main__":
    unittest.main()
