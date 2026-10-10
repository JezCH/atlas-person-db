import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "youtube-b024-source-first-historical-candidate-review.py"
spec = importlib.util.spec_from_file_location("youtube_candidate_review", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class SourceFirstHistoricalCandidateTest(unittest.TestCase):
    def fixture(self):
        sample={"source_sha256":"sha","source_snapshot_id":"snap","source_channels":2,
                "source_videos":4,"total_unreviewed_raw_names":2}
        def evidence(name,ch,vid):
            return {"raw_name":name,"candidate_status":"UNREVIEWED_PERSONHOOD",
                    "raw_title_mention_distinct_channels":len(ch),
                    "raw_title_mention_distinct_videos":len(vid),
                    "biographical_or_topic_cue_distinct_channels_REVIEW_ONLY":len(ch),
                    "title_evidence_buckets":{"BIOGRAPHICAL_TITLE_CUE_REVIEW":{
                        "channel_ids":ch,"video_ids":vid,
                        "samples":[{"channel_id":ch[0],"video_id":vid[0],
                                    "title":"The life of "+name}]}}}
        source={"source_sha256":"sha","source_snapshot_id":"snap",
                "unreviewed_labels_examined":2,
                "rows":[evidence("Name Alpha",["UC1"],["v1","v2"]),
                        evidence("Name A-lpha",["UC1","UC2"],["v2","v3"])]}
        queue={**sample,"prioritized_title_evidence_examples":[
            {"raw_name":name} for name in ("Name Alpha","Name A-lpha","Registered","Ambig")
        ]}
        manifest={"source_sha256":"sha","source_snapshot_id":"snap",
                  "source_population":{"distinct_channel_ids":2,
                     "original_video_rows":4,"prior_unreviewed_raw_name_labels":2},
                  "registered_exact":{"Registered":{"uuid":"id1",
                     "registered_name":"R E G I S T E R E D"}},
                  "registered_reviewed_alias":{},"identity_context_hold":{"Ambig":"HOMONYM"},
                  "source_historical_unmatched_identity_groups":{
                     "Person A":["Name Alpha","Name A-lpha"]},
                  "allowed_broad_title_cues":["BIOGRAPHICAL_TITLE_CUE_REVIEW"],
                  "allowed_strong_title_cues":["BIOGRAPHICAL_TITLE_CUE_REVIEW"]}
        return source,queue,manifest

    def test_original_channel_video_union_is_not_added(self):
        s,q,m=self.fixture()
        out=mod.review(s,q,m)
        self.assertEqual((out["registered_labels_excluded"],
                          out["ambiguous_identity_labels_held"],
                          out["remaining_historical_identity_review_groups"]),(1,1,1))
        candidate=out["candidates"][0]
        self.assertEqual(candidate["distinct_title_mention_channels"],2)
        self.assertEqual(candidate["distinct_title_mention_videos"],3)
        self.assertEqual(candidate["topic_cue_original_video_ids"],["v1","v2","v3"])
        self.assertFalse(out["publication_eligible"])
        self.assertFalse(candidate["content_video_topic_verified"])

    def test_registration_is_final_and_rechecked(self):
        s,q,m=self.fixture()
        projection={"persons":[{"id":"id1","names":[{"name":"R.E.G.I.S.T.E.R.E.D"}]}]}
        out=mod.review(s,q,m,registry_projection=projection)
        self.assertIn("RECHECK_PASSED",out["registry_state"])
        new={"persons":projection["persons"] + [{"id":"id2","names":[{"name":"Name Alpha"}]}]}
        with self.assertRaisesRegex(ValueError,"NEW_REGISTRATION_MATCH"):
            mod.review(s,q,m,registry_projection=new)

    def test_source_mismatch_and_unreviewed_partition_fail_closed(self):
        s,q,m=self.fixture()
        with self.assertRaisesRegex(ValueError,"SOURCE_SNAPSHOT"):
            mod.review(s,{**q,"source_snapshot_id":"other"},m)
        with self.assertRaisesRegex(ValueError,"SOURCE_PARTITION"):
            bad={**m,"identity_context_hold":{"Absent":"HOMONYM"}}
            mod.review(s,q,bad)
        with self.assertRaisesRegex(ValueError,"SOURCE_EVIDENCE_COUNT"):
            mod.review({**s,"unreviewed_labels_examined":1},q,m)

if __name__=="__main__":
    unittest.main()
