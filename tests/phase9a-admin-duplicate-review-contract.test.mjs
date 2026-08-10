import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const schema = fs.readFileSync(new URL('../migration/phase-9/phase9a-admin-duplicate-review-schema.sql', import.meta.url), 'utf8');
const applyScript = fs.readFileSync(new URL('../migration/phase-9/scripts/phase9a-apply-duplicate-review-schema.mjs', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../server/atlas-duplicate-review-service.js', import.meta.url), 'utf8');
const handler = fs.readFileSync(new URL('../server/atlas-duplicate-review-handler.js', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../api/atlas-duplicate-review.js', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('../admin.js', import.meta.url), 'utf8');
const adminHtml = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');

test('review schema is normalized, audited, and non-destructive', () => {
  assert.match(schema, /atlas_v2\.person_duplicate_candidates/);
  assert.match(schema, /atlas_v2\.person_duplicate_reviews/);
  assert.match(schema, /MERGE.*KEEP_SEPARATE.*REVIEW/s);
  assert.match(schema, /evidence_fingerprint/);
  assert.match(schema, /request_id text NOT NULL UNIQUE/i);
  assert.doesNotMatch(schema, /DROP\s+(?:TABLE|VIEW)/i);
  assert.doesNotMatch(schema, /public\.person_politics|atlas_person_politics_compat_v1/);
});

test('schema self-check validates required column names and types instead of a brittle raw count', () => {
  for (const required of [
    'person_low_id',
    'person_high_id',
    'candidate_state',
    'current_decision',
    'confidence',
    'evidence_fingerprint',
    'decision_evidence_fingerprint',
    'detector_version',
    'review_count',
    'candidate_id',
    'evidence_snapshot',
    'reviewer_kind',
    'request_id'
  ]) {
    assert.match(schema, new RegExp(`\\('${required}',\\s*'`));
  }
  assert.match(schema, /contract mismatch/);
  assert.doesNotMatch(schema, /candidate_columns\s*<\s*16/);
  assert.doesNotMatch(schema, /review_columns\s*<\s*11/);
});

test('schema apply always preserves failure evidence and proves relationship immutability', () => {
  assert.match(applyScript, /fs\.mkdirSync\(outputDir, \{ recursive: true \}\)/);
  assert.match(applyScript, /reportPath/);
  assert.match(applyScript, /status = 'FAIL'/);
  assert.match(applyScript, /persistReport\(\)/);
  assert.match(applyScript, /relationships_unchanged/);
  assert.match(applyScript, /before_relationships/);
  assert.match(applyScript, /after_relationships/);
  assert.doesNotMatch(applyScript, /insert\s+into\s+atlas_v2\.person_politics_v2/i);
  assert.doesNotMatch(applyScript, /update\s+atlas_v2\.person_politics_v2/i);
  assert.doesNotMatch(applyScript, /delete\s+from\s+atlas_v2\.person_politics_v2/i);
});

test('server review service never implements person merge/delete in Phase 9A', () => {
  assert.match(service, /detectPersonDuplicateCandidates/);
  assert.match(service, /person_duplicate_reviews/);
  assert.doesNotMatch(service, /delete\s+from\s+atlas_v2\.persons/i);
  assert.doesNotMatch(service, /update\s+atlas_v2\.person_politics_v2\s+set\s+person_id/i);
});

test('duplicate review endpoint is authenticated and server-side', () => {
  assert.match(handler, /createMutationAuthorizer/);
  assert.match(handler, /REBUILD_CANDIDATES/);
  assert.match(handler, /REVIEW_CANDIDATE/);
  assert.match(api, /Client/);
  assert.doesNotMatch(api + handler, /SUPABASE_ANON|createClient\(/);
});

test('admin UI exposes evidence review and explicitly separates approval from merge execution', () => {
  assert.match(adminHtml, /중복 후보 검토/);
  assert.match(adminHtml, /후보 새로 계산/);
  assert.match(adminHtml, /병합 승인/);
  assert.match(adminHtml, /별개 인물/);
  assert.match(adminHtml, /추가 검토/);
  assert.match(admin, /MERGE/);
  assert.match(admin, /KEEP_SEPARATE/);
  assert.match(admin, /REVIEW/);
  assert.match(admin, /실제 병합은 Phase 9B/);
});
