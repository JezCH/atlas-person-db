import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("public YouTube publisher descriptions match exact B024 original video IDs and channels",()=>{
  const p=spawnSync("python3",["-m","unittest","discover",
    "-s","tests","-p","test_youtube_b024_public_publisher_evidence.py","-v"],
    {encoding:"utf8",timeout:30000});
  assert.equal(p.status,0,p.stderr+"\n"+p.stdout);
  assert.match(p.stderr,/Ran 3 tests/);
  assert.match(p.stderr,/(?:^|\n)OK\n/);
});
