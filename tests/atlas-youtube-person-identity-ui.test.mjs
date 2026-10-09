import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(file)=>fs.readFileSync(new URL("../"+file,import.meta.url),"utf8");

test("registration review offers separate raw and Person UUID modes",()=>{
  const ui=read("atlas-registration-review.js");
  assert.match(ui,/data-signal-mode="raw"/);
  assert.match(ui,/data-signal-mode="person"/);
  assert.match(ui,/signalMode="raw"/);
  assert.match(ui,/mode="\+encodeURIComponent\(signalMode\)/);
  assert.match(ui,/identityMode && payload\?\.available!==true/);
  assert.match(ui,/통합 순위 미게시 또는 현재 누적 스냅샷과 불일치/);
  assert.match(ui,/Person UUID 연결/);
  assert.match(ui,/matched_variants/);
  assert.match(ui,/signalMode==="raw" && excludeRegistered/);
  assert.match(ui,/regFilter\.disabled=identityMode/);
  assert.match(ui,/원시명 순위/);
  assert.match(ui,/인물별 통합 순위/);
});

test("raw and UUID rankings retain provenance and ensure browser cache invalidation",()=>{
  const ui=read("atlas-registration-review.js");
  const nav=read("atlas-main-authority-nav.js");
  const html=read("index.html");
  const migration=read("db/migrations/20261010_youtube_person_identity_read_model.sql");
  const reader=read("server/atlas-youtube-person-identity-read-service.js");
  assert.match(ui,/누적 \$\{number\(snapshot\.channel_count\)\}개 채널/);
  assert.match(reader,/GLOBAL_SNAPSHOT_SQL/);
  assert.match(reader,/global_snapshot_changed/);
  assert.match(reader,/identity_snapshot_not_published/);
  assert.match(reader,/identity_model_not_installed/);
  assert.match(migration,/ON DELETE RESTRICT/);
  assert.doesNotMatch(migration,/\b(?:DELETE FROM|DROP TABLE|TRUNCATE TABLE)\b/i);
  assert.doesNotMatch(migration,/UPDATE\s+atlas_v2\.youtube_person_signals/i);
  assert.match(nav,/20261010-youtube-person-uuid-view-v1/);
  assert.match(html,/atlas-main-authority-nav\.js\?v=20261010-youtube-person-uuid-view-v1/);
});
