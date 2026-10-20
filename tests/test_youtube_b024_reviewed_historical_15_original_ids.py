import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"scripts/youtube-b024-prior-reviewed-historical-candidates.py"
spec=importlib.util.spec_from_file_location("b024_existing_historic_15",SOURCE)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
MANIFEST=json.loads(mod.MANIFEST.read_text())

def fake(name,vid,channel,state="PRIOR_2026_10_09_NEEDS_REVIEW_NOT_PROVEN_UNREGISTERED"):
    return {"identity_label_for_review":name,"source_raw_name_forms":[name],
            "strong_biography_title_distinct_original_channel_ids":[channel],
            "strong_biography_title_distinct_original_video_ids":[vid],
            "strong_biography_title_distinct_channels":1,"strong_biography_title_distinct_videos":1,
            "source_examples":[{"video_id":vid,"original_title":"Biography of "+name,
                                "original_channel_id":channel}],
            "registration_screen_status":state,
            "additional_registered_uuid_positive":[],"additional_living_evidence_urls":[],
            "current_complete_production_person_registry_rechecked":False,
            "actual_video_content_certified":False}

def input_data():
    rows=[fake("Unreviewed synthetic name "+str(i),f"{i:011d}",f"UC{i:022d}") for i in range(2766)]
    rows[0]=fake("Emmett Till","11111AAAAAA","UC"+"a"*22)
    rows[1]=fake("Carter G Woodson","22222BBBBBB","UC"+"b"*22)
    return {"schema":mod.INPUT_SCHEMA,"input_existing_b024_original_video_ids":10706,
            "input_source_name_labels":2766,
            "full_current_ATLAS_person_and_alias_census_completed":False,
            "publishable":False,"real_video_primary_content_certified":0,
            "confirmed_current_unregistered_historical_people":0,"rows":rows}

class Reviewed15OriginalIdsTest(unittest.TestCase):
    def test_actual_source_historic_15_are_not_registered_uuid_alias_mismatches(self):
        self.assertEqual(len(MANIFEST["source_historical_unmatched_identity_groups"]),15)
        self.assertEqual(MANIFEST["production_identity_check"]["person_records_read"],2145)
        self.assertEqual(MANIFEST["source_sha256"],mod.ORIGINAL_ZIP_SHA)
        self.assertTrue(MANIFEST["production_identity_check"]["live_recheck_required_before_any_publication"])

    def test_person_video_original_ids_from_existing_archive_are_not_title_only_aggregate_counts(self):
        d=mod.review(input_data(),MANIFEST)
        self.assertEqual(d["prior_historical_identity_reviewed"],15)
        self.assertEqual(d["historic_reviewed_identities_with_explicit_bio_title_IDs"],2)
        by={x["historical_identity_for_review"]:x for x in d["reviewed_candidates"]}
        self.assertEqual(by["Emmett Till"]["original_video_ids"],["11111AAAAAA"])
        self.assertEqual(by["Emmett Till"]["original_channel_ids"],["UC"+"a"*22])
        self.assertEqual(by["Carter G. Woodson"]["independent_source_name_forms_reviewed"],["Carter G Woodson"])
        self.assertEqual(by["Carter G. Woodson"]["original_distinct_channels_with_explicit_biography_title"],1)
        self.assertEqual(by["Meriwether Lewis"]["original_distinct_videos_with_explicit_biography_title"],0)
        self.assertEqual(d["actual_video_media_content_verified"],0)
        self.assertEqual(d["confirmed_current_unregistered_historical_Persons"],0)
        self.assertFalse(d["Production_rank_published"])

    def test_a_later_positive_registered_uuid_or_ambiguous_identity_prevents_false_ranking(self):
        source=input_data()
        source["rows"][0]["registration_screen_status"]="ADDITIONAL_REGISTERED_UUID_POSITIVE_EXCLUDE"
        d=mod.review(source,MANIFEST)
        row=next(r for r in d["reviewed_candidates"] if r["historical_identity_for_review"]=="Emmett Till")
        self.assertEqual(row["eligibility"],"HOLD_REVIEWED_REGISTERED_OR_AMBIGUOUS")
        self.assertEqual(row["original_video_ids"],[])
        tampered=copy.deepcopy(MANIFEST)
        tampered["production_identity_check"]["person_records_read"]=12
        with self.assertRaisesRegex(ValueError,"SOURCE_CONTRACT_INVALID"):
            mod.review(input_data(),tampered)

if __name__=="__main__":unittest.main()
