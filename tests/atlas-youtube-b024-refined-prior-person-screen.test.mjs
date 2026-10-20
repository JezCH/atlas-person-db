import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
test("refine REAL B024 cohort candidate rank from reviewed positive UUID and living evidence without new videos",()=>{
 const r=spawnSync("python3",["-m","unittest","discover","-s","tests",
 "-p","test_youtube_b024_refined_priors.py","-v"],{encoding:"utf8",timeout:60000});
 assert.equal(r.status,0,r.stderr+"\n"+r.stdout);
 assert.match(r.stderr,/Ran 3 tests/);
 assert.match(r.stderr,/OK/);
});
