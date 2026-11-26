import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const handoff = JSON.parse(readFileSync(new URL('../docs/places/PLACE2476_SOURCE_EVIDENCE_DELTA_20261117.json', import.meta.url), 'utf8'));

test('Place evidence delta retains the original immutable fact and Source identities', () => {
  assert.equal(handoff.schema, 'atlas-place-source-evidence-delta/v1');
  assert.equal(handoff.original_review.pr, 2617);
  const reviewedHead = 'ba6ad96783a51a2b712756951b7464e2c11d7d69';
  const reviewedPath = `https://github.com/JezCH/atlas-person-db/blob/${reviewedHead}/docs/handoffs/20261026-work-to-codex/checkpoint/place2476`;
  assert.equal(handoff.original_review.head_sha, reviewedHead);
  assert.equal(handoff.original_review.source_review_url, `${reviewedPath}/source-review.json`);
  assert.equal(handoff.original_review.fact_handoff_url, `${reviewedPath}/fact-evidence-handoff.json`);
  const expected = new Map([
    [18, { sourceId: '9ed98162-dc7d-5a2f-89da-db4aac4694ae', startYear: 656, endYear: 661 }],
    [4, { sourceId: 'c3af4db8-6c27-51da-af04-5f562cbd5cc2', startYear: 1923, endYear: null }],
    [17, { sourceId: '69e4362a-3589-52b4-9a32-5b8e83710552', startYear: 1326, endYear: 1364 }],
    [1, { sourceId: '044aaa9d-e264-5449-bbe4-e380c3f02220', startYear: 1204, endYear: 1260 }],
    [15, { sourceId: '0a3dc36b-9eb9-5536-ac23-5fe71cb9467b', startYear: 1365, endYear: 1452 }],
    [11, { sourceId: '25dfe37e-1389-52de-a203-3231e5a9f106', startYear: 1370, endYear: 1405 }],
    [22, { sourceId: 'e91f57ec-9c46-594b-859b-4a14c2af99ba', startYear: 1250, endYear: 1517 }],
  ]);
  assert.equal(handoff.cases.length, expected.size);
  for (const entry of handoff.cases) {
    const original = expected.get(entry.fact_index);
    assert.ok(original, `unexpected or repeated fact ${entry.fact_index}`);
    assert.equal(entry.source_id, original.sourceId);
    expected.delete(entry.fact_index);
    if (entry.fact_index !== 11 && entry.fact_index !== 22) {
      assert.equal(entry.canonical_identity ?? null, null, `fact ${entry.fact_index}: unresolved canonical identity`);
    }
    assert.ok(entry.historical_claim.function_type === 'capital');
    assert.equal(entry.historical_claim.start_year, original.startYear, `fact ${entry.fact_index}: original start year`);
    assert.equal(entry.historical_claim.end_year, original.endYear, `fact ${entry.fact_index}: original end year`);
    assert.match(entry.review_state, /^HOLD_/);
    assert.ok(entry.finding.length > 50);
    assert.ok(entry.next_action.length > 15);
    assert.ok(Array.isArray(entry.additional_evidence) && entry.additional_evidence.length > 0);
    for (const evidence of entry.additional_evidence) {
      assert.equal(new URL(evidence.url).protocol, 'https:');
      assert.ok(evidence.locator.length >= 16);
      assert.ok(evidence.supports.length >= 20);
    }
  }
  assert.equal(expected.size, 0);
});

test('Place evidence never turns bibliographic search or chronology ambiguity into authorized canonical writes', () => {
  assert.equal(handoff.production_executable, false);
  assert.equal(handoff.production_mutation_authorized, false);
  assert.deepEqual(handoff.operations, []);
  const kufa = handoff.cases.find(e => e.fact_index === 18);
  assert.equal(kufa.historical_claim.start_year, 656);
  assert.match(kufa.finding, /657/);
  const bursa = handoff.cases.find(e => e.fact_index === 17);
  assert.match(bursa.finding, /not independently established/);
  const ankara = handoff.cases.find(e => e.fact_index === 4);
  assert.match(ankara.original_access, /direct original open failed/i);
  assert.ok(handoff.cases.every(e => e.next_action && e.review_state !== 'READY'));
});

