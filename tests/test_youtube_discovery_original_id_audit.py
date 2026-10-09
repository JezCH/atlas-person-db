#!/usr/bin/env python3
import gzip
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "youtube-audit-discovery-alias-unions.py"
spec = importlib.util.spec_from_file_location("discovery_id_audit", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def fixture(root):
    root = Path(root)
    folder = root / "corpus" / "out" / "batch024"
    (folder / "videos").mkdir(parents=True)
    data = {
        "UC_A": [("a1", "Pelé: Career"), ("a2", "Pele: Football"),
                 ("a3", "Picasso: His Art"), ("a4", "Pablo Picasso: His Art")],
        "UC_B": [("b1", "Pelé: Career"), ("b2", "Pele: Football"),
                 ("b3", "Picasso: His Art"), ("b4", "Pablo Picasso: His Art")],
        "UC_C": [("c1", "Pelé: Career"), ("c2", "Pele: Football"),
                 ("c3", "Picasso: His Art"), ("c4", "Pablo Picasso: His Art")],
    }
    manifest = []
    for channel, videos in data.items():
        with gzip.open(folder / "videos" / (channel + ".ndjson.gz"),
                       "wt", encoding="utf-8") as handle:
            for video_id, title in videos:
                handle.write(json.dumps({"channel_id": channel, "video_id": video_id,
                                         "title": title}, ensure_ascii=False) + "\n")
        manifest.append({"channel_id": channel, "status": "OK", "count": len(videos)})
    manifest.append({"channel_id": "UC_ERR", "status": "ERR", "count": 0})
    (folder / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    targets = root / "targets.json"
    targets.write_text(json.dumps({
        "schema": mod.TARGET_SCHEMA,
        "orthographic_groups": [{"aliases": ["Pele", "Pelé"]}],
        "identity_review_groups": [{"aliases": ["Picasso", "Pablo Picasso"]}]
    }), encoding="utf-8")
    return root / "corpus", targets


def run(root, targets, **overrides):
    params = dict(source_snapshot_id="yt-test-snapshot", expected_channels=3,
                  expected_videos=12, expected_selected=4)
    params.update(overrides)
    return mod.audit(root, targets, **params)


class OriginalIdDiscoveryAuditTests(unittest.TestCase):
    def test_original_channel_union_deduplicates_but_videos_remain_individual(self):
        with tempfile.TemporaryDirectory() as temp:
            root, targets = fixture(temp)
            report = run(root, targets)
            orth, review = report["groups"]
            self.assertEqual(orth["channel_id_union_count"], 3)
            self.assertEqual(orth["video_id_union_count"], 6)
            self.assertEqual(orth["overlapping_channel_memberships"], 3)
            self.assertEqual(orth["overlapping_video_memberships"], 0)
            self.assertTrue(orth["complete_published_aliases"])
            self.assertEqual([x["original_channel_count"] for x in orth["per_alias"]], [3, 3])
            self.assertEqual(review["channel_id_union_count"], 3)
            self.assertEqual(review["video_id_union_count"], 6)
            self.assertEqual(review["decision"], "do_not_auto_merge")
            self.assertTrue(report["policy"]["review_groups_never_auto_merge"])
            self.assertFalse(report["policy"]["production_writes"])
            self.assertEqual(report["source"]["source_video_rows"], 12)

    def test_non_matching_frontier_and_baseline_fail_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            root, targets = fixture(temp)
            with self.assertRaisesRegex(ValueError, "CORPUS_BASELINE_MISMATCH"):
                run(root, targets, expected_videos=13)
            source = root / "out" / "batch024" / "manifest.json"
            data = json.loads(source.read_text(encoding="utf-8"))
            data.append({"channel_id": "UC_A", "status": "ERR", "count": 0})
            source.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "DUPLICATE_OR_EMPTY_CHANNEL"):
                run(root, targets)

    def test_orthographic_aliases_must_share_key(self):
        with tempfile.TemporaryDirectory() as temp:
            root, targets = fixture(temp)
            doc = json.loads(targets.read_text())
            doc["orthographic_groups"][0]["aliases"] = ["Picasso", "Pablo Picasso"]
            targets.write_text(json.dumps(doc))
            with self.assertRaisesRegex(ValueError, "ORTHOGRAPHIC_GROUP_HAS_DIFFERENT_IDENTITY_KEY"):
                mod.load_targets(targets)

    def test_reviewed_nonhistorical_person_is_not_audited_as_historical_candidate(self):
        with tempfile.TemporaryDirectory() as temp:
            root, targets = fixture(temp)
            doc = json.loads(targets.read_text())
            doc["orthographic_groups"][0]["aliases"] = ["Hercules", "HÉRCULES"]
            targets.write_text(json.dumps(doc))
            report = run(root, targets)
            self.assertEqual(report["groups"][0]["channel_id_union_count"], 0)
            self.assertEqual(report["groups"][1]["channel_id_union_count"], 3)


if __name__ == "__main__":
    unittest.main()
