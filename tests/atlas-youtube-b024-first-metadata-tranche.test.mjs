import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("historical source-first video tranche and resumable official metadata collector",()=>{
  const r=spawnSync("python3",["-m","unittest","discover","-s","tests",
    "-p","test_youtube_b024_first_metadata_tranche.py","-v"],{
      encoding:"utf8",timeout:30000
  });
  assert.equal(r.status,0,r.stderr+"\n"+r.stdout);
  assert.match(r.stderr,/Ran 5 tests/);
  assert.match(r.stderr,/(?:^|\n)OK\n/);
});
