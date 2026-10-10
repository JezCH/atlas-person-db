import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("source-wide historical-video original-ID ledger preserves 245 reviewed sets",()=>{
  const run=spawnSync("python3",["-m","unittest","discover","-s","tests",
    "-p","test_youtube_b024_source_wide_video_id_ledger.py","-v"],{
    encoding:"utf8",timeout:40000
  });
  assert.equal(run.status,0,run.stderr+"\n"+run.stdout);
  assert.match(run.stderr,/Ran 3 tests/);
  assert.match(run.stderr,/(?:^|\n)OK\n/);
});
