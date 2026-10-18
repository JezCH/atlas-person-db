import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";

const file=new URL("../audits/youtube-b024-12-original-video-name-link-title-holds-20261018.json",import.meta.url);
const reviewed=JSON.parse(readFileSync(file,"utf8"));

test("12 original archive exact Video-ID+Channel-ID+title+name negative edges do not become approved historical person videos",()=>{
  assert.equal(reviewed.schema,"atlas-youtube-original-video-name-link-title-holds/v1");
  assert.equal(reviewed.title_name_link_holds,12);
  assert.equal(reviewed.original_source_video_count,2230031);
  assert.equal(reviewed.original_source_channel_count,10127);
  assert.equal(reviewed.source_archive_rewritten,false);
  assert.equal(reviewed.production_rank_publishable,false);
  assert.equal(reviewed.title_based_positive_person_content_certified,0);
  assert.equal(new Set(reviewed.links.map(r=>r.video_id)).size,12);
  assert.equal(reviewed.links.some(r=>r.video_id==="-YFLVaoppvo"&&r.raw_name==="Martin Luther"),true);
  assert.equal(reviewed.links.some(r=>r.video_id==="-l3SKRDABZU"&&r.raw_name==="John F Kennedy"),true);
  const run=spawnSync("python3",["-m","unittest","discover","-s","tests",
    "-p","test_youtube_b024_original_video_name_link_holds.py","-v"],{
      encoding:"utf8",timeout:30000
    });
  assert.equal(run.status,0,run.stderr+"\n"+run.stdout);
  assert.match(run.stderr,/Ran 4 tests/);
  assert.match(run.stderr,/OK/);
});
