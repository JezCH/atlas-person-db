import gzip
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT=Path(__file__).resolve().parents[1]/"scripts"/"youtube-review-open-label-source-evidence.py"
spec=importlib.util.spec_from_file_location("youtube_source_label_review",SCRIPT)
review=importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)

class SourceLabelQualityReviewTest(unittest.TestCase):
    def source(self):
        return {
            "schema":"youtube-new-label-fulltitle-original-id-recall/v1",
            "source_snapshot_id":"yt-test",
            "source_channels":3,"source_videos":4,
            "rows":[
                {"candidate":"Emmett Till","original_channel_ids":["UC1","UC2"],
                 "original_video_ids":["v1","v2"],
                 "title_mention_distinct_channels":2,
                 "title_mention_distinct_videos":2,
                 "identity_disposition":"NEW_LABEL_REVIEW"},
                {"candidate":"South Africa","original_channel_ids":["UC3"],
                 "original_video_ids":["v3"],
                 "title_mention_distinct_channels":1,
                 "title_mention_distinct_videos":1,
                 "identity_disposition":"NEW_LABEL_REVIEW"},
                {"candidate":"Bin Laden","original_channel_ids":["UC3"],
                 "original_video_ids":["v4"],
                 "title_mention_distinct_channels":1,
                 "title_mention_distinct_videos":1,
                 "identity_disposition":"NEW_LABEL_REVIEW"}
            ]
        }
    def manifest(self):
        return {
            "source_recount_schema":"youtube-new-label-fulltitle-original-id-recall/v1",
            "source_snapshot_id":"yt-test",
            "source_channels":3,"source_videos":4,
            "source_recount_candidate_labels":3,
            "nonperson_exact_by_reason":{"PLACE_OR_REGION":["South Africa"]},
            "identity_hold_by_reason":{"Bin Laden":"SURNAME_HOMONYM_REVIEW"}
        }
    def corpus(self, filepath):
        rows={
            "UC1":[("v1","The Murder of Emmett Till")],
            "UC2":[("v2","Why Was Emmett Till Killed?")],
            "UC3":[("v3","South Africa Is a Country"),("v4","The Bin Laden Family")],
        }
        with zipfile.ZipFile(filepath,"w") as z:
            for channel,videos in rows.items():
                body="".join(json.dumps({"video_id":vid,"title":title})+"\n"
                             for vid,title in videos)
                z.writestr(f"batch024/videos/{channel}.ndjson.gz",
                           gzip.compress(body.encode()))
    def test_source_ids_quarantines_only_name_label(self):
        with tempfile.TemporaryDirectory() as td:
            source=Path(td)/"videos.zip"
            self.corpus(source)
            result=review.run(self.source(),self.manifest(),source,verify_sha=False)
            rows={r["raw_name"]:r for r in result["rows"]}
            self.assertEqual(result["source_video_count"],4)
            self.assertEqual(result["candidate_label_status_counts"],
                             {"UNREVIEWED_PERSONHOOD":1,"EXACT_NONPERSON_LABEL_REVIEWED":1,
                              "HOLD_IDENTITY_OR_CONTEXT":1})
            self.assertEqual(rows["Emmett Till"]["review_cue_video_counts"],
                             {"heading_cue_review":2})
            self.assertEqual(rows["South Africa"]["disposition"],
                             "EXACT_NONPERSON_LABEL_REVIEWED")
            self.assertEqual(rows["Bin Laden"]["disposition"],
                             "HOLD_IDENTITY_OR_CONTEXT")
            self.assertEqual(result["unique_video_id_union_by_status"]
                             ["EXACT_NONPERSON_LABEL_REVIEWED"],1)
            self.assertEqual(result["source_disposition"],"READ_ONLY_NO_RANK_PUBLICATION")

    def test_wrong_source_or_unknown_review_label_fails(self):
        source=self.source()
        manifest=self.manifest()
        with self.assertRaisesRegex(ValueError,"snapshot mismatch"):
            review.build_dispositions(source,{**manifest,"source_snapshot_id":"other"})
        with self.assertRaisesRegex(ValueError,"missing from current source"):
            review.build_dispositions(source,{
                **manifest, "nonperson_exact_by_reason":{"PLACE_OR_REGION":["Rome"]}
            })
        with self.assertRaisesRegex(ValueError,"collision"):
            review.build_dispositions(source,{
                **manifest, "identity_hold_by_reason":{"South Africa":"ambiguous"}
            })

    def test_title_cue_is_review_only_even_for_place(self):
        self.assertEqual(review.focus_bucket("South Africa: Why This Country Matters",
                                             "South Africa"),"heading_cue_review")
        self.assertEqual(review.focus_bucket("The Murder of Emmett Till",
                                             "Emmett Till"),"heading_cue_review")
        self.assertEqual(review.focus_bucket("News from South Africa Today",
                                             "South Africa"),"mention_only")

if __name__=="__main__":
    unittest.main()
