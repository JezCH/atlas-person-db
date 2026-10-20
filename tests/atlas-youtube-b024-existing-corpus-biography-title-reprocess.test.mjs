import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("offline B024 existing corpus strict-original-title triage, no crawling/no content certification",()=>{
 const result=spawnSync("python3",[
  "-m","unittest","discover","-s","tests",
  "-p","test_youtube_b024_existing_corpus_biography_title_reprocess.py","-v"
 ],{encoding:"utf8",timeout:45000});
 assert.equal(result.status,0,result.stdout+"\n"+result.stderr);
 assert.match(result.stderr,/Ran 6 tests/);
 assert.match(result.stderr,/OK/);
});
