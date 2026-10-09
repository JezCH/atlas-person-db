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

    def test_no_new_channels_fails_without_creating_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"prior";out=Path(tmp)/"out";seed(root)
            with patch.object(collector,"run_yt",return_value={"entries":[{"channel_id":"UC008000000"}]}):
                with self.assertRaisesRegex(RuntimeError,"DISCOVERY_FAILED_OR_NO_NEW_CHANNELS"):
                    collector.collect(root,out,limit=1,video_limit=5)
            self.assertFalse(out.exists())

if __name__=="__main__":
    unittest.main()
