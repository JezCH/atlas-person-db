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

    def test_no_new_channels_fails_without_creating_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/"prior";out=Path(tmp)/"out";seed(root)
            with patch.object(collector,"run_yt",return_value={"entries":[{"channel_id":"UC008000000"}]}):
                with self.assertRaisesRegex(RuntimeError,"DISCOVERY_FAILED_OR_NO_NEW_CHANNELS"):
                    collector.collect(root,out,limit=1,video_limit=5)
            self.assertFalse(out.exists())

if __name__=="__main__":
    unittest.main()
