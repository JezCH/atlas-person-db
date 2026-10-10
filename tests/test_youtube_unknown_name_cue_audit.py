import gzip
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "youtube-unknown-name-cue-audit.py"
spec = importlib.util.spec_from_file_location("youtube_unknown_names", SCRIPT)
names = importlib.util.module_from_spec(spec)
spec.loader.exec_module(names)

class UnknownNameCueTest(unittest.TestCase):
    def test_subject_cues_recognize_names_not_from_existing_snapshot(self):
        samples = [
            ("Why Was Malcolm X Killed at 39?", "Malcolm X"),
            ("Who Was Harriet Tubman?", "Harriet Tubman"),
            ("The Life of Nikola Tesla | A Biography", "Nikola Tesla"),
            ("What Happened to Princess Diana After the Crash?", "Princess Diana"),
            ("How Did Ada Lovelace Change Computing?", "Ada Lovelace"),
            ("The Story of Simon Bolivar", "Simon Bolivar"),
        ]
        for title, expected in samples:
            with self.subTest(title=title):
                self.assertIn(expected, [n for n, _ in names.title_candidates(title)])

    def test_generic_text_does_not_become_a_person(self):
        samples = [
            "Who Was He Really?", "Why Did It Come to This?",
            "Why Did The Roman Empire Fall?", "The Rise of the Ottoman Empire",
            "How Did They Escape?", "Why Is Everyone Talking About Her?",
            "The Life of the British Empire",
        ]
        for title in samples:
            with self.subTest(title=title):
                self.assertEqual(names.title_candidates(title), [])

    def test_original_ids_and_variants_are_kept_separate(self):
        with tempfile.TemporaryDirectory() as tmp:
            corpus = Path(tmp) / "source.zip"
            channels = [
                ("UC1", [
                    ("v1", "The Story of Simon Bolivar"),
                    ("v2", "Who Was Harriet Tubman?"),
                    ("v3", "The Life of Simon Bolivar"),
                ]),
                ("UC2", [
                    ("v4", "The Story of Simón Bolívar"),
                    ("v5", "Who Was Harriet Tubman?"),
                ]),
                ("UC3", [
                    ("v6", "The Story of Simon Bolivar"),
                    ("v7", "Who Was Harriet Tubman?"),
                ]),
            ]
            with zipfile.ZipFile(corpus, "w") as z:
                for channel, videos in channels:
                    text = "".join(
                        json.dumps({"video_id": ident, "title": title}) + "\n"
                        for ident, title in videos
                    )
                    z.writestr(f"out/batch024/videos/{channel}.ndjson.gz",
                               gzip.compress(text.encode()))
            result = names.audit(corpus, iter(["Simón Bolívar", "Other Name"]),
                                 min_channels=2)
            self.assertEqual((result["source_channels"], result["source_videos"]),
                             (3, 7))
            by_name = {r["candidate"]: r for r in result["rows"]}
            self.assertEqual(by_name["Harriet Tubman"]["distinct_channels"], 3)
            self.assertEqual(by_name["Simon Bolivar"]["distinct_channels"], 2)
            self.assertEqual(by_name["Simon Bolivar"]["distinct_videos"], 3)
            self.assertEqual(by_name["Simon Bolivar"]["candidate_fold_status"],
                             "POSSIBLE_ORTHOGRAPHIC_VARIANT")
            self.assertNotIn("Simón Bolívar", by_name)
            self.assertFalse(result["publication_eligible"])

    def test_reviewed_nonpersons_quarantined_without_destroying_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            corpus = Path(tmp) / "source.zip"
            rows = [
                ("a", "The Life of Santa Claus"),
                ("b", "Who Was Santa Claus?"),
                ("c", "The Story of Santa Claus"),
                ("d", "Who Was Harriet Tubman?"),
                ("e", "Who Was Harriet Tubman?"),
                ("f", "Who Was Harriet Tubman?"),
            ]
            with zipfile.ZipFile(corpus, "w") as z:
                for i, (vid, title) in enumerate(rows):
                    text = json.dumps({"video_id": vid, "title": title}) + "\n"
                    z.writestr(f"out/batch024/videos/UC{i}.ndjson.gz",
                               gzip.compress(text.encode()))
            result = names.audit(corpus, [], min_channels=3,
                                 reviewed_exclusions=["Santa Claus"])
            self.assertEqual(result["reviewed_nonperson_quarantined_labels"], 1)
            self.assertEqual(len(result["rows"]), 1)
            self.assertEqual(result["rows"][0]["candidate"], "Harriet Tubman")
            self.assertEqual(result["source_videos"], 6)

    def test_unicode_orthographic_key_is_diagnostic_only(self):
        self.assertEqual(names.orthographic_key("Simón Bolívar"), "simonbolivar")
        self.assertEqual(names.orthographic_key("Carter G. Woodson"),
                         names.orthographic_key("Carter G Woodson"))

if __name__ == "__main__":
    unittest.main()
