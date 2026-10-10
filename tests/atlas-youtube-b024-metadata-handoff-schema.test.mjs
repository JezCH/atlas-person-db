import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("original B024 metadata handoff reconciles source IDs, channel and name cues",()=>{
  const run=spawnSync("python3",["-m","unittest","discover",
     "-s","tests","-p","test_youtube_b024_handoff_schema_reconciliation.py","-v"],
    {encoding:"utf8",timeout:30000});
  assert.equal(run.status,0,run.stderr+"\n"+run.stdout);
  assert.match(run.stderr,/Ran 3 tests/);
  assert.match(run.stderr,/(?:\n|^)OK\n/);
});
