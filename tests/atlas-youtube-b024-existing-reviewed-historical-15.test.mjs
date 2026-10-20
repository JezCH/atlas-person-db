import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
test("real B024 historical source 15 review preserves original-ID provenance and no false current absence",()=>{
 const r=spawnSync("python3",["-m","unittest","discover","-s","tests",
  "-p","test_youtube_b024_reviewed_historical_15_original_ids.py","-v"],{encoding:"utf8",timeout:60000});
 assert.equal(r.status,0,r.stderr+"\n"+r.stdout);
 assert.match(r.stderr,/Ran 3 tests/);
 assert.match(r.stderr,/OK/);
});
