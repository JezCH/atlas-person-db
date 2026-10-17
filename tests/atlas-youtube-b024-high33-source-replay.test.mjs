import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("33 real high-risk name aggregates and original Video-ID replay fail closed",()=>{
  const result=spawnSync("python3",["-m","unittest","discover","-s","tests",
    "-p","test_youtube_b024_high33_source_replay.py","-v"],{
    encoding:"utf8",timeout:30000
  });
  assert.equal(result.status,0,result.stderr+"\n"+result.stdout);
  assert.match(result.stderr,/Ran 4 tests/);
  assert.match(result.stderr,/OK/);
});
