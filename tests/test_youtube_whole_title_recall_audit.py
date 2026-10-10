import importlib.util
import gzip
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "scripts" / "youtube-whole-title-recall-audit.py"
spec = importlib.util.spec_from_file_location("whole_title_recall", PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class TestWholeTitleRecall(unittest.TestCase):
    def setUp(self):
        self.index = module.build_index(
            ["Princess Diana", "Diana", "Malcolm X", "Marilyn Monroe", "John Lennon"]
        )

    def test_whole_title_subject_middle(self):
        title = "Why Was Malcolm X Killed at 39?"
        matches = module.find_names(title, self.index)
        self.assertEqual([x[0] for x in matches], ["Malcolm X"])
        self.assertEqual(
            module.classify_match(title, matches[0][1], matches[0][2], 1),
            "focus_cue_review",
        )

    def test_name_in_possessive_title_not_automatically_certified(self):
        title = "Why Princess Diana’s Wedding Dress Was Wrinkled"
        matches = module.find_names(title, self.index)
        self.assertEqual([x[0] for x in matches], ["Princess Diana"])
        self.assertEqual(
            module.classify_match(title, matches[0][1], matches[0][2], 1),
            "mention_only",
        )

    def test_embedded_life_death_and_autopsy(self):
        examples = [
            ("The Untold Life and Tragic Death of Princess Diana", "Princess Diana"),
            ("The Autopsy of Marilyn Monroe Part 1", "Marilyn Monroe"),
        ]
        for title, name in examples:
            matches = module.find_names(title, self.index)
            self.assertEqual([x[0] for x in matches], [name])
            self.assertEqual(
                module.classify_match(title, matches[0][1], matches[0][2], 1),
                "focus_cue_review",
            )

    def test_short_name_not_inferred_to_full_name(self):
        self.assertEqual(
            module.find_names("Diana: Sacred and Wild Feminine", self.index), []
        )
        self.assertEqual(
            [x[0] for x in module.find_names("Princess Diana: her life", self.index)],
            ["Princess Diana"],
        )

    def test_multi_person_review(self):
        title = "Princess Diana and Marilyn Monroe - Legends"
        matches = module.find_names(title, self.index)
        self.assertEqual(len(matches), 2)
        self.assertTrue(
            all(
                module.classify_match(title, a, b, len(matches))
                == "multi_person_review"
                for _, a, b in matches
            )
        )

    def test_source_parity_and_original_id_dedup(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "corpus.zip"
            rows = [
                ("UC1", [
                    {"video_id": "x1", "title": "Why Was Malcolm X Killed?"},
                    {"video_id": "x2", "title": "Malcolm X and Marilyn Monroe"},
                ]),
                ("UC2", [
                    {"video_id": "x3", "title": "What Happened to Malcolm X?"},
                    {"video_id": "x4", "title": "Why Princess Diana’s Wedding Dress Was Wrinkled"},
                ]),
            ]
            with zipfile.ZipFile(archive, "w") as z:
                for channel, videos in rows:
                    z.writestr(
                        f"out/batch024/videos/{channel}.ndjson.gz",
                        gzip.compress(
                            "".join(json.dumps(x) + "\n" for x in videos).encode()
                        ),
                    )
            snapshot = {
                "snapshot": {
                    "snapshot_id": "test", "channel_count": 2, "video_count": 4
                },
                "signals": [
                    {"raw_name": n}
                    for n in ("Malcolm X", "Marilyn Monroe", "Princess Diana", "Diana")
                ],
            }
            result = module.audit_source(archive, snapshot)
            by_name = {r["raw_name"]: r for r in result["rows"]}
            self.assertEqual(
                by_name["Malcolm X"]["title_mention_distinct_channels"], 2
            )
            self.assertEqual(
                by_name["Malcolm X"]["title_mention_distinct_videos"], 3
            )
            self.assertEqual(
                by_name["Malcolm X"]["focus_cue_review_distinct_videos"], 2
            )
            self.assertEqual(
                by_name["Malcolm X"]["multi_person_review_distinct_videos"], 1
            )
            self.assertEqual(
                by_name["Princess Diana"]["focus_cue_review_distinct_videos"], 0
            )
            self.assertFalse(result["published_rank_eligible"])
            with self.assertRaisesRegex(ValueError, "parity mismatch"):
                module.audit_source(
                    archive,
                    dict(
                        snapshot,
                        snapshot=dict(snapshot["snapshot"], video_count=9),
                    ),
                )


if __name__ == "__main__":
    unittest.main()
