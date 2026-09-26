import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  createPerson,
  normalizePersonLifeStatusReview
} = require('../server/atlas-identity-service.js');

const validator = fs.readFileSync(new URL('../scripts/validate-authoring-request-files.mjs', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/atlas-authoring-apply.yml', import.meta.url), 'utf8');
const adminHtml = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');
const adminUi = fs.readFileSync(new URL('../atlas-admin-identity.js', import.meta.url), 'utf8');
const sop = fs.readFileSync(new URL('../authoring/REGISTRATION_SOP.md', import.meta.url), 'utf8');
const humanDoc = fs.readFileSync(new URL('../authoring/HUMAN_AUTHORING.md', import.meta.url), 'utf8');
const workExecution = fs.readFileSync(new URL('../WORK_EXECUTION.md', import.meta.url), 'utf8');
const policy = fs.readFileSync(new URL('../authoring/LIVING_PERSON_POLICY.md', import.meta.url), 'utf8');

const REVIEW = Object.freeze({
  life_status:'deceased',
  life_status_checked_at:'2026-09-27',
  life_status_basis:'documented_death'
});

test('life-status review accepts only reviewed deceased status', () => {
  assert.deepEqual(normalizePersonLifeStatusReview(REVIEW), REVIEW);
  assert.deepEqual(normalizePersonLifeStatusReview({ ...REVIEW, life_status_basis:'historical_certainty' }), {
    ...REVIEW,
    life_status_basis:'historical_certainty'
  });
  assert.throws(() => normalizePersonLifeStatusReview({ ...REVIEW, life_status:'living' }), /PERSON_LIVING_EXCLUDED/);
  assert.throws(() => normalizePersonLifeStatusReview({ ...REVIEW, life_status:'unknown' }), /PERSON_LIFE_STATUS_REVIEW_REQUIRED/);
  assert.throws(() => normalizePersonLifeStatusReview({ ...REVIEW, life_status_checked_at:'2026-02-30' }), /PERSON_LIFE_STATUS_CHECKED_AT_INVALID/);
  assert.throws(() => normalizePersonLifeStatusReview({ ...REVIEW, life_status_basis:'activity_end' }), /PERSON_LIFE_STATUS_BASIS_INVALID/);
});

test('new Person creation fails closed without deceased review before Person insert', async () => {
  const calls=[];
  const client={
    async query(sql) {
      const text=String(sql);
      calls.push(text);
      if (/insert into atlas_v2\.persons/i.test(text)) throw new Error('PERSON_INSERT_MUST_NOT_RUN');
      return { rows:[] };
    }
  };
  await assert.rejects(
    () => createPerson(client, { canonical_name_en:'Future Example', display_name_ko:'미래 예시' }),
    /PERSON_LIFE_STATUS_REVIEW_REQUIRED/
  );
  assert.equal(calls.some((sql)=>/insert into atlas_v2\.persons/i.test(sql)), false);
});

test('explicit living Person creation is rejected before database access', async () => {
  let queried=false;
  await assert.rejects(
    () => createPerson({ query:async()=>{ queried=true; return {rows:[]}; } }, {
      canonical_name_en:'Living Example',
      display_name_ko:'생존 예시',
      life_status:'living',
      life_status_checked_at:'2026-09-27',
      life_status_basis:'documented_death'
    }),
    /PERSON_LIVING_EXCLUDED/
  );
  assert.equal(queried, false);
});

test('existing Person reuse remains compatible without a new life-status attestation', async () => {
  const client={
    async query(sql) {
      const text=String(sql);
      if (/where p\.canonical_key=\$1/.test(text)) return { rows:[{
        id:'11111111-1111-4111-8111-111111111111',
        person_type:'historical',
        historicity:'historical',
        canonical_name_en:'Existing Person',
        display_name_ko:'기존 인물'
      }] };
      return { rows:[] };
    }
  };
  const outcome=await createPerson(client, { canonical_name_en:'Existing Person', display_name_ko:'기존 인물' });
  assert.equal(outcome.replay, true);
});

test('repository and workflow validators require deceased attestation for changed Person manifests', () => {
  assert.match(validator, /person\.life_status must be deceased/);
  assert.match(validator, /life_status_checked_at/);
  assert.match(validator, /documented_death/);
  assert.match(validator, /historical_certainty/);
  assert.match(workflow, /\.person\.life_status == "deceased"/);
  assert.match(workflow, /\.person\.life_status_checked_at/);
  assert.match(workflow, /\.person\.life_status_basis \| IN\("documented_death","historical_certainty"\)/);
});

test('Admin registration surfaces the same living-Person exclusion contract', () => {
  assert.match(adminHtml, /id="personLifeStatus"/);
  assert.match(adminHtml, /현재 생존 인물을 등록하지 않습니다/);
  assert.match(adminUi, /id="humanLifeStatus"/);
  assert.match(adminUi, /PERSON_LIVING_EXCLUDED/);
  assert.match(adminUi, /life_status:\s*value\("humanLifeStatus"\)/);
  assert.match(adminUi, /activity.*종료연도|활동 종료연도/);
});

test('canonical docs forbid Activity and birth-year proxies for current survival', () => {
  for (const source of [policy, sop, humanDoc, workExecution]) {
    assert.match(source, /living|생존/i);
    assert.match(source, /activity_end|Activity chronology|활동 종료연도/i);
    assert.match(source, /birth.year|birth-year|1926|출생/i);
  }
  assert.match(policy, /currently living people are excluded|excludes every person who is currently living/i);
  assert.match(policy, /CEO/);
  assert.match(policy, /film directors/);
  assert.match(policy, /historical manifests.*audit evidence/i);
});
