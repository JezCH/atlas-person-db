import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("Production v5 entire 8713-to-5965 independent source crosswalk keeps raw names unapproved",()=>{
 const run=spawnSync("python3",["-m","unittest","discover","-s","tests",
     "-p","test_youtube_b024_v5_full_source_reconcile.py","-v"],{
  encoding:"utf8",timeout:30000
 });
 assert.equal(run.status,0,run.stderr+"\n"+run.stdout);
 assert.match(run.stderr,/Ran 3 tests/);
 assert.match(run.stderr,/(?:^|\n)OK\n/);
});
