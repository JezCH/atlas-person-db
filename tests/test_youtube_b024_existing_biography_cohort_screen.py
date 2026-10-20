import copy
import importlib.util
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location(
    "youtube_existing_b024_historical_registry_screen",
    ROOT/"scripts/youtube-b024-screen-existing-biography-cohorts.py"
)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def synthetic_actual_scan():
    labels=["Abraham Lincoln","Elon Musk","Pablo Picasso","Picasso","Princess Diana"]
    labels+=["Historical Person Candidate "+str(i) for i in range(2766-len(labels))]
    rows=[]
    start=0
    # Unique original Video IDs, original Channel IDs as SETS, 2,766 names.
    for index,label in enumerate(labels):
        n=4 if index<2408 else 3
        ids=[f"{k:011d}" for k in range(start,start+n)]
        start+=n
        chans=["UC"+f"{index:022d}"]
        rows.append({
            "raw_name":label,
            "strong_biography_original_video_ids":ids,
            "strong_biography_original_channel_ids":chans,
            "strong_biography_title_original_video_count":n,
            "strong_biography_title_original_channel_count":1,
            "historic_person_identity_verified":False,
            "original_video_actual_content_watched_verified":False,
            "current_registered_person_exclusion_pending":True,
            "source_title_samples":[{"video_id":ids[0],
                                     "original_channel_id":chans[0],
                                     "original_title":"Biography of "+label}]
        })
    assert start==10706
    return {
      "schema":mod.EXPECTED_SCHEMA,
      "original_zip_sha256":mod.SOURCE_SHA,
      "original_channel_files_scanned":10127,
      "original_video_title_rows_scanned":2230031,
      "independent_source_name_label_count":5965,
      "any_source_name_matched_title_video_rows":330327,
      "explicit_biography_title_video_ids":10706,
      "distinct_name_labels_with_explicit_biography_title_cues":2766,
      "video_content_verified_count":0,
      "production_writes":0,
      "rank_publication_allowed":False,
      "new_youtube_crawling_attempted":False,
      "video_media_retrieval_attempted":False,
      "rows":rows
    }


class ExistingB024RealCohortScreenTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=synthetic_actual_scan()

    def test_actual_previous_registration_screen_has_positive_uuid_not_just_unchecked_names(self):
        registered,living,reviewed=mod.read_previous_screen(ROOT/mod.SCREEN_FILE)
        self.assertEqual(len(reviewed),6358)
        self.assertTrue(len(registered)>500)
        self.assertTrue(len(living)>40)
        self.assertEqual(len(registered["Abraham Lincoln"]),1)
        self.assertIn("Elon Musk",living)
        self.assertIn("Princess Diana",reviewed)

    def test_one_verified_aliased_person_and_registration_exclusion_after_original_id_union(self):
        result=mod.screen_title_cohorts(self.data)
        rows={r["identity_label_for_review"]:r for r in result["rows"]}
        self.assertEqual(result["input_biography_title_video_ids"],10706)
        self.assertEqual(result["input_biography_title_name_labels"],2766)
        self.assertEqual(result["result_reviewed_identity_cohorts"],2765)
        self.assertEqual(rows["Pablo Picasso"]["source_raw_name_forms"],["Pablo Picasso","Picasso"])
        self.assertTrue(rows["Pablo Picasso"]["reviewed_same_person_alias_union"])
        self.assertEqual(rows["Pablo Picasso"]["strong_biography_title_distinct_videos"],8)
        self.assertEqual(rows["Pablo Picasso"]["strong_biography_title_distinct_channels"],2)
        self.assertEqual(rows["Abraham Lincoln"]["registration_screen_status"],
                         "CONFIRMED_REGISTERED_AS_OF_2026_10_09_EXCLUDE")
        self.assertEqual(rows["Elon Musk"]["registration_screen_status"],
                         "REVIEWED_LIVING_AS_OF_2026_10_09_EXCLUDE")
        self.assertEqual(rows["Princess Diana"]["registration_screen_status"],
                         "PRIOR_2026_10_09_NEEDS_REVIEW_NOT_PROVEN_UNREGISTERED")
        self.assertTrue(result["current_atlas_v2_registry_recheck_required"])
        self.assertEqual(result["actual_person_primary_content_verified_video_count"],0)
        self.assertEqual(result["confirmed_current_unregistered_historical_person_count"],0)
        self.assertFalse(result["production_rank_published"])

    def test_source_assertions_reject_duplicated_or_fabricated_content_certification(self):
        for edit in [
            lambda d:d.update(video_content_verified_count=1),
            lambda d:d.update(explicit_biography_title_video_ids=10707),
            lambda d:d["rows"][1].update(original_video_actual_content_watched_verified=True),
            lambda d:d["rows"][1]["strong_biography_original_video_ids"].append(
                d["rows"][0]["strong_biography_original_video_ids"][0]),
            lambda d:d["rows"][1].update(raw_name=d["rows"][0]["raw_name"]),
        ]:
            bad=copy.deepcopy(self.data)
            edit(bad)
            with self.subTest(edit=edit):
                with self.assertRaisesRegex(ValueError,"B024_REAL_TITLE_RESULT"):
                    mod.screen_title_cohorts(bad)

    def test_prior_registration_is_not_assumed_current_even_for_as_of_registered(self):
        d=mod.screen_title_cohorts(self.data)
        self.assertEqual(d["registered_evidence_as_of"],"2026-10-09")
        self.assertTrue(d["registered_evidence_not_current"])
        self.assertTrue(all(row["current_2026_10_20_registered_person_database_screen_complete"] is False
                            for row in d["rows"]))


if __name__=="__main__":
    unittest.main()
