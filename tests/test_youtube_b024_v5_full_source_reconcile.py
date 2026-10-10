import copy
import importlib.util
import unittest
from pathlib import Path

P=Path(__file__).resolve().parents[1]/"scripts"/"youtube-b024-v5-full-source-reconcile.py"
spec=importlib.util.spec_from_file_location("b024_v5_crosswalk",P)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

C1="UC"+"A"*22
C2="UC"+"B"*22
V1="AbCdEfGhI12"
V2="AbCdEfGhI13"
V3="AbCdEfGhI14"

class FullProductionSourceCrosswalkTest(unittest.TestCase):
    def fixture(self):
        production={
            "schema":mod.PRODUCTION_SCHEMA,
            "snapshot_id":mod.REFERENCE_SNAPSHOT,
            "is_authoritative_person_rank":False,
            "available_count":3,
            "original_channel_count":2,
            "original_video_rows":3,
            "original_archive_digest":"sha256:"+mod.ZIP_SHA,
            "threshold_counts":{"3":3,"5":1,"10":0,"15":0,"20":0},
            "rows":[
                {"name":"Emmett Till","rank":1,"channels":5,"videos":10},
                {"name":"Shivaji","rank":2,"channels":4,"videos":5},
                {"name":"Production Only Name","rank":3,"channels":3,"videos":4}
            ]}
        def sr(name,origin,channel_ids,video_ids):
            return {"name":name,"origin":origin,
                "original_channel_count":len(channel_ids),
                "original_video_count":len(video_ids),
                "original_channel_ids":channel_ids,
                "original_video_ids":video_ids,
                "personhood_and_video_focus":"UNREVIEWED_NOT_CERTIFIED",
                "registered_status":"UNSCREENED_LAST_STAGE"}
        source={
            "schema":mod.SOURCE_SCHEMA,
            "source_snapshot_id":mod.SOURCE_SNAPSHOT,
            "source_zip_sha256":mod.ZIP_SHA,
            "original_channel_population":2,
            "original_video_population":3,
            "production_rank_publishable":False,
            "registered_person_exclusion_performed":False,
            "real_video_content_focus_approved":False,
            "rows":[sr("Emmett Till","preexisting_independent_5720",[C1],[V1,V2]),
                    sr("Shivaji","additional_exact_source_245",[C2],[V3]),
                    sr("Old Source Only Phrase","preexisting_independent_5720",[C2],[V3])]}
        old={"rows":[{"raw_name":"Emmett Till",
            "title_mention_distinct_channels":1,"title_mention_distinct_videos":1},
            {"raw_name":"Old Source Only Phrase",
            "title_mention_distinct_channels":1,"title_mention_distinct_videos":1}]}
        return production,source,old

    def run_audit(self,production=None,source=None,old=None):
        p,s,o=self.fixture()
        return mod.audit(production or p,source or s,old or o,enforce_population=False)

    def test_all_production_rows_link_exact_source_ids_without_person_approval(self):
        result=self.run_audit()
        self.assertEqual(result["production_candidate_raw_labels_scanned"],3)
        self.assertEqual(result["production_names_exact_source_matched"],2)
        self.assertEqual(result["production_names_not_exact_source_matched"],1)
        self.assertEqual(result["source_labels_not_exact_in_production"],1)
        self.assertEqual(result["older_source_count_mismatches"],1)
        self.assertFalse(result["single_unregistered_person_rank_publishable"])
        row=result["production_source_crosswalk"][0]
        self.assertEqual(row["production_raw_name"],"Emmett Till")
        self.assertEqual(row["original_source_video_ids"],[V1,V2])
        self.assertFalse(row["safe_to_publish_as_historical_person"])
        self.assertEqual(row["source_vs_v5_channel_delta_REVIEW_ONLY"],-4)
        self.assertEqual(result["source_only_raw_name_labels"],["Old Source Only Phrase"])

    def test_cross_snapshot_name_spellings_are_not_fuzzy_alias_merges(self):
        p,s,o=self.fixture()
        p["rows"][0]["name"]="Émmett Till"
        x=self.run_audit(production=p,source=s,old=o)
        self.assertEqual(x["production_names_exact_source_matched"],1)
        self.assertEqual(x["production_names_not_exact_source_matched"],2)
        self.assertEqual(mod.strict_key("Emmett Till"),"emmett till")
        self.assertNotEqual(mod.strict_key("Émmett Till"),mod.strict_key("Emmett Till"))
        self.assertIn("PUNCTUATION_OR_SEPARATOR_SENSITIVITY_REVIEW",
                      mod.variation_tags("Q & A"))
        self.assertIn("UNICODE_OR_DIACRITIC_REVIEW",
                      mod.variation_tags("Qur'an العربية"))

    def test_source_provenance_duplicate_video_id_and_false_approval_fail_closed(self):
        p,s,o=self.fixture()
        s["source_zip_sha256"]="0"*64
        with self.assertRaisesRegex(ValueError,"DISTINCT_PINNED_SNAPSHOT"):
            self.run_audit(production=p,source=s,old=o)
        p,s,o=self.fixture()
        s["rows"][0]["original_video_ids"]=[V1,V1]
        with self.assertRaisesRegex(ValueError,"SOURCE_ORIGINAL_ID_SET_PARITY"):
            self.run_audit(production=p,source=s,old=o)
        p,s,o=self.fixture()
        s["registered_person_exclusion_performed"]=True
        with self.assertRaisesRegex(ValueError,"SOURCE_LEDGER_MUST_NOT_CLAIM"):
            self.run_audit(production=p,source=s,old=o)
        p,s,o=self.fixture()
        p["rows"][1]["rank"]=4
        with self.assertRaisesRegex(ValueError,"PRODUCTION_FULL_RANK"):
            self.run_audit(production=p,source=s,old=o)

if __name__=="__main__":
    unittest.main()
