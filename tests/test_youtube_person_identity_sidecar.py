#!/usr/bin/env python3
"""Regression tests for read-only Person UUID signal unions."""
import csv
import gzip
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "youtube-person-identity-sidecar.py"
spec = importlib.util.spec_from_file_location("youtube_identity_sidecar", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
P_NAP = "945b78a7-3941-5e05-a6c9-ce57e7395727"
P_YI = "ea13e48a-94ef-5648-98be-f74554778166"
P_OTHER = "afe59ea0-afac-5c0f-b767-b6aeaa680456"


def corpus(tmp, extra_titles=None):
    root = Path(tmp)
    batch = root / "out" / "batch024"
    (batch / "videos").mkdir(parents=True)
    sources = {
        "UC_A": [
            ("n1", "Napoleon Bonaparte: The Emperor"),
            ("n1", "Napoleon: The Emperor"),  # duplicate video ID across reviewed labels
            ("y1", "李舜臣: Admiral Yi"),
            ("x1", "How Napoleon Changed Europe"),  # never parse a substring
            ("x2", "Napoleon III: His Empire"),  # never ascribe Napoleon III to Napoleon I
        ],
        "UC_B": [
            ("n2", "Napoleon | History"),
            ("y2", "이순신: 조선의 장군"),
            ("z2", "孔子: Chinese philosopher"),
        ],
    }
    for channel, additions in (extra_titles or {}).items():
        sources[channel].extend(additions)
    manifest = []
    for channel, videos in sources.items():
        with gzip.open(batch / "videos" / (channel + ".ndjson.gz"),
                       "wt", encoding="utf-8") as handle:
            for video_id, title in videos:
                handle.write(json.dumps({"video_id": video_id, "channel_id": channel,
                                         "title": title}, ensure_ascii=False) + "\n")
        manifest.append({"channel_id": channel, "status": "OK", "count": len(videos)})
    manifest.append({"channel_id": "UC_ERR", "status": "ERR", "count": 0})
    (batch / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return root


def sources(tmp):
    root = Path(tmp)
    path = root / "audit.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            "rank", "raw_name", "channels", "videos", "review_lane",
            "registered_uuids", "reviewed_living", "flags"
        ])
        writer.writeheader()
        for i, (name, uuid) in enumerate([
            ("Napoleon Bonaparte", P_NAP), ("Napoleon", P_NAP),
            ("Yi Sun-sin", P_YI), ("Confucius", P_OTHER),
        ], 1):
            writer.writerow({"rank": i, "raw_name": name, "channels": 3, "videos": 3,
                             "review_lane": "REGISTERED", "registered_uuids": uuid,
                             "reviewed_living": "no"})
    registration = root / "registration.json"
    registration.write_text(json.dumps([
        {"alias_name": "Napoleon", "canonical_key": "Napoleon I"},
        {"alias_name": "Napoleon Bonaparte", "canonical_key": "Napoleon I"},
    ]), encoding="utf-8")
    reviewed = root / "reviewed.json"
    reviewed.write_text(json.dumps({
        "schema": "atlas-youtube-person-identity-aliases/v1",
        "aliases": [
            {"alias": "이순신", "registered_basis": "Yi Sun-sin"},
            {"alias": "李舜臣", "registered_basis": "Yi Sun-sin"},
            {"alias": "孔子", "registered_basis": "Confucius"},
        ]
    }), encoding="utf-8")
    return path, registration, reviewed


def run(tmp, **overrides):
    audit, registration, reviewed = sources(tmp)
    options = dict(source_run_id="37921755392", source_artifact_id="11613130249",
                   source_digest="sha256:test", expected_channels=2,
                   expected_videos=8, expected_selected=3,
                   production_snapshot_id="yt-20261009T120819Z-10127ch-rebuild-v4")
    extra_titles = overrides.pop("extra_titles", None)
    options.update(overrides)
    return module.aggregate(corpus(tmp, extra_titles), audit, registration, reviewed, **options)


