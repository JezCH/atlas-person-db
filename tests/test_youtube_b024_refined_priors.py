import copy
import importlib.util
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def imported(path,name):
    spec=importlib.util.spec_from_file_location(name,ROOT/path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

old=imported("scripts/youtube-b024-screen-existing-biography-cohorts.py","b024_earlier_screen")
ref=imported("scripts/youtube-b024-refine-registered-living-prior-screen.py","b024_refined_screen")
testsource=imported("tests/test_youtube_b024_existing_biography_cohort_screen.py","b024_original_fixture")

def actual_contract_fixture():
    scan=testsource.synthetic_actual_scan()
    swaps={"Picasso":"Serena Williams","Princess Diana":"Jesus Christ",
           "Historical Person Candidate 1":"Kim Kardashian",
           "Historical Person Candidate 2":"Al Pacino",
           "Historical Person Candidate 3":"Sir Isaac Newton"}
    for row in scan["rows"]:
        if row["raw_name"] in swaps:
            row["raw_name"]=swaps[row["raw_name"]]
    initial=old.screen_title_cohorts(scan)
    assert len(initial["rows"])==2766
    return initial

class PriorRegisteredAndLivingEvidenceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.initial=actual_contract_fixture()

    def test_provenance_sources_50_28_98_plus_reviewed_current_living(self):
        registered,living=ref.evidence()
        self.assertIn("0208bbf2-0be2-481d-aece-b279fcd32a73",registered[ref.key("Sir Isaac Newton")])
        self.assertIn("594d772b-bd67-5741-bbad-2df4e580eb0c",registered[ref.key("Jesus Christ")])
        self.assertIn(ref.key("Serena Williams"),living)
        self.assertIn(ref.key("Kim Kardashian"),living)
        self.assertIn(ref.key("Al Pacino"),living)
        self.assertGreaterEqual(len(registered),78)

    def test_positive_prior_uuids_and_named_living_exclude_without_forging_current_missing_status(self):
        d=ref.refine(self.initial)
        names={r["identity_label_for_review"]:r for r in d["rows"]}
        for n in ("Sir Isaac Newton","Jesus Christ"):
            self.assertEqual(names[n]["registration_screen_status"],"ADDITIONAL_REGISTERED_UUID_POSITIVE_EXCLUDE")
            self.assertTrue(names[n]["additional_registered_uuid_positive"])
        for n in ("Serena Williams","Kim Kardashian","Al Pacino"):
            self.assertEqual(names[n]["registration_screen_status"],"ADDITIONAL_DATED_LIVING_EVIDENCE_EXCLUDE")
            self.assertTrue(names[n]["additional_living_evidence_urls"])
        self.assertEqual(d["input_existing_b024_original_video_ids"],10706)
        self.assertEqual(d["input_source_name_labels"],2766)
        self.assertEqual(d["real_video_primary_content_certified"],0)
        self.assertEqual(d["confirmed_current_unregistered_historical_people"],0)
        self.assertFalse(d["full_current_ATLAS_person_and_alias_census_completed"])
        self.assertFalse(d["publishable"])
        self.assertEqual(d["production_writes"],0)
        self.assertEqual(d["new_youtube_videos_fetched"],0)

    def test_tampered_prior_sources_and_conflicting_uuids_fail_closed(self):
        bad=copy.deepcopy(self.initial)
        bad["rows"][1]["strong_biography_title_distinct_original_video_ids"][0]=bad["rows"][0]["strong_biography_title_distinct_original_video_ids"][0]
        with self.assertRaisesRegex(ValueError,"ORIGINAL_REAL_COHORT_VIDEO_ID_INVALID"):
            ref.refine(bad)
        bad=copy.deepcopy(self.initial)
        bad["production_rank_published"]=True
        with self.assertRaisesRegex(ValueError,"ORIGINAL_REAL_COHORT_SCREEN_PROVENANCE_INVALID"):
            ref.refine(bad)
        pos,living=ref.evidence()
        other="1ee551fc-6ad7-4c2f-80d4-5bbeb526132f"
        pos[ref.key("Jesus Christ")][other].add("conflicting_historic_evidence")
        d=ref.refine(self.initial,pos,living)
        row=next(r for r in d["rows"] if r["identity_label_for_review"]=="Jesus Christ")
        self.assertEqual(row["registration_screen_status"],"ADDITIONAL_HISTORICAL_IDENTITY_CONFLICT_HOLD")

if __name__=="__main__":
    unittest.main()
