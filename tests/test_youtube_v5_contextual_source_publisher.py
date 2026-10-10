import gzip
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts"/"youtube-build-person-signal-snapshot.py"
spec=importlib.util.spec_from_file_location("source_v5_builder",SCRIPT)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class YoutubeSourceContextV5Test(unittest.TestCase):
    def test_full_question_title_without_prefix_colon(self):
        cases=[
            ("Why Was Malcolm X Killed at 39?", "Malcolm X"),
            ("Did Anne Boleyn Have Six Fingers?", "Anne Boleyn"),
            ("The surprising Life of Emmett Till | History", "Emmett Till"),
        ]
        for title, wanted in cases:
            actual=[mod.normalize_person_candidate(x)
                    for x,_ in mod.source_context_name_candidates(title)]
            self.assertIn(wanted, actual, title)
        for text in ("The Story of Santa Claus", "Why Was the Roman Empire Powerful?"):
            self.assertFalse(any(mod.valid_candidate(n)
                for n,_ in mod.source_context_name_candidates(text)))

    def test_v5_original_channel_video_ids_preserve_prefix_baseline(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"corpus"
            base=root/"out"/"batch024"
            videos=base/"videos"
            videos.mkdir(parents=True)
            manifest=[]
            for n in range(3):
                ch=f"UCsource{n:03d}"
                names=[
                    ("v" + str(n) + "a", "Malcolm X: American Civil Rights Leader"),
                    ("v" + str(n) + "b", "Why Was Malcolm X Killed at 39?"),
                    ("v" + str(n) + "c", "Did Anne Boleyn Have Six Fingers?"),
                    ("v" + str(n) + "d", "The Life of Santa Claus | Myths"),
                ]
                manifest.append({"channel_id":ch,"channel_name":ch,
                                 "status":"OK","count":len(names)})
                with gzip.open(videos/(ch+".ndjson.gz"),"wt",encoding="utf-8") as f:
                    for vid,title in names:
                        f.write(json.dumps({"video_id":vid,"title":title})+"\n")
            (base/"manifest.json").write_text(json.dumps(manifest))
            result=mod.build(root,123,"sha256:123")
            names={r["raw_name"]:r for r in result["signals"]}
            self.assertEqual(result["snapshot"]["parser_version"],
                             "yt-title-person-reviewed-v5")
            self.assertEqual(result["snapshot"]["channel_count"],3)
            self.assertEqual(result["snapshot"]["video_count"],12)
            self.assertEqual(names["Malcolm X"]["distinct_channel_count"],3)
            self.assertEqual(names["Malcolm X"]["video_count"],6)
            self.assertEqual(names["Anne Boleyn"]["distinct_channel_count"],3)
            self.assertEqual(names["Anne Boleyn"]["video_count"],3)
            self.assertNotIn("Santa Claus",names)
            self.assertTrue(result["snapshot"]["source_state"]
                            ["source_name_generation_independent_of_registered_persons"])
            self.assertGreater(result["snapshot"]["source_state"]
                               ["quality_counters"]["accepted_context_cue_video_name_ids"],0)

    def test_reviewed_alias_unions_use_original_channel_video_id_sets(self):
        manifest = {
            "schema":"atlas-youtube-b024-v5-source-identity-alias-review/v1",
            "source_artifact_digest":"sha256:test",
            "approved_groups":[{
                "canonical_name":"Pablo Picasso",
                "aliases":["Picasso","Pablo Picasso"]
            }]
        }
        channels = {"picasso":{"UC1","UC2","UC3"},
                    "pablo picasso":{"UC2","UC3","UC4"}}
        videos = {"picasso":{("UC1","v1"),("UC2","v2"),("UC3","v3")},
                  "pablo picasso":{("UC2","v2"),("UC3","v4"),("UC4","v5")}}
        names = {"picasso":"Picasso","pablo picasso":"Pablo Picasso"}
        out=mod.reviewed_source_alias_unions(manifest,"sha256:test",channels,videos,names)
        self.assertEqual(out[0]["distinct_channel_count"],4)
        self.assertEqual(out[0]["video_count"],5)
        self.assertEqual(out[0]["aliases"][0]["distinct_channel_count"],3)
        self.assertRegex(out[0]["union_video_ids_sha256"],r"^[a-f0-9]{64}$")
        with self.assertRaisesRegex(RuntimeError,"DIGEST_MISMATCH"):
            mod.reviewed_source_alias_unions(manifest,"sha256:changed",channels,videos,names)


if __name__=="__main__":
    unittest.main()
