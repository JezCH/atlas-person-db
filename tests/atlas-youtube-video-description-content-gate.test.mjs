import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

test("entire source Video-ID → YouTube metadata → human content review gate runs in CI",()=>{
  const run=spawnSync("python3",["-m","unittest","discover","-s","tests",
    "-p","test_youtube_video_description_content_gate.py","-v"],{
      encoding:"utf8",timeout:30000
    });
  assert.equal(run.status,0,run.stderr+"\n"+run.stdout);
  assert.match(run.stderr,/Ran 4 tests/);
  assert.match(run.stderr,/OK/);
});
