import gzip
import hashlib
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "youtube-b024-unreviewed-title-evidence.py"
spec = importlib.util.spec_from_file_location("youtube_b024_245_focus", SCRIPT)
focus = importlib.util.module_from_spec(spec)
spec.loader.exec_module(focus)


class Unreviewed245TitleEvidenceTest(unittest.TestCase):
    def fixture(self, source):
        originals = {
            "UC1": [("v1","The Life of Emmett Till"),
                    ("v2","Emmett Till and Another Person")],
            "UC2": [("v3","Emmett Till: Biography")],
            "UC3": [("v4","The Life of Kim Jong-un"),
                    ("v5","More About South Africa")]
        }
        with zipfile.ZipFile(source,"w") as z:
            for channel, videos in originals.items():
                stream = "".join(json.dumps({"video_id":vid,"title":title})+"\n"
                                 for vid,title in videos)
                z.writestr(f"batch024/videos/{channel}.ndjson.gz",
                           gzip.compress(stream.encode()))
        review = {
            "schema":"youtube-b024-source-label-and-title-focus-review/v1",
            "source_snapshot_id":"fixture", "source_channels":3,"source_videos":5,
            "rows":[
                {"raw_name":"Emmett Till","disposition":"UNREVIEWED_PERSONHOOD"},
                {"raw_name":"Kim Jong Un","disposition":"UNREVIEWED_PERSONHOOD"},
                {"raw_name":"South Africa","disposition":"EXACT_NONPERSON_LABEL_REVIEWED"}
            ]
        }
        def evidence(label,chs,vids):
            return {"candidate":label,"original_channel_ids":chs,
                    "original_video_ids":vids,"identity_disposition":"NEW_LABEL_REVIEW"}
        recount = {
            "schema":"youtube-new-label-fulltitle-original-id-recall/v1",
            "source_snapshot_id":"fixture","source_channels":3,"source_videos":5,
            "rows":[
                evidence("Emmett Till",["UC1","UC2"],["v1","v2","v3"]),
                evidence("Kim Jong Un",["UC3"],["v4"]),
                evidence("South Africa",["UC3"],["v5"])
            ]
        }
        return review,recount,hashlib.sha256(source.read_bytes()).hexdigest()

    def audit_fixture(self,source,review,recount,sha):
        return focus.audit(source,review,recount,expected_channels=3,
                           expected_videos=5,expected_labels=2,sha=sha,
                           snapshot="fixture")

    def test_original_video_id_unions_and_nonperson_label_quarantine(self):
        with tempfile.TemporaryDirectory() as temp:
            source=Path(temp)/"source.zip"
            review,recount,sha=self.fixture(source)
            out=self.audit_fixture(source,review,recount,sha)
            by_name={r["raw_name"]:r for r in out["rows"]}
            self.assertEqual(out["unreviewed_raw_name_labels"],2)
            self.assertNotIn("South Africa",by_name)
            self.assertEqual(by_name["Emmett Till"]["title_mention_original_channels"],2)
            self.assertEqual(by_name["Emmett Till"]["title_mention_original_videos"],3)
            self.assertIn("JOINT_PERSON_OR_EVENT_REVIEW",
                          by_name["Emmett Till"]["buckets"])
            self.assertEqual(by_name["Kim Jong Un"]["title_topic_cue_channels_REVIEW_ONLY"],1)
            self.assertFalse(out["published_rank_eligible"])
            self.assertTrue(out["no_registered_person_uuid_lexicon"])

    def test_title_punctuation_diacritics_zero_width_and_creative_work(self):
        for title,name in [
            ("The Life of Kim Jong-un","Kim Jong Un"),
            ("Biografía de Mary, Queen of Scots","Mary Queen of Scots"),
            ("Biography of Carter G. Woodson","Carter G Woodson"),
            ("The Life of JESUS \u200b\u200bCHRIST","Jesus Christ")
        ]:
            self.assertEqual(focus.bucket(title,name),"BIOGRAPHICAL_TITLE_CUE_REVIEW")
        self.assertEqual(
            focus.bucket("Frédéric Chopin – Nocturne Piano Performance","Frédéric Chopin"),
            "WORK_OR_PERFORMANCE_REVIEW")
        self.assertEqual(
            focus.bucket("The Life of Emmett Till and Another Leader","Emmett Till"),
            "JOINT_PERSON_OR_EVENT_REVIEW")
        self.assertEqual(
            focus.bucket("The History of St Patrick's Cathedral","St Patrick"),
            "PERSON_NAMED_EVENT_OR_INSTITUTION_REVIEW")
        self.assertEqual(
            focus.bucket("St Patrick's Day Celebration","St Patrick"),
            "PERSON_NAMED_EVENT_OR_INSTITUTION_REVIEW")

    def test_exact_source_identity_and_digest_guards(self):
        with tempfile.TemporaryDirectory() as temp:
            source=Path(temp)/"source.zip"
            review,recount,sha=self.fixture(source)
            with self.assertRaisesRegex(ValueError,"SHA256"):
                self.audit_fixture(source,review,recount,"0"*64)
            with self.assertRaisesRegex(ValueError,"SNAPSHOT"):
                self.audit_fixture(source,{**review,"source_snapshot_id":"wrong"},
                                   recount,sha)
            wrong=json.loads(json.dumps(recount))
            wrong["rows"][0]["original_video_ids"]=["v1","v2","v4"]
            with self.assertRaisesRegex(ValueError,"ORIGINAL_ID_PARITY"):
                self.audit_fixture(source,review,wrong,sha)
            wrong=json.loads(json.dumps(review))
            wrong["rows"][0]["disposition"]="EXACT_NONPERSON_LABEL_REVIEWED"
            with self.assertRaisesRegex(ValueError,"NAME_LABEL_COUNT"):
                self.audit_fixture(source,wrong,recount,sha)


if __name__ == "__main__":
    unittest.main()
