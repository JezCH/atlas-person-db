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

const readEntries = (names) => names.flatMap((name) => JSON.parse(fs.readFileSync(path.join(proposalDir, name), 'utf8')).entries);

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

test('reviewed batch and HOLD sequences are contiguous and dynamically discoverable', () => {
  assert.deepEqual(batchFiles, ['batch-001.json','batch-002.json','batch-003.json','batch-004.json','batch-005.json','batch-006.json','batch-007.json','batch-008.json','batch-009.json']);
  assert.deepEqual(holdFiles, ['hold-001.json','hold-002.json']);
  assert.match(applyClient, /discoverContiguous\("batch"\)/);
  assert.match(applyClient, /discoverContiguous\("hold"\)/);
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
  const batch7 = JSON.parse(fs.readFileSync(path.join(proposalDir, 'batch-007.json'), 'utf8'));
  const counts = Object.fromEntries(Object.keys(palette).map((domain) => [domain, 0]));
  for (const entry of batch7.entries) counts[entry.representative_domain] += 1;
  assert.equal(batch7.entries.length, 21);
  assert.deepEqual(counts, {
    governance:4,
    military:1,
    knowledge:6,
    technology:1,
    commerce:1,
    culture:2,
    religion:4,
    exploration:2
  });
  assert.equal(batch7.policy.automatic_role_backfill, false);
  assert.equal(batch7.policy.secondary_domains, false);
});

test('Batch 008 contains exactly the reviewed 19-Person science/technology distribution', () => {
  const batch8 = JSON.parse(fs.readFileSync(path.join(proposalDir, 'batch-008.json'), 'utf8'));
  const counts = Object.fromEntries(Object.keys(palette).map((domain) => [domain, 0]));
  for (const entry of batch8.entries) counts[entry.representative_domain] += 1;
  assert.equal(batch8.entries.length, 19);
  assert.deepEqual(counts, {
    governance:0,
    military:0,
    knowledge:15,
    technology:4,
    commerce:0,
    culture:0,
    religion:0,
    exploration:0
  });
  assert.equal(batch8.policy.automatic_role_backfill, false);
  assert.equal(batch8.policy.secondary_domains, false);
  assert.equal(batch8.entries.some((entry) => entry.canonical_name_en === 'James Watt'), false);
  assert.equal(batch8.entries.some((entry) => entry.person_id === '87b9541e-cc28-46ca-a849-43a5a14ae162'), false);
});

test('Batch 009 contains exactly the reviewed 20-Person mixed distribution', () => {
  const batch9 = JSON.parse(fs.readFileSync(path.join(proposalDir, 'batch-009.json'), 'utf8'));
  const counts = Object.fromEntries(Object.keys(palette).map((domain) => [domain, 0]));
  for (const entry of batch9.entries) counts[entry.representative_domain] += 1;
  assert.equal(batch9.entries.length, 20);
  assert.deepEqual(counts, {
    governance:1,
    military:0,
    knowledge:6,
    technology:4,
    commerce:5,
    culture:1,
    religion:0,
    exploration:3
  });
  assert.equal(batch9.policy.automatic_role_backfill, false);
  assert.equal(batch9.policy.secondary_domains, false);
  assert.equal(batch9.entries.some((entry) => entry.person_id === '87b9541e-cc28-46ca-a849-43a5a14ae162'), false);
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
