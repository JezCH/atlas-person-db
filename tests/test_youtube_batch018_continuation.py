#!/usr/bin/env python3
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location("collector",Path(__file__).resolve().parents[1]/"scripts/youtube-continue-batch018.py")
collector=importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

def seed(root):
    for i in range(8,18):
        path=root/"out"/f"batch{i:03d}"/"manifest.json"
        path.parent.mkdir(parents=True,exist_ok=True)
        rows=[{"channel_id":f"UC{i:03d}{k:06d}","status":"ERR","count":0} for k in range(677 if i!=17 else 677)]
        path.write_text(json.dumps(rows),encoding="utf-8")

class CollectorSafety(unittest.TestCase):
    def test_previous_corpus_rejects_missing_batch(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            seed(root)
            (root/"out"/"batch012"/"manifest.json").unlink()
            with self.assertRaisesRegex(RuntimeError,"INCOMPLETE_PRIOR_CORPUS"):
                collector.manifests(root)

    def test_append_preserves_prior_and_skips_old_ids(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"prior";out=Path(tmp)/"out"
            seed(root)
            known="UC008000000"
            def fake(url,timeout=90):
                if url.startswith("ytsearch"):
                    return {"entries":[{"channel_id":known,"channel":"old"},
                                       {"channel_id":"UC_NEW_1","channel":"new"}]}
                return {"entries":[{"id":"VID1","title":"Historical Figure A"}]}
            with patch.object(collector,"run_yt",side_effect=fake):
                collector.collect(root,out,limit=1,video_limit=5)
            assert (out/"out"/"batch008"/"manifest.json").read_bytes()==(root/"out"/"batch008"/"manifest.json").read_bytes()
            rows=json.loads((out/"out"/"batch018"/"manifest.json").read_text())
            self.assertEqual([r["channel_id"] for r in rows],["UC_NEW_1"])
            self.assertEqual(rows[0]["count"],1)
            self.assertEqual(json.loads((out/"batch018-summary.json").read_text())["supabase_requests"],0)

    def test_legacy_snapshot_reports_missing_sources_without_dropping_present_ones(self):
        import gzip
        snap_spec=importlib.util.spec_from_file_location(
            "snapshot_parser",Path(__file__).resolve().parents[1]/"scripts/youtube-build-person-signal-snapshot.py")
        snapshot_parser=importlib.util.module_from_spec(snap_spec)
        snap_spec.loader.exec_module(snapshot_parser)
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            for batch,cid in (("batch001","UC_A"),("batch004b","UC_B"),("batch008","UC_C")):
                folder=root/"out"/batch
                (folder/"videos").mkdir(parents=True)
                (folder/"manifest.json").write_text(
                    json.dumps([{"channel_id":cid,"status":"OK","count":1}]),encoding="utf-8")
                with gzip.open(folder/"videos"/f"{cid}.ndjson.gz","wt",encoding="utf-8") as target:
                    target.write(json.dumps({"channel_id":cid,"video_id":cid,"title":"Albert Einstein: Biography"})+"\n")
            payload=snapshot_parser.build(root,1,"legacy-compat-test")
            state=payload["snapshot"]["source_state"]
            self.assertEqual(len(payload["channels"]),3)
            self.assertIn("batch001",state["coverage_batches"])
            self.assertIn("batch004b",state["coverage_batches"])
            self.assertIn("batch008",state["coverage_batches"])
            self.assertIn("batch002",state["missing_prior_batch_sources"])
            self.assertNotIn("batch001",state["missing_prior_batch_sources"])
            self.assertFalse(state["historical_sources_complete_from_batch001"])

    def test_optional_legacy_batch_is_retained(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"prior"
            seed(root)
            old=root/"out"/"batch001"/"manifest.json"
            old.parent.mkdir(parents=True,exist_ok=True)
            old.write_text(json.dumps([{"channel_id":"UC_LEGACY_001","status":"ERR","count":0}]),encoding="utf-8")
            known=collector.manifests(root)
            self.assertIn("UC_LEGACY_001",known)
            self.assertEqual(len(known),6771)

    def test_modified_prior_file_is_rejected_even_when_counts_match(self):
        import shutil
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"prior";out=Path(tmp)/"out"
            seed(root)
            shutil.copytree(root,out)
            edited=out/"out"/"batch008"/"manifest.json"
            edited.write_text(edited.read_text(encoding="utf-8")+" ",encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError,"PRIOR_FILE_CHANGED"):
                collector.verify_preserved_files(root,out)
            edited.write_bytes((root/"out"/"batch008"/"manifest.json").read_bytes())
            self.assertEqual(collector.verify_preserved_files(root,out),10)

    def test_batch019_appends_without_rewriting_any_batch018_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"prior"
            out=Path(tmp)/"next"
            seed(root)
            folder=root/"out"/"batch018"
            folder.mkdir(parents=True)
            rows=[{"channel_id":f"UC018{k:06d}","status":"OK","count":0} for k in range(40)]
            (folder/"manifest.json").write_text(json.dumps(rows),encoding="utf-8")
            old_ids=collector.manifests(root,next_batch=19,min_channels=6810)
            self.assertEqual(len(old_ids),6810)
            def fake(url, timeout=90):
                if url.startswith("ytsearch"):
                    return {"entries":[{"channel_id":"UC018000001","channel":"old"},
                                       {"channel_id":"UC019000001","channel":"new"}]}
                return {"entries":[{"id":"V_019","title":"Biography of a Historical Person"}]}
            with patch.object(collector,"run_yt",side_effect=fake):
                collector.collect(root,out,1,3,next_batch=19)
            self.assertEqual(collector.verify_preserved_files(root,out),11)
            self.assertEqual((root/"out"/"batch018"/"manifest.json").read_bytes(),
                             (out/"out"/"batch018"/"manifest.json").read_bytes())
            current=json.loads((out/"out"/"batch019"/"manifest.json").read_text())
            self.assertEqual(len(current),1)
            self.assertEqual(current[0]["channel_id"],"UC019000001")
            summary=json.loads((out/"batch019-summary.json").read_text())
            self.assertEqual(summary["previous_channels"],6810)
            self.assertEqual(summary["preserved_prior_files"],11)
            self.assertEqual(summary["supabase_requests"],0)
            with self.assertRaisesRegex(RuntimeError,"INCOMPLETE_PRIOR_CORPUS"):
                collector.manifests(out,next_batch=19,min_channels=6810)

    def test_scaled_batch020_discovers_hundreds_and_preserves_every_old_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"prior"
            output=Path(tmp)/"new"
            seed(root)
            for batch,number in (("batch018",18),("batch019",19)):
                folder=root/"out"/batch
                folder.mkdir(parents=True)
                (folder/"manifest.json").write_text(json.dumps([
                    {"channel_id":f"UC{number:03d}{i:06d}",
                     "status":"OK","count":0} for i in range(40)
                ]),encoding="utf-8")
            candidates=[{"channel_id":f"UC020{i:06d}","channel":"Historical channel"}
                        for i in range(340)]
            def fake(url,timeout=90):
                if url.startswith("ytsearch"):
                    return {"entries":[{"channel_id":"UC019000001","channel":"old"},*candidates]}
                return {"entries":[{"id":"HISTORYVIDEO1","title":"Historical figure biography"}]}
            with patch.object(collector,"run_yt",side_effect=fake):
                collector.collect_scaled(root,output,20,target=300,
                                        search_budget=50,minimum_success=300,
                                        video_limit=5,workers=4)
            summary=json.loads((output/"batch020-summary.json").read_text())
            self.assertEqual(summary["successful"],300)
            self.assertEqual(summary["previous_channels"],6850)
            self.assertEqual(summary["videos"],300)
            self.assertEqual(summary["supabase_requests"],0)
            self.assertEqual(summary["preserved_prior_files"],12)
            self.assertEqual(collector.verify_preserved_files(root,output),12)
            rows=json.loads((output/"out"/"batch020"/"manifest.json").read_text())
            self.assertEqual(len(rows),300)
            self.assertTrue(all(row["channel_id"] not in collector.manifests(
                root,next_batch=20,min_channels=6850) for row in rows))

    def test_scaled_discovery_fails_closed_when_only_40_candidates(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"prior"
            output=Path(tmp)/"next"
            seed(root)
            for batch,number in (("batch018",18),("batch019",19)):
                folder=root/"out"/batch
                folder.mkdir(parents=True)
                (folder/"manifest.json").write_text(json.dumps([
                    {"channel_id":f"UC{number:03d}{i:06d}",
                     "status":"OK","count":0} for i in range(40)
                ]),encoding="utf-8")
            with patch.object(collector,"run_yt",
                              return_value={"entries":[
                                  {"channel_id":f"UC020{i:06d}","channel":"History"}
                                  for i in range(40)]}):
                with self.assertRaisesRegex(RuntimeError,"DISCOVERY_INSUFFICIENT"):
                    collector.collect_scaled(root,output,20,target=300,
                                            search_budget=50,minimum_success=300,
                                            video_limit=5,workers=4)
            self.assertFalse(output.exists())

    def test_no_new_channels_fails_without_creating_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"prior";out=Path(tmp)/"out";seed(root)
            with patch.object(collector,"run_yt",return_value={"entries":[{"channel_id":"UC008000000"}]}):
                with self.assertRaisesRegex(RuntimeError,"DISCOVERY_FAILED_OR_NO_NEW_CHANNELS"):
                    collector.collect(root,out,limit=1,video_limit=5)
            self.assertFalse(out.exists())

if __name__=="__main__":
    unittest.main()
