import gzip
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "youtube-new-label-full-corpus-audit.py"
spec = importlib.util.spec_from_file_location("youtube_new_label_full", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class FullCorpusNewNameTests(unittest.TestCase):
    def reference(self, channels=3, videos=5):
        return {"snapshot": {"snapshot_id": "source-snap",
                             "channel_count": channels, "video_count": videos}}

    def cues(self):
        return {
            "schema": "youtube-open-vocabulary-name-cue-audit/v2",
            "reference_source_snapshot_id": "source-snap",
            "source_channels": 3, "source_videos": 5,
            "rows": [
                {"candidate": "Emmett Till", "candidate_fold_status": "NEW_LABEL_REVIEW",
                 "distinct_channels": 3, "distinct_videos": 3},
                {"candidate": "Simon Bolivar",
                 "candidate_fold_status": "POSSIBLE_ORTHOGRAPHIC_VARIANT",
                 "distinct_channels": 3, "distinct_videos": 3},
                {"candidate": "Santa Claus", "candidate_fold_status": "NEW_LABEL_REVIEW",
                 "distinct_channels": 3, "distinct_videos": 3},
                {"candidate": "America’s Most", "candidate_fold_status": "NEW_LABEL_REVIEW",
                 "distinct_channels": 3, "distinct_videos": 3},
                {"candidate": "America's Most", "candidate_fold_status": "NEW_LABEL_REVIEW",
                 "distinct_channels": 3, "distinct_videos": 3},
            ],
        }

    def write_zip(self, filename):
        videos = [
            ("UC1", [
                {"video_id": "v1", "title": "Why Emmett Till was killed?"},
                {"video_id": "v2", "title": "Santa Claus and Emmett Till"},
            ]),
            ("UC2", [{"video_id": "v3", "title": "Emmett Till: Biography"}]),
            ("UC3", [
                {"video_id": "v4", "title": "Simon Bolívar // Emmett Till"},
                {"video_id": "v5", "title": "The life of Simon Bolivar"},
            ]),
        ]
        with zipfile.ZipFile(filename, "w") as archive:
            for channel, rows in videos:
                archive.writestr(
                    f"batch024/videos/{channel}.ndjson.gz",
                    gzip.compress(
                        "".join(json.dumps(row) + "\n" for row in rows).encode()
                    ),
                )

    def test_original_ids_not_aggregates(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.zip"
            self.write_zip(source)
            result = mod.scan_original_ids(
                source, self.cues(), self.reference(), reviewed_nonperson=["Santa Claus"]
            )
            rows = {row["candidate"]: row for row in result["rows"]}
            self.assertEqual(rows["Emmett Till"]["title_mention_distinct_channels"], 3)
            self.assertEqual(rows["Emmett Till"]["title_mention_distinct_videos"], 4)
            self.assertEqual(rows["Emmett Till"]["original_video_ids"],
                             ["v1", "v2", "v3", "v4"])
            self.assertEqual(rows["Simon Bolivar"]["title_mention_distinct_channels"], 1)
            self.assertEqual(rows["Simon Bolivar"]["identity_disposition"],
                             "POSSIBLE_ORTHOGRAPHIC_VARIANT")
            self.assertNotIn("Santa Claus", rows)
            self.assertEqual(len(result["quarantined_normalization_collision_groups"]), 1)
            self.assertFalse(result["publication_eligible"])

    def test_strict_snapshot_and_sha_guards(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.zip"
            self.write_zip(source)
            with self.assertRaisesRegex(ValueError, "snapshot_id mismatch"):
                mod.scan_original_ids(
                    source,
                    {**self.cues(), "reference_source_snapshot_id": "different"},
                    self.reference()
                )
            with self.assertRaisesRegex(ValueError, "totals mismatch"):
                mod.scan_original_ids(source, self.cues(), self.reference(videos=50))
            with self.assertRaisesRegex(ValueError, "SHA256 mismatch"):
                mod.scan_original_ids(
                    source, self.cues(), self.reference(),
                    expected_source_sha256="0" * 64
                )

    def test_quarantine_single_tokens_and_reviewed_nonpersons(self):
        raw = [
            {"candidate": "Diana", "candidate_fold_status": "NEW_LABEL_REVIEW",
             "distinct_channels": 3},
            {"candidate": "King Arthur", "candidate_fold_status": "NEW_LABEL_REVIEW",
             "distinct_channels": 3},
            {"candidate": "Carter G. Woodson", "candidate_fold_status": "NEW_LABEL_REVIEW",
             "distinct_channels": 3},
        ]
        matcher, groups, _, removed = mod.compile_names(raw, ["King Arthur"])
        self.assertEqual(list(groups), ["carter g woodson"])
        self.assertEqual(removed["reviewed_nonperson"], 1)
        self.assertEqual(removed["unsafe_single_token"], 1)
        self.assertEqual(matcher.findall("life of carter g woodson"),
                         ["carter g woodson"])


if __name__ == "__main__":
    unittest.main()