test('Samarkand evidence is corroborated for Timur personal reign, not authorized as a blanket Timurid dynasty assertion', () => {
  const entry = handoff.cases.find(e => e.fact_index === 11);
  assert.ok(entry, 'reviewed original fact 11 exists');
  assert.deepEqual(entry.historical_claim, { function_type: 'capital', start_year: 1370, end_year: 1405 });
  assert.deepEqual(entry.canonical_identity, {
    polity_id: '6539c314-ec29-42e0-a0c2-90991fb9ffd8',
    polity: 'Timurid Empire',
    place_id: '4d5eb343-f0d9-521e-8dec-078cd2bcfbc2',
    place: 'Samarkand',
    place_key: 'samarkand'
  });
  assert.equal(entry.source_id, '25dfe37e-1389-52de-a203-3231e5a9f106');
  assert.equal(entry.original_url_existing, 'https://www.metmuseum.org/essays/the-art-of-the-timurid-period-ca-1370-1507');
  assert.match(entry.evidence_status, /PERSONAL_REIGN_CAPITAL_1370_THROUGH_DEATH_1405/);
  assert.match(entry.finding, /not proof of uninterrupted exclusive capital status/);
  assert.equal(entry.additional_evidence.length, 2);
  assert.deepEqual(
    entry.additional_evidence.map(e => new URL(e.url).hostname).sort(),
    ['www.archnet.org', 'www.iranicaonline.org']
  );
  assert.equal(entry.production_before_checked.place_count, 0);
  assert.equal(entry.production_before_checked.source_count, 0);
  assert.match(entry.review_state, /^HOLD_OWNER_APPROVAL/);
  assert.equal(handoff.production_executable, false);
  assert.equal(handoff.production_mutation_authorized, false);
  assert.deepEqual(handoff.operations, []);
});


test('Cairo evidence corroborates capital at year granularity without authorizing restoration', () => {
  const entry=handoff.cases.find(e=>e.fact_index===22);
  assert.deepEqual(entry.historical_claim,{function_type:'capital',start_year:1250,end_year:1517});
  assert.deepEqual(entry.canonical_identity, {
    polity_id: 'e3da3007-529a-40ec-9934-7b70dfd11cb7',
    polity: 'Mamluk Sultanate',
    place_id: '53708ee8-020e-5efa-89f6-85d97d26cd82',
    place: 'Cairo',
    place_key: 'cairo'
  });
  assert.deepEqual(entry.additional_evidence.map(e=>new URL(e.url).hostname).sort(),['whc.unesco.org','www.metmuseum.org']);
  assert.match(entry.review_state,/^HOLD_OWNER_APPROVAL/);
  assert.equal(handoff.production_mutation_authorized,false);
  assert.deepEqual(handoff.operations,[]);
});

test('Ankara full republication and constitutional corroboration preserve the original Source and HOLD', () => {
  const entry = handoff.cases.find(e => e.fact_index === 4);
  const authority = entry.additional_evidence.find(e => new URL(e.url).hostname === 'aym.gov.tr');
  assert.match(authority.locator, /Articles 3 and 4/);
  assert.match(authority.supports, /current capital/);
  assert.equal(entry.original_url_existing, "https://ataturkansiklopedisi.gov.tr/detay/868/Ankara%E2%80%99n%C4%B1n_Ba%C5%9Fkent_Olu%C5%9Fu");
  assert.match(entry.original_access, /direct original open failed/i);
  const article = entry.additional_evidence.find(e => new URL(e.url).hostname === 'sevketrasithatipoglu.meb.k12.tr');
  assert.match(article.locator, /Decision 27.*author signature.*publisher PDF attribution/);
  assert.match(article.supports, /Zafer Koylu.*13 October 1923/);
  assert.match(entry.original_access, /pdf=3842/);
  assert.equal(entry.review_state, 'HOLD_OWNER_APPROVAL_AND_PROTECTED_EXACT_BEFORE');
});
