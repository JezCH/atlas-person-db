import gzip
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "youtube-b024-source-wide-video-id-ledger.py"
spec = importlib.util.spec_from_file_location("b024_full_source_video_ledger", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
UC1 = "UC" + "A"*22
UC2 = "UC" + "B"*22
V1 = "AbCdEfGhI12"
V2 = "AbCdEfGhI13"
V3 = "AbCdEfGhI14"


class SourceWideIdLedgerTest(unittest.TestCase):
    def fixture(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        zip_path = Path(temp.name) / "small-original.zip"
        with zipfile.ZipFile(zip_path, "w") as archive:
            for ch, pairs in ((UC1, [(V1, "The Life of Emmett Till"),
                                      (V2, "Alexander the Great - biography")]),
                              (UC2, [(V3, "The Middle East and Emmett Till")])):
                lines = "".join(json.dumps({"video_id": v, "channel_id": ch, "title": title}) + "\n"
                                for v, title in pairs)
                archive.writestr("batch008/videos/" + ch + ".ndjson.gz",
                                 gzip.compress(lines.encode()))
        old = {"source_snapshot_id": module.SNAPSHOT,
               "successful_channels": 2, "original_videos": 3,
               "rows": [
                   {"raw_name":"Alexander the Great",
                    "title_mention_distinct_channels":1, "title_mention_distinct_videos":1},
                   {"raw_name":"Middle East",
                    "title_mention_distinct_channels":0, "title_mention_distinct_videos":0}
               ]}
        add = {"source_snapshot_id":module.SNAPSHOT,
               "source_channels":2, "source_videos":3,
               "unreviewed_labels_examined":1,
               "rows":[{"raw_name":"Emmett Till",
                        "title_evidence_buckets":{"BIOGRAPHICAL_TITLE_CUE_REVIEW":{
                            "video_ids":[V1], "channel_ids":[UC1]}}}]}
        return zip_path, old, add, Path(temp.name) / "ledger"

    def run_replay(self,archive,old,add,prefix):
        return module.replay(archive,old,add,prefix,verify_archive=False,
                             expected_channels=2,expected_videos=3,
                             expected_old=2,expected_new=1)

    def test_maximal_name_match_does_not_count_embedded_shorter_name(self):
        trie = module.make_index(["Dr Martin Luther King Jr","Martin Luther King",
                                   "Martin Luther","Alexander the Great"])
        matches = module.title_name_matches(
            "The life of Dr Martin Luther King Jr and Alexander the Great", trie)
        self.assertEqual(matches, {"Dr Martin Luther King Jr","Alexander the Great"})

    def test_exact_additional_source_ids_override_new_string_grammar_and_preserve_all_titles(self):
        archive, old, add, prefix = self.fixture()
        output = self.run_replay(archive,old,add,prefix)
        names = {x["raw_name"]:x for x in output["rows"]}
        self.assertEqual(output["independent_raw_name_labels"],3)
        self.assertEqual(output["matched_original_video_ids"],3)
        self.assertEqual(names["Emmett Till"]["original_video_ids"],[V1])
        self.assertEqual(names["Emmett Till"]["original_channel_ids"],[UC1])
        self.assertEqual(output["legacy5720_changed_aggregate_rows_REVIEW_ONLY"],1)
        self.assertFalse(output["production_rank_publishable"])
        self.assertFalse(output["historical_individual_personhood_verified"])
        with gzip.open(str(prefix)+".ndjson.gz","rt",encoding="utf8") as f:
            source_rows = [json.loads(line) for line in f]
        self.assertEqual({v["video_id"] for v in source_rows},{V1,V2,V3})
        self.assertEqual(len(source_rows),3)

    def test_fail_closed_if_trusted_name_video_id_or_channel_changes(self):
        archive, old, add, prefix = self.fixture()
        add["rows"][0]["title_evidence_buckets"]["BIOGRAPHICAL_TITLE_CUE_REVIEW"]["video_ids"] = [V1, V3]
        with self.assertRaisesRegex(ValueError,"TRUSTED_245_ORIGINAL_CHANNEL_ID"):
            self.run_replay(archive,old,add,prefix)
        archive, old, add, prefix = self.fixture()
        add["rows"][0]["title_evidence_buckets"]["BIOGRAPHICAL_TITLE_CUE_REVIEW"]["video_ids"] = ["Z"*11]
        with self.assertRaisesRegex(ValueError,"REVIEWED_ORIGINAL_245_VIDEO_IDS_NOT_FOUND"):
            self.run_replay(archive,old,add,prefix)
        archive, old, add, prefix = self.fixture()
        add["rows"][0]["raw_name"] = "Alexander the Great"
        with self.assertRaisesRegex(ValueError,"INDEPENDENT_LABEL_POPULATION_OR_COLLISION"):
            self.run_replay(archive,old,add,prefix)


if __name__ == "__main__":
    unittest.main()
