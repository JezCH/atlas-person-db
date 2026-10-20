import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("B024 additional original-ID person-profile title evidence is not watched-video certification",()=>{
 const result=spawnSync("python3",[
  "-m","unittest","discover","-s","tests",
  "-p","test_youtube_b024_broader_title_person_subject_ids.py","-v"
 ],{encoding:"utf8",timeout:60000});
 assert.equal(result.status,0,result.stdout+"\n"+result.stderr);
 assert.match(result.stderr,/Ran 5 tests/);
 assert.match(result.stderr,/OK/);
});
