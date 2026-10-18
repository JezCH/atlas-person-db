import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("three original-ID public player probe stays source-bound, offline-tested and nonpublishing",()=>{
 const run=spawnSync("python3",["-m","unittest","discover","-s","tests",
   "-p","test_youtube_b024_first3_public_player_probe.py","-v"],
   {encoding:"utf8",timeout:30000});
 assert.equal(run.status,0,run.stderr+"\n"+run.stdout);
 assert.match(run.stderr,/Ran 5 tests/);
 assert.match(run.stderr,/OK/);
});
