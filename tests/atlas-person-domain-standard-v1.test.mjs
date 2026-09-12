import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const proposalDir = path.join(root, 'proposals/person-representative-domain');
const sequencedFiles = (prefix) => fs.readdirSync(proposalDir)
  .filter((name) => new RegExp(`^${prefix}-\\d{3}\\.json$`).test(name))
  .sort();
const batchFiles = sequencedFiles('batch');
const holdFiles = sequencedFiles('hold');
const css = fs.readFileSync(path.join(root, 'atlas-person-domain-palette.css'), 'utf8').toLowerCase();
const ui = fs.readFileSync(path.join(root, 'atlas-person-domain-ui.js'), 'utf8');
const applyClient = fs.readFileSync(path.join(root, 'scripts/apply-person-domain-proposals.mjs'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/atlas-person-domain-apply.yml'), 'utf8');
const proposals = [...batchFiles,'palette-smoke-001.json']
  .map((name) => fs.readFileSync(path.join(proposalDir, name), 'utf8'))
  .join('\n');

const palette = Object.freeze({
  governance:'#d4af37',
  military:'#b83a3a',
  knowledge:'#3f78c5',
  technology:'#59636d',
  commerce:'#2e8b57',
  culture:'#9a5ba5',
  religion:'#e2d7b9',
  exploration:'#d96b1e'
});
const cancelledSequenceOrdinals = Object.freeze({
  batch:new Set([22,27,28,29,30]),
  hold:new Set()
});

const readEntries = (names) => names.flatMap((name) => JSON.parse(fs.readFileSync(path.join(proposalDir, name), 'utf8')).entries);

function assertContiguousSequence(files, prefix) {
  assert.ok(files.length > 0);
  const cancelled = cancelledSequenceOrdinals[prefix] || new Set();
  const lastMatch = files.at(-1).match(/-(\d{3})\.json$/);
  assert.ok(lastMatch);
  const maxOrdinal = Number(lastMatch[1]);
  const expected = Array.from({ length:maxOrdinal }, (_, index) => index + 1)
    .filter((ordinal) => !cancelled.has(ordinal))
    .map((ordinal) => `${prefix}-${String(ordinal).padStart(3, '0')}.json`);
  assert.deepEqual(files, expected);
  for (const ordinal of cancelled) {
    assert.equal(files.includes(`${prefix}-${String(ordinal).padStart(3, '0')}.json`), false);
  }
}

function assertBatchDistribution(fileName, expectedLength, expectedCounts) {
  const batch = JSON.parse(fs.readFileSync(path.join(proposalDir, fileName), 'utf8'));
  const counts = Object.fromEntries(Object.keys(palette).map((domain) => [domain, 0]));
  for (const entry of batch.entries) counts[entry.representative_domain] += 1;
  assert.equal(batch.entries.length, expectedLength);
  assert.deepEqual(counts, expectedCounts);
  assert.equal(batch.policy.automatic_role_backfill, false);
  assert.equal(batch.policy.secondary_domains, false);
  return batch;
}

test('final ATLAS representative-domain palette uses the eight exact canonical colors', () => {
  for (const [domain, hex] of Object.entries(palette)) {
    assert.match(css, new RegExp(`--atlas-person-domain-${domain}:\\s*${hex.replace('#','\\#')}`));
    assert.match(css, new RegExp(`data-representative-domain="${domain}"`));
  }
  assert.match(css, /--person-domain-color:\s*transparent/);
  assert.match(css, /--person-domain-edge:\s*transparent/);
  assert.match(css, /--person-domain-tint:\s*transparent/);
});

test('browser registry and reviewed proposals use canonical codes only', () => {
  for (const domain of Object.keys(palette)) assert.match(ui, new RegExp(`code:\"${domain}\"`));
  assert.doesNotMatch(ui, /code:\"ruler\"|code:\"science\"/);
  assert.doesNotMatch(proposals, /"representative_domain"\s*:\s*"(?:ruler|science)"/);
});

test('reviewed batch and HOLD sequences are contiguous except explicitly cancelled ordinals and dynamically discoverable', () => {
  assertContiguousSequence(batchFiles, 'batch');
  assertContiguousSequence(holdFiles, 'hold');
  assert.match(applyClient, /discoverContiguous\("batch"\)/);
  assert.match(applyClient, /discoverContiguous\("hold"\)/);
  assert.match(applyClient, /batch:new Set\(\[22,27,28,29,30\]\)/);
  assert.match(applyClient, /Cancelled \$\{prefix\} ordinal must not have a manifest/);
  assert.doesNotMatch(applyClient, /EXPECTED_REVIEWED_ASSIGNMENTS/);
});

test('reviewed batch Person ids and HOLD Person ids are unique and disjoint', () => {
  const batch = readEntries(batchFiles);
  const holds = readEntries(holdFiles);
  assert.equal(new Set(batch.map((entry) => entry.person_id)).size, batch.length);
  assert.equal(new Set(holds.map((entry) => entry.person_id)).size, holds.length);
  const batchIds = new Set(batch.map((entry) => entry.person_id));
  assert.equal(holds.some((entry) => batchIds.has(entry.person_id)), false);
  assert.equal(holds.every((entry) => entry.representative_domain === null), true);
});

test('Batch 007 contains exactly the reviewed 21-Person distribution', () => {
  assertBatchDistribution('batch-007.json', 21, {
    governance:4,
    military:1,
    knowledge:6,
    technology:1,
    commerce:1,
    culture:2,
    religion:4,
    exploration:2
  });
});

test('Batch 008 contains exactly the reviewed 19-Person science/technology distribution', () => {
  const batch8 = assertBatchDistribution('batch-008.json', 19, {
    governance:0,
    military:0,
    knowledge:15,
    technology:4,
    commerce:0,
    culture:0,
    religion:0,
    exploration:0
  });
  assert.equal(batch8.entries.some((entry) => entry.canonical_name_en === 'James Watt'), false);
  assert.equal(batch8.entries.some((entry) => entry.person_id === '87b9541e-cc28-46ca-a849-43a5a14ae162'), false);
});

test('Batch 009 contains exactly the reviewed 20-Person mixed distribution', () => {
  const batch9 = assertBatchDistribution('batch-009.json', 20, {
    governance:1,
    military:0,
    knowledge:6,
    technology:4,
    commerce:5,
    culture:1,
    religion:0,
    exploration:3
  });
  assert.equal(batch9.entries.some((entry) => entry.person_id === '87b9541e-cc28-46ca-a849-43a5a14ae162'), false);
});

test('Batch 010 contains exactly the reviewed governance/religion distribution', () => {
  const batch10 = assertBatchDistribution('batch-010.json', 20, {
    governance:18,
    military:0,
    knowledge:0,
    technology:0,
    commerce:0,
    culture:0,
    religion:2,
    exploration:0
  });
  assert.equal(batch10.entries.some((entry) => entry.person_id === '87b9541e-cc28-46ca-a849-43a5a14ae162'), false);
});

test('Batch 011 contains exactly the reviewed historical-leader distribution', () => {
  const batch11 = assertBatchDistribution('batch-011.json', 20, {
    governance:19,
    military:0,
    knowledge:1,
    technology:0,
    commerce:0,
    culture:0,
    religion:0,
    exploration:0
  });
  assert.equal(batch11.entries.some((entry) => entry.person_id === '87b9541e-cc28-46ca-a849-43a5a14ae162'), false);
});

test('Batch 012 contains exactly the reviewed balanced distribution', () => {
  const batch12 = assertBatchDistribution('batch-012.json', 20, {
    governance:3,
    military:5,
    knowledge:5,
    technology:2,
    commerce:0,
    culture:2,
    religion:0,
    exploration:3
  });
  assert.equal(batch12.entries.some((entry) => entry.person_id === '1539ff3b-f3fc-492d-9828-34874f338eed' && entry.representative_domain === 'military'), true);
  assert.equal(batch12.entries.some((entry) => entry.person_id === '87b9541e-cc28-46ca-a849-43a5a14ae162'), false);
});

test('Batch 013 contains exactly the reviewed medieval rulers/commanders distribution', () => {
  const batch13 = assertBatchDistribution('batch-013.json', 20, {
    governance:18,
    military:2,
    knowledge:0,
    technology:0,
    commerce:0,
    culture:0,
    religion:0,
    exploration:0
  });
  assert.equal(batch13.entries.some((entry) => entry.person_id === 'fff7a34b-6bff-4e6e-9735-96d16a161a92' && entry.representative_domain === 'governance'), true);
  assert.equal(batch13.entries.some((entry) => entry.person_id === 'e170fae3-b8cc-4a69-9309-5c69269140fb' && entry.representative_domain === 'military'), true);
  assert.equal(batch13.entries.some((entry) => entry.person_id === '87b9541e-cc28-46ca-a849-43a5a14ae162'), false);
});

test('Pythagoras remains an unresolved knowledge/religion HOLD', () => {
  const hold2 = JSON.parse(fs.readFileSync(path.join(proposalDir, 'hold-002.json'), 'utf8'));
  assert.equal(hold2.status, 'unresolved');
  assert.equal(hold2.entries.length, 1);
  const pythagoras = hold2.entries[0];
  assert.equal(pythagoras.person_id, '87b9541e-cc28-46ca-a849-43a5a14ae162');
  assert.equal(pythagoras.canonical_name_en, 'Pythagoras');
  assert.equal(pythagoras.representative_domain, null);
  assert.deepEqual(pythagoras.candidate_domains, ['knowledge','religion']);
});

test('Person-domain workflow observes future reviewed batch and HOLD files through globs', () => {
  assert.match(workflow, /proposals\/person-representative-domain\/batch-\*\.json/);
  assert.match(workflow, /proposals\/person-representative-domain\/hold-\*\.json/);
  assert.doesNotMatch(workflow, /proposals\/person-representative-domain\/batch-006\.json/);
  assert.doesNotMatch(workflow, /proposals\/person-representative-domain\/hold-001\.json/);
});

test('governance explicitly covers major political powerholders beyond sovereign rulers', () => {
  const batch1 = JSON.parse(fs.readFileSync(path.join(proposalDir, 'batch-001.json'), 'utf8'));
  const batch6 = JSON.parse(fs.readFileSync(path.join(proposalDir, 'batch-006.json'), 'utf8'));
  assert.match(batch1.policy.selection_rule, /major de facto political powerholders classified as governance/i);
  assert.match(batch1.policy.governance_scope, /regents/);
  assert.match(batch1.policy.governance_scope, /consorts/);
  assert.match(batch1.policy.governance_scope, /queen mothers/);
  assert.match(batch1.policy.governance_scope, /chief ministers/);
  assert.match(batch1.policy.governance_scope, /de facto rulers/);
  const reviewed = new Map(batch6.entries.map((entry) => [entry.canonical_name_en, entry.representative_domain]));
  assert.equal(reviewed.get('Nefertiti'), 'governance');
  assert.equal(reviewed.get('Jezebel'), 'governance');
});