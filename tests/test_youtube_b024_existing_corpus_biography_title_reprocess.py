import gzip
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MODULE=ROOT/"scripts/youtube-b024-existing-corpus-biography-title-reprocess.py"
spec=importlib.util.spec_from_file_location("youtube_b024_old_corpus_title_reprocess",MODULE)
work=importlib.util.module_from_spec(spec)
spec.loader.exec_module(work)

class ActualSourceArchiveTitleReprocessTest(unittest.TestCase):
    def make_zip(self,base):
        path=base/"source.zip"
        items=[
            ("UC"+"A"*22,[
                ("aaaaaAAAAAA","The Life of Ada Lovelace"),
                ("aaaaaAAAABB","Bob Dylan sings The Death of Emmett Till"),
                ("aaaaaAAAACC","Emmett Till and Malcolm X biography")
            ]),
            ("UC"+"B"*22,[
                ("bbbbbBBBBBB","Ada Lovelace biography"),
                ("bbbbbBBBBBC","Life of Abraham Lincoln"),
                ("bbbbbBBBBBD","Adam Smith and the Wealth of Nations")
            ]),
            ("UC"+"C"*22,[
                ("cccccCCCCCC","Who was Ada Lovelace?"),
                ("cccccCCCCCD","The murder of Emmett Till")
            ])
        ]
        with zipfile.ZipFile(path,"w") as z:
            for cid,rows in items:
                payload="".join(json.dumps({"video_id":vid,"channel_id":cid,"title":title})+"\n"
                                for vid,title in rows).encode()
                z.writestr("original/"+cid+".ndjson.gz",gzip.compress(payload))
        return path

    def test_reuse_all_5965_independent_source_title_labels_not_registered_person_lexicon(self):
        labels=work.source_names()
        self.assertEqual(len(labels),5965)
        self.assertIn("Princess Diana",labels)
        self.assertEqual(labels["Princess Diana"]["source_original_title_mention_channels"],231)
        self.assertEqual(labels["Princess Diana"]["source_original_title_mention_videos"],453)
        self.assertIn("Abraham Lincoln",labels)
        self.assertFalse(labels["Abraham Lincoln"]["historical_live_discovery_name_exact"])

    def test_grammar_only_one_central_name_and_explicit_biography_required(self):
        t=work.title_topic_cue
        self.assertEqual(t("The Life of Ada Lovelace","Ada Lovelace",{"Ada Lovelace"}),
                         "EXPLICIT_BIOGRAPHY_TITLE_CUE")
        self.assertEqual(t("Ada Lovelace Documentary","Ada Lovelace",{"Ada Lovelace"}),
                         "EXPLICIT_BIOGRAPHY_TITLE_CUE")
        self.assertEqual(t("Who was Ada Lovelace?","Ada Lovelace",{"Ada Lovelace"}),
                         "EXPLICIT_BIOGRAPHY_TITLE_CUE")
        self.assertEqual(t("Death of Ada Lovelace","Ada Lovelace",{"Ada Lovelace"}),
                         "EVENT_OR_DEATH_TOPIC_HOLD")
        self.assertEqual(t("Adam Smith and the Wealth of Nations","Adam Smith",{"Adam Smith"}),
                         "NAME_MENTION_ONLY")
        self.assertEqual(t("Ada Lovelace and Malcolm X biography","Ada Lovelace",
                          {"Ada Lovelace","Malcolm X"}),"MULTIPLE_NAME_MATCH_HOLD")

    def test_exact_original_video_channel_id_biography_sets_and_holds(self):
        labels={name:{"source_original_title_mention_channels":0,
                      "source_original_title_mention_videos":0,
                      "historical_live_discovery_name_exact":True}
                for name in ["Ada Lovelace","Emmett Till","Malcolm X","Abraham Lincoln","Adam Smith"]}
        with tempfile.TemporaryDirectory() as tmp:
            archive=self.make_zip(Path(tmp))
            result=work.run(archive,labels,set(),expected_channels=3,
                            expected_videos=8,verify_archive=False)
            self.assertEqual(result["original_video_title_rows_scanned"],8)
            self.assertEqual(result["original_channel_files_scanned"],3)
            self.assertEqual(result["explicit_biography_title_video_ids"],4)
            self.assertEqual(result["video_content_verified_count"],0)
            self.assertEqual(result["production_writes"],0)
            self.assertFalse(result["rank_publication_allowed"])
            rows={row["raw_name"]:row for row in result["rows"]}
            self.assertEqual(rows["Ada Lovelace"]["strong_biography_title_original_channel_count"],3)
            self.assertEqual(rows["Ada Lovelace"]["strong_biography_title_original_video_count"],3)
            self.assertEqual(rows["Abraham Lincoln"]["strong_biography_title_original_channel_count"],1)
            self.assertNotIn("Emmett Till",rows)
            self.assertNotIn("Malcolm X",rows)
            self.assertNotIn("Adam Smith",rows)
            self.assertTrue(all(len(x["strong_biography_original_channel_ids"])==
                                x["strong_biography_title_original_channel_count"]
                                for x in result["rows"]))

    def test_known_nonperson_cannot_be_counted_as_biography(self):
        names={"Travel to Japan":{"source_original_title_mention_channels":1,
                                 "source_original_title_mention_videos":1,
                                 "historical_live_discovery_name_exact":False}}
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"source.zip"
            with zipfile.ZipFile(path,"w") as z:
                z.writestr("x/UC"+"A"*22+".ndjson.gz",gzip.compress(
                    json.dumps({"video_id":"ccccCCCC111","channel_id":"UC"+"A"*22,
                                "title":"Biography of Travel to Japan"}).encode()+b"\n"))
            result=work.run(path,names,{work.ORIGINAL.words("Travel to Japan")},
                            expected_channels=1,expected_videos=1,verify_archive=False)
            self.assertEqual(result["explicit_biography_title_video_ids"],0)
            self.assertEqual(result["title_hold_counters"]["KNOWN_NONPERSON_LABEL_HOLD"],1)

    def test_source_zip_population_drift_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=self.make_zip(Path(tmp))
            with self.assertRaisesRegex(ValueError,"B024_FULL_ARCHIVE_PARITY_FAILED"):
                work.run(path,{"Ada Lovelace":{"source_original_title_mention_channels":3,
                                              "source_original_title_mention_videos":3,
                                              "historical_live_discovery_name_exact":True}},
                         set(),verify_archive=False)

    def test_actual_watched_video_count_always_zero_even_when_title_is_biographical(self):
        src=MODULE.read_text()
        self.assertNotIn("yt_dlp",src)
        self.assertNotIn("urllib.request",src)
        self.assertIn('"original_video_actual_content_watched_verified":False',src)
        self.assertIn('"registered_person_exclusion_must_be_last":True',src)

if __name__=="__main__":
    unittest.main()
