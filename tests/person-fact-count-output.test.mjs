import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PHFC_M49_COUNTRY_AREA_CODES,
  assertPersonFactCountOutput,
  derivePersonFactCounts,
  formatPersonFactCountResult,
  validatePersonFactCountOutput,
} from '../server/person-fact-count-output.mjs';

const DOMAIN_IDS = [
  'governance','military','knowledge','technology',
  'commerce','culture','religion','exploration',
];

const G_MODE_KEYS = [
  'institutional_adoption',
  'formal_teaching',
  'documented_imitation',
  'operative_application',
  'movement_reception',
  'documented_circulation',
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cellStates(profile) {
  const out = [];
  for (const group of ['E','R','T']) {
    profile[group].forEach((state, index) => out.push([group + (index + 1), state]));
  }
  DOMAIN_IDS.forEach((domain) => out.push(['D.' + domain, profile.D[domain]]));
  G_MODE_KEYS.forEach((mode, index) => out.push(['G' + (index + 1), profile.G.modes[mode].state]));
  profile.S.forEach((state, index) => out.push(['S' + (index + 1), state]));
  return out;
}

function evidenceFor(profile) {
  return Object.fromEntries(
    cellStates(profile).map(([id, state]) => [
      id,
      state === '?' ? [] : ['https://example.org/phfc/' + encodeURIComponent(id)],
    ]),
  );
}

function finalize(profile) {
  profile.zeroReviewClosed = cellStates(profile)
    .filter(([, state]) => state === '0')
    .map(([id]) => id);
  profile.evidenceRefs = evidenceFor(profile);
  return profile;
}

function baseProfile() {
  return finalize({
    E: ['1','1','1','1','1','?'],
    R: ['1','1','1','0','1','1'],
    T: ['1','1','1','1','?','0'],
    D: {
      governance: '1',
      military: '1',
      knowledge: '0',
      technology: '0',
      commerce: '0',
      culture: '?',
      religion: '0',
      exploration: '0',
    },
    G: {
      originSet: ['276'],
      modes: {
        institutional_adoption: { state: '1', units: ['528'] },
        formal_teaching: { state: '0', units: [] },
        documented_imitation: { state: '1', units: ['752'] },
        operative_application: { state: '0', units: [] },
        movement_reception: { state: '?', units: [] },
        documented_circulation: { state: '1', units: ['826'] },
      },
    },
    S: ['0','1','1','?','1','0'],
  });
}

test('deriver computes PHFC v4.3 from source-backed fixed factual cells', () => {
  const r = derivePersonFactCounts(baseProfile());
  assert.deepEqual(r.counts, { E: 5, R: 5, T: 4, D: 2, G: 3, S: 3 });
  assert.equal(r.verifiedCount, 22);
  assert.equal(r.status, 'HOLD');
  assert.deepEqual(r.unresolved, ['E6','T5','D.culture','G5','S4']);
});

test('formatter emits count block first, evidence last, and round-trips', () => {
  const output = formatPersonFactCountResult(baseProfile());
  assert.match(
    output,
    /^E_COUNT 5\/6\nR_COUNT 5\/6\nT_COUNT 4\/6\nD_COUNT 2\/6\nG_COUNT 3\/6\nS_COUNT 3\/6\nVERIFIED_COUNT 22\/36\nUNRESOLVED 5\nSTATUS HOLD\n/,
  );
  assert.match(output, /G_ORIGIN \["276"\]/);
  assert.match(output, /G_UNITS {"G1":\["528"\],"G2":\[\],"G3":\["752"\]/);
  assert.match(output, /ZERO_REVIEW_CLOSED /);
  assert.match(output, /\nEVIDENCE {/);
  const validated = assertPersonFactCountOutput(output);
  assert.equal(validated.standard, 'ATLAS-PHFC-4.3');
  assert.equal(validated.verifiedCount, 22);
});

test('every VERIFIED and REVIEWED_NOT_ESTABLISHED cell requires evidence', () => {
  const missingVerified = baseProfile();
  missingVerified.evidenceRefs.E1 = [];
  assert.throws(
    () => derivePersonFactCounts(missingVerified),
    /E1 VERIFIED requires at least one evidence reference/,
  );

  const missingZero = baseProfile();
  missingZero.evidenceRefs.R4 = [];
  assert.throws(
    () => derivePersonFactCounts(missingZero),
    /R4 REVIEWED_NOT_ESTABLISHED requires at least one evidence reference/,
  );
});

test('unresolved cells may preserve zero or more evidence references', () => {
  const noEvidence = baseProfile();
  assert.equal(derivePersonFactCounts(noEvidence).status, 'HOLD');

  const partialEvidence = baseProfile();
  partialEvidence.evidenceRefs.E6 = ['https://example.org/conflicting-evidence'];
  assert.equal(derivePersonFactCounts(partialEvidence).status, 'HOLD');
});

test('evidence references accept canonical Source UUIDs and absolute HTTPS URLs only', () => {
  const sourceRef = baseProfile();
  sourceRef.evidenceRefs.E1 = ['source:123e4567-e89b-42d3-a456-426614174000'];
  assert.equal(derivePersonFactCounts(sourceRef).counts.E, 5);

  const bad = baseProfile();
  bad.evidenceRefs.E1 = ['citation:some book'];
  assert.throws(
    () => derivePersonFactCounts(bad),
    /must use source:<uuid> or an absolute https:\/\/ URL/,
  );
});

test('M49 registry is country-area only and excludes aggregate region codes', () => {
  assert.equal(PHFC_M49_COUNTRY_AREA_CODES.length, 248);
  assert.equal(PHFC_M49_COUNTRY_AREA_CODES.includes('840'), true);
  assert.equal(PHFC_M49_COUNTRY_AREA_CODES.includes('276'), true);
  assert.equal(PHFC_M49_COUNTRY_AREA_CODES.includes('001'), false);
  assert.equal(PHFC_M49_COUNTRY_AREA_CODES.includes('002'), false);
});

test('G rejects free-text, invalid, and aggregate geographic values', () => {
  for (const invalid of ['Germany','999','001']) {
    const profile = baseProfile();
    profile.G.originSet = [invalid];
    assert.throws(
      () => derivePersonFactCounts(profile),
      /non-canonical UN M49 country\/area code/,
    );
  }
});

test('G counts fixed reception modes, not number of valid M49 units found', () => {
  const expanded = baseProfile();
  expanded.G.modes.institutional_adoption.units.push('840','250','392');
  expanded.G.modes.documented_imitation.units.push('380','076');
  const r = derivePersonFactCounts(expanded);
  assert.equal(r.counts.G, 3);
  assert.equal(r.verifiedCount, 22);
  assert.equal(r.profile.G.modes.institutional_adoption.units.length, 4);
});

test('a new verified G mode changes G_COUNT by one regardless of unit count', () => {
  const expanded = baseProfile();
  expanded.G.modes.formal_teaching = { state: '1', units: ['840','124','036'] };
  expanded.zeroReviewClosed = expanded.zeroReviewClosed.filter((id) => id !== 'G2');
  expanded.evidenceRefs.G2 = ['https://example.org/phfc/G2'];
  const r = derivePersonFactCounts(expanded);
  assert.equal(r.counts.G, 4);
  assert.equal(r.verifiedCount, 23);
});

test('G rejects origin overlap using canonical M49 identity', () => {
  const overlap = baseProfile();
  overlap.G.modes.institutional_adoption.units.push('276');
  assert.throws(() => derivePersonFactCounts(overlap), /overlaps ORIGIN_SET/);
});

test('zero states require both exact closure and closure evidence', () => {
  const missingClosure = baseProfile();
  missingClosure.zeroReviewClosed = missingClosure.zeroReviewClosed.filter((id) => id !== 'R4');
  assert.throws(
    () => derivePersonFactCounts(missingClosure),
    /zeroReviewClosed must exactly match every 0-state cell/,
  );

  const missingEvidence = baseProfile();
  missingEvidence.evidenceRefs.R4 = [];
  assert.throws(
    () => derivePersonFactCounts(missingEvidence),
    /REVIEWED_NOT_ESTABLISHED requires at least one evidence reference/,
  );
});

test('unresolved cannot silently become zero without closure and evidence', () => {
  const unresolvedToZero = baseProfile();
  unresolvedToZero.G.modes.movement_reception.state = '0';
  assert.throws(
    () => derivePersonFactCounts(unresolvedToZero),
    /zeroReviewClosed must exactly match every 0-state cell/,
  );

  unresolvedToZero.zeroReviewClosed.push('G5');
  assert.throws(
    () => derivePersonFactCounts(unresolvedToZero),
    /G5 REVIEWED_NOT_ESTABLISHED requires at least one evidence reference/,
  );

  unresolvedToZero.evidenceRefs.G5 = ['https://example.org/phfc/G5'];
  const r = derivePersonFactCounts(unresolvedToZero);
  assert.deepEqual(r.unresolved, ['E6','T5','D.culture','S4']);
});

test('D retains eight raw domains while contribution remains capped at six', () => {
  const expanded = baseProfile();
  for (const key of Object.keys(expanded.D)) expanded.D[key] = '1';
  expanded.zeroReviewClosed = expanded.zeroReviewClosed.filter((id) => !id.startsWith('D.'));
  expanded.evidenceRefs = evidenceFor(expanded);
  const r = derivePersonFactCounts(expanded);
  assert.equal(r.counts.D, 6);
  assert.equal(Object.keys(r.profile.D).length, 8);
});

test('counting input cannot branch on Person type metadata', () => {
  const withRoleMetadata = { ...clone(baseProfile()), personType: 'public-office-holder' };
  assert.throws(
    () => derivePersonFactCounts(withRoleMetadata),
    /profile input must contain exactly/,
  );
});

test('validator rejects prose before the count block', () => {
  const output = '설명부터 시작\n' + formatPersonFactCountResult(baseProfile());
  assert.equal(validatePersonFactCountOutput(output).ok, false);
});

test('validator rejects tampered arithmetic and count/profile mismatch', () => {
  const output = formatPersonFactCountResult(baseProfile());

  const badTotal = output.replace('VERIFIED_COUNT 22/36', 'VERIFIED_COUNT 21/36');
  assert.match(validatePersonFactCountOutput(badTotal).error, /VERIFIED_COUNT arithmetic mismatch/);

  const badGroup = output.replace('G_COUNT 3/6', 'G_COUNT 2/6');
  assert.match(validatePersonFactCountOutput(badGroup).error, /G_COUNT does not match raw profile/);
});

test('COMPLETE is derived only after every unresolved cell is resolved with closure/evidence', () => {
  const complete = baseProfile();

  complete.E[5] = '0';
  complete.T[4] = '1';
  complete.D.culture = '0';
  complete.G.modes.movement_reception.state = '0';
  complete.S[3] = '0';

  complete.zeroReviewClosed = cellStates(complete)
    .filter(([, state]) => state === '0')
    .map(([id]) => id);
  complete.evidenceRefs = evidenceFor(complete);

  const output = formatPersonFactCountResult(complete);
  assert.match(output, /UNRESOLVED 0\nSTATUS COMPLETE\n/);
  assert.equal(validatePersonFactCountOutput(output).ok, true);
});