class PersonIdentitySidecarTests(unittest.TestCase):
    def test_same_uuid_merges_distinct_channels_and_video_ids(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = run(tmp)
            by_id = {p["person_id"]: p for p in result["persons"]}
            self.assertEqual(by_id[P_NAP]["distinct_channel_count"], 2)
            self.assertEqual(by_id[P_NAP]["distinct_video_count"], 2)
            variants = {v["raw_name_key"]: v for v in by_id[P_NAP]["matched_variants"]}
            self.assertEqual(variants["napoleon"]["channels"], 2)
            self.assertEqual(variants["napoleon bonaparte"]["channels"], 1)
            self.assertEqual(by_id[P_YI]["distinct_channel_count"], 2)
            self.assertEqual(by_id[P_OTHER]["distinct_channel_count"], 1)
            self.assertEqual(result["source"]["source_video_rows"], 8)
            self.assertIs(result["method"]["production_writes"], False)
            self.assertIs(result["method"]["raw_title_rankings_modified"], False)


    def test_full_title_multilingual_mentions_and_disambiguation(self):
        with tempfile.TemporaryDirectory() as tmp:
            titles = {
                "UC_A": [
                    ("ym1", "이순신 장군의 명량해전"),
                    ("ym2", "이순신의 삶을 알아보자"),
                    ("nm1", "How Napoleon Bonaparte changed Europe"),
                    ("nm2", "The Rise of Napoleon III in France"),
                ],
                "UC_B": [
                    ("ym3", "Why Yi Sun-sin mattered"),
                    ("ym4", "李舜臣, Admiral of Joseon"),
                ],
            }
            result = run(tmp, extra_titles=titles, expected_videos=14, mentions=True)
            rows = {row["person_id"]: row for row in result["persons"]}
            self.assertEqual(rows[P_YI]["distinct_channel_count"], 2)
            self.assertEqual(rows[P_YI]["distinct_video_count"], 6)
            self.assertEqual(rows[P_NAP]["distinct_channel_count"], 2)
            self.assertEqual(rows[P_NAP]["distinct_video_count"], 3)
            self.assertGreaterEqual(result["summary"]["mention_only_title_rows"], 5)
            self.assertEqual(result["source"]["source_video_rows"], 14)
            self.assertGreater(result["method"]["reviewed_in_title_alias_count"], 0)
            self.assertIs(result["method"]["production_writes"], False)

    def test_mention_boundary_avoids_substrings_homonyms_and_roman_numerals(self):
        matcher = module.load_mention_module().ReviewedMentionMatcher({
            "napoleon i": P_NAP, "napoleon iii": P_OTHER,
            "이순신": P_YI, "mozart": P_OTHER,
        })
        self.assertEqual(matcher.find("Why Napoleon III ruled"),
                         {("napoleon iii", P_OTHER)})
        self.assertEqual(matcher.find("Napoleon IV"), set())
        self.assertEqual(matcher.find("Supermozartian stories"), set())
        self.assertEqual(matcher.find("김이순신모방"), set())
        self.assertEqual(matcher.find("이순신의 업적"), {("이순신", P_YI)})
        self.assertEqual(matcher.find("이순신학설"), set())
        self.assertEqual(matcher.find("모차르트"), set())

    def test_mention_catalog_rejects_unverified_single_word_surnames(self):
        resolved = {"napoleon": P_NAP, "napoleon bonaparte": P_NAP,
                    "alexander": P_OTHER, "이순신": P_YI}
        doc = {"aliases": [{"alias": "이순신", "registered_basis": "Yi Sun-sin"}]}
        matcher, catalog = module.load_mention_module().build_matcher(
            resolved, {"napoleon": P_NAP, "napoleon bonaparte": P_NAP,
                       "alexander": P_OTHER}, doc
        )
        self.assertNotIn("napoleon", catalog)
        self.assertNotIn("alexander", catalog)
        self.assertIn("napoleon bonaparte", catalog)
        self.assertIn("이순신", catalog)
        self.assertEqual(matcher.find("How Napoleon III won"), set())

    def test_wrong_baseline_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError, "CORPUS_BASELINE_MISMATCH"):
                run(tmp, expected_videos=9)

    def test_reviewed_alias_must_have_verified_uuid(self):
        with tempfile.TemporaryDirectory() as tmp:
            audit, registration, reviewed = sources(tmp)
            data = json.loads(reviewed.read_text())
            data["aliases"].append({"alias": "세종", "registered_basis": "Unregistered Person"})
            reviewed.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, "REVIEWED_ALIAS_WITHOUT_REGISTERED_PERSON"):
                module.build_resolution(audit, registration, reviewed)

    def test_conflicting_aliases_are_withheld_not_merged(self):
        with tempfile.TemporaryDirectory() as tmp:
            audit, registration, reviewed = sources(tmp)
            data = json.loads(reviewed.read_text())
            data["aliases"].append({"alias": "Napoleon", "registered_basis": "Confucius"})
            reviewed.write_text(json.dumps(data))
            resolved, ambiguous, *_ = module.build_resolution(audit, registration, reviewed)
            self.assertNotIn("napoleon", resolved)
            self.assertIn("napoleon", ambiguous)

    def test_registered_source_rejects_identity_conflict(self):
        with tempfile.TemporaryDirectory() as tmp:
            audit, registration, reviewed = sources(tmp)
            with audit.open("a", encoding="utf-8") as handle:
                handle.write('5,Napoleon,3,3,REGISTERED,' + P_YI + ',no,\n')
            with self.assertRaisesRegex(ValueError, "AUDIT_IDENTITY_CONFLICT"):
                module.build_resolution(audit, registration, reviewed)


if __name__ == "__main__":
    unittest.main()
