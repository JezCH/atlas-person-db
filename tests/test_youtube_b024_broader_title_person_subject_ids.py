import gzip
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location(
    "youtube_b024_more_original_id_profile_title_cues",
    ROOT/"scripts/youtube-b024-broader-title-person-subject-ids.py")
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class ExistingArchiveBroaderPersonTitleTest(unittest.TestCase):
    def test_actual_2241_full_runtime_source_reused_never_registered_names_as_source_lexicon(self):
        forms,old,old_videos,lexicon=mod.candidate_groups()
        self.assertEqual(len(old),2241)
        self.assertEqual(len(old_videos),6162)
        self.assertEqual(len(lexicon),5965)
        self.assertIn("Stephen Hawking",forms)
        self.assertIn("Princess Diana",forms)
        self.assertEqual(sum(len(x[1]) for x in old.values()),6162)

    def test_title_profile_candidates_are_distinct_from_weak_mentions_performances_and_joint_names(self):
        cue=mod.additional_explicit_profile_cue
        self.assertEqual(cue("Alice Lovelace: The Untold Story of Mathematics",
                             "Alice Lovelace",{"Alice Lovelace"}),
                         "NAME_HEADING_EXPLICIT_PROFILE_REVIEW")
        self.assertEqual(cue("Historical Profile: Alice Lovelace",
                             "Alice Lovelace",{"Alice Lovelace"}),
                         "PROFILE_OF_PERSON_REVIEW")
        self.assertEqual(cue("10 Facts About Alice Lovelace",
                             "Alice Lovelace",{"Alice Lovelace"}),
                         "PROFILE_OF_PERSON_REVIEW")
        for title in [
            "Alice Lovelace guitar solo live concert",
            "Alice Lovelace and Charles Babbage discussing computing",
            "Alice Lovelace quotes compilation",
            "The death of Alice Lovelace",
            "Alice Lovelace",
            "The book of Alice Lovelace",
            "Alice Lovelace: trailer for the film"
        ]:
            with self.subTest(title=title):
                self.assertIsNone(cue(title,"Alice Lovelace",{"Alice Lovelace"}))
        self.assertIsNone(cue("Alice Lovelace: The Untold Story",
                              "Alice Lovelace",{"Alice Lovelace","Charles Babbage"}))

    def fake_archive(self,root):
        channel1="UC"+"A"*22
        channel2="UC"+"B"*22
        entries={
            channel1:[
                ("aaaaaaaaaaa","Biography of Alice Lovelace"),
                ("bbbbbbbbbbb","Alice Lovelace: The Untold Story of Mathematics"),
                ("ccccccccccc","Alice Lovelace and Charles Babbage interview")
            ],
            channel2:[
                ("ddddddddddd","Alice Lovelace: 10 facts about her life"),
                ("eeeeeeeeeee","Historical Profile: Alice Lovelace"),
                ("fffffffffff","Alice Lovelace guitar solo live concert")
            ]
        }
        zip_path=root/"retained-previous-originals.zip"
        with zipfile.ZipFile(zip_path,"w") as archive:
            for cid,records in entries.items():
                data="".join(json.dumps({"channel_id":cid,"video_id":v,"title":t})+"\n"
                             for v,t in records).encode("utf8")
                archive.writestr("channels/"+cid+".ndjson.gz",gzip.compress(data))
        return zip_path,channel1,channel2

    def test_original_video_id_population_and_existing_strict_sets_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            path,ch1,ch2=self.fake_archive(Path(directory))
            def fake_groups(_root):
                return (
                    {"Alice Lovelace":"Alice Lovelace"},
                    {"Alice Lovelace":({ch1},{"aaaaaaaaaaa"},False)},
                    {"aaaaaaaaaaa":("Alice Lovelace",{ch1})},
                    {"Alice Lovelace":{"original":True},
                     "Charles Babbage":{"original":True}}
                )
            with patch.object(mod,"candidate_groups",side_effect=fake_groups), \
                 patch.object(mod.strict,"rejected_label_names",return_value=set()):
                result=mod.run_archive(path,expected_channels=2,expected_videos=6)
            self.assertEqual(result["archived_video_titles_scanned"],6)
            self.assertEqual(result["previous_strict_original_video_ids"],1)
            self.assertEqual(result["new_distinct_explicit_profile_title_original_video_ids"],3)
            self.assertEqual(result["candidate_groups_with_new_explicit_profile_titles"],1)
            row=result["rows"][0]
            self.assertEqual(row["strict_biography_title_videos"],1)
            self.assertEqual(row["additional_profile_title_videos"],3)
            self.assertEqual(row["combined_title_evidence_distinct_videos"],4)
            self.assertEqual(row["combined_title_evidence_distinct_channels"],2)
            self.assertEqual(row["extra_original_video_ids"],
                             ["bbbbbbbbbbb","ddddddddddd","eeeeeeeeeee"])
            self.assertEqual(result["actual_video_content_verified"],0)
            self.assertFalse(result["production_rank_changed"])
            self.assertEqual(result["new_youtube_videos_fetched"],0)

    def test_previous_original_id_channel_mismatch_and_source_population_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path,ch1,ch2=self.fake_archive(Path(directory))
            with patch.object(mod,"candidate_groups",return_value=(
                 {"Alice Lovelace":"Alice Lovelace"},
                 {"Alice Lovelace":({ch2},{"aaaaaaaaaaa"},False)},
                 {"aaaaaaaaaaa":("Alice Lovelace",{ch2})},
                 {"Alice Lovelace":{"original":True}})), \
                 patch.object(mod.strict,"rejected_label_names",return_value=set()):
                with self.assertRaisesRegex(ValueError,"OLD_BIOGRAPHY_ID_CHANNEL_CHANGED"):
                    mod.run_archive(path,expected_channels=2,expected_videos=6)
            with self.assertRaisesRegex(ValueError,"B024_SOURCE_ZIP_SHA_INVALID"):
                mod.run_archive(path,expected_channels=2,expected_videos=6)

    def test_directory_requires_verified_extracted_artifact_handoff(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError,"EXTRACTED_SOURCE_ARTIFACT_PROVENANCE_REQUIRED"):
                mod.run_archive(Path(directory))
if __name__=="__main__":unittest.main()
