import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyPersonReadback } from '../scripts/atlas-authoring-runtime-readback.mjs';

const personId = '44d38e5f-e48a-4bc5-9357-ab30f8625399';
const activityId = '34d56578-a361-402a-a710-c643b52e8f2e';
const polityId = '7d09bc56-1ea0-515e-a3e7-9863361b6f15';
const source = { title: 'Library of Congress', canonical_url: 'https://www.loc.gov' };
const manifest = {
  person: { person_type: 'historical', canonical_name_en: 'Mark Twain', representative_domain: 'culture' },
  activity: { relation_type: 'active_in', start_year: 1885, end_year: 1885 },
  polity: { existing_id: polityId },
  sources: [source],
  external_references: { namuwiki: { status: 'linked' } }
};
const response = {
  ok: true,
  schema: 'atlas-person-read/v1',
  mode: 'detail',
  person: {
    id: personId, canonical_name_en: 'Mark Twain', person_type: 'historical',
    representative_domain: 'culture', external_references: { namuwiki: { status: 'linked' } },
    activities: [{
      id: activityId, person_id: personId, polity: { id: polityId },
      relation: { code: 'active_in' }, start: { year: 1885 }, end: { year: 1885 },
      sources: [source]
    }]
  }
};
const applied = { person_id: personId, relationship_id: activityId };
const run = (alter) => {
  const args = { person: structuredClone(response), manifest: structuredClone(manifest), applied: structuredClone(applied) };
  if (alter) alter(args);
  return verifyPersonReadback(args);
};
test('exact user-visible Production Person/Activity/Polity/Source data accepted', () => {
  assert.deepEqual(run(), { ok: true, personId, activityId });
});
test('wrong Person ID or unreviewed representative domain fails', () => {
  assert.equal(run((x) => { x.person.person.id = 'other'; }).reason, 'PERSON_IDENTITY_OR_DOMAIN_MISMATCH');
  assert.equal(run((x) => { x.person.person.representative_domain = 'governance'; }).reason, 'PERSON_IDENTITY_OR_DOMAIN_MISMATCH');
});
test('wrong Activity, Polity, period or relation never passes', () => {
  assert.equal(run((x) => { x.applied.relationship_id = 'other'; }).reason, 'ACTIVITY_POLITY_OR_YEAR_MISMATCH');
  assert.equal(run((x) => { x.person.person.activities[0].polity.id = 'another'; }).reason, 'ACTIVITY_POLITY_OR_YEAR_MISMATCH');
  assert.equal(run((x) => { x.person.person.activities[0].start.year = 1884; }).reason, 'ACTIVITY_POLITY_OR_YEAR_MISMATCH');
  assert.equal(run((x) => { x.person.person.activities[0].relation.code = 'serves'; }).reason, 'ACTIVITY_POLITY_OR_YEAR_MISMATCH');
});
test('no provenance or NamuWiki mismatch is silently accepted', () => {
  assert.equal(run((x) => { x.person.person.activities[0].sources = []; }).reason, 'ACTIVITY_SOURCE_PROVENANCE_MISMATCH');
  assert.equal(run((x) => { x.person.person.external_references.namuwiki.status = 'not_found'; }).reason, 'NAMUWIKI_REVIEW_MISMATCH');
  assert.equal(run((x) => { x.person.ok = false; }).reason, 'PERSON_DETAIL_NOT_LIVE');
});
