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
SCRIPT = ROOT / "scripts" / "youtube-b024-reviewed-source-id-name-unions.py"
MANIFEST = ROOT / "audits" / "youtube-b024-reviewed-original-id-variant-groups.json"
spec = importlib.util.spec_from_file_location("youtube_b024_aliases", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class SourceIdAliasUnionTest(unittest.TestCase):
    def make_corpus(self, path):
        rows = {
            "UC1": [("v1", "Simon Bolivar and Mary Queen of Scots")],
            "UC2": [("v2", "Simón Bolívar and Mary, Queen of Scots")],
            "UC3": [
                ("v3", "Princess Diana, Diana Moore, and Prince Edward Island"),
                ("v4", "Queen Elizabeth II — Not Elizabeth the First"),
            ],
        }
        with zipfile.ZipFile(path, "w") as z:
            for channel, videos in rows.items():
                raw = "".join(
                    json.dumps({"video_id": vid, "title": title}) + "\n"
                    for vid, title in videos
                )
                z.writestr(
                    f"out/batch024/videos/{channel}.ndjson.gz",
                    gzip.compress(raw.encode())
                )
        return hashlib.sha256(path.read_bytes()).hexdigest()

    def test_original_union_overlap_and_identity_holds(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "original.zip"
            sha = self.make_corpus(source)
            config = copy.deepcopy(json.loads(MANIFEST.read_text(encoding="utf-8")))
            config["source_zip_sha256"] = sha
            config["expected_source_channel_count"] = 3
            config["expected_source_video_count"] = 4
            known = {
                "Simón Bolívar": (2, 2, 0),
                "Mary, Queen of Scots": (2, 2, 0),
                "Princess Diana [short HOLD]": (1, 1, 1),
                "Prince Edward [place HOLD]": (1, 1, 1),
            }
            for group in config["groups"]:
                channels, videos, inflation = known.get(group["name"], (0, 0, 0))
                group["expected_unique_original_channel_ids"] = channels
                group["expected_unique_original_video_ids"] = videos
                group["expected_invalid_channel_sum_inflation"] = inflation
            result = mod.audit(source, config)
            by_name = {v["name"]: v for v in result["groups"]}
            self.assertEqual(by_name["Simón Bolívar"]["distinct_original_channel_id_union"], 2)
            self.assertEqual(by_name["Mary, Queen of Scots"]["distinct_original_video_id_union"], 2)
            self.assertEqual(by_name["Princess Diana [short HOLD]"]["incorrect_sum_channel_inflation"], 1)
            self.assertFalse(by_name["Princess Diana [short HOLD]"]["eligible_for_person_union"])
            self.assertFalse(by_name["Prince Edward [place HOLD]"]["eligible_for_person_union"])
            self.assertEqual(by_name["Elizabeth I"]["distinct_original_channel_id_union"], 0)
            self.assertFalse(result["production_publication_eligible"])
            self.assertFalse(result["registered_person_uuid_based"])

            with self.assertRaisesRegex(ValueError, "SHA256"):
                mod.audit(source, {**config, "source_zip_sha256": "0" * 64})
            with self.assertRaisesRegex(ValueError, "POPULATION"):
                mod.audit(source, {**config, "expected_source_video_count": 5})
            bad = copy.deepcopy(config)
            bad["groups"][0]["expected_unique_original_channel_ids"] = 999
            with self.assertRaisesRegex(ValueError, "COUNTS_MISMATCH"):
                mod.audit(source, bad)


if __name__ == "__main__":
    unittest.main()
