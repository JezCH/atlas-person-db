import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const root=path.resolve(new URL("..",import.meta.url).pathname);

test("YouTube signal publication reuses the existing authoring physical API route",()=>{
  const api=fs.readFileSync(path.join(root,"api/atlas-authoring-apply.js"),"utf8");
  const workflow=fs.readFileSync(path.join(root,".github/workflows/youtube-person-signal-publish.yml"),"utf8");
  assert.match(api,/__atlas_authoring_apply_surface/);
  assert.match(api,/youtube-person-signal-publish/);
  assert.match(api,/createYoutubePersonSignalPublishHandler/);
  assert.match(workflow,/api\/atlas-authoring-apply\?__atlas_authoring_apply_surface=youtube-person-signal-publish/);
  assert.equal(fs.existsSync(path.join(root,"api/atlas-youtube-person-signal-publish.js")),false);
});

test("authoring apply surface parser accepts URL and direct query without changing default authoring behavior",()=>{
  const api=require("../api/atlas-authoring-apply.js");
  assert.equal(
    api.queryValue({url:"/api/atlas-authoring-apply?__atlas_authoring_apply_surface=youtube-person-signal-publish"},"__atlas_authoring_apply_surface"),
    "youtube-person-signal-publish"
  );
  assert.equal(
    api.queryValue({query:{__atlas_authoring_apply_surface:"youtube-person-signal-publish"}},"__atlas_authoring_apply_surface"),
    "youtube-person-signal-publish"
  );
  assert.equal(api.queryValue({url:"/api/atlas-authoring-apply"},"__atlas_authoring_apply_surface"),"");
});


test("YouTube durable source catalog reuses authoring route and remains workflow-dispatch only",()=>{
  const api=fs.readFileSync(path.join(root,"api/atlas-authoring-apply.js"),"utf8");
  const workflow=fs.readFileSync(path.join(root,".github/workflows/youtube-preserve-verified-corpus.yml"),"utf8");
  assert.match(api,/youtube-source-archive-catalog/);
  assert.match(api,/createYoutubeSourceArchiveHandler/);
  assert.match(workflow,/__atlas_authoring_apply_surface=youtube-source-archive-catalog/);
  assert.match(workflow,/id-token:\s*write/);
  assert.match(workflow,/workflow_dispatch:/);
  assert.doesNotMatch(workflow,/\npush:/);
  assert.equal(fs.existsSync(path.join(root,"api/atlas-youtube-source-archive.js")),false);
});
