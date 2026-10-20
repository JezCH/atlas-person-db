import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("B024 actual old-registration UUID and original-ID biography cohort screen stays unpublishable",()=>{
 const r=spawnSync("python3",["-m","unittest","discover","-s","tests",
 "-p","test_youtube_b024_existing_biography_cohort_screen.py","-v"],{encoding:"utf8",timeout:60000});
 assert.equal(r.status,0,r.stderr+"\n"+r.stdout);
 assert.match(r.stderr,/Ran 4 tests/);
 assert.match(r.stderr,/OK/);
});
