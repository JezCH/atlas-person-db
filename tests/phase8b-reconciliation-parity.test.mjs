import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { planReconciliation } = require('../atlas-reconciliation-planner.js');

const FIELDS = ['person_name','politic_name','activity_start','activity_end','role','period_basis','notes'];
const normalizeText = (value) => String(value ?? '').trim();
const normalizeLookup = (value) => normalizeText(value).toLowerCase();
function normalizeRecord(input) {
  return {
    id: input?.id ?? null,
    person_name: normalizeText(input?.person_name),
    politic_name: normalizeText(input?.politic_name),
    activity_start: Number(input?.activity_start),
    activity_end: Number(input?.activity_end),
    role: normalizeText(input?.role) || null,
    period_basis: normalizeText(input?.period_basis),
    notes: normalizeText(input?.notes) || null
  };
}
const activityKey = (r) => [r.person_name,r.politic_name,r.activity_start,r.activity_end].join('\u0001').toLowerCase();

function legacyModel({ existingRows = [], canonicalRows = [], excludedNames = [], obsoleteKeys = [] }) {
  const canonical = canonicalRows.map(normalizeRecord);
  const canonicalByKey = new Map(canonical.map((r) => [activityKey(r), r]));
  const managedPersons = new Set([
    ...canonical.map((r) => normalizeLookup(r.person_name)),
    ...excludedNames.map(normalizeLookup)
  ]);
  const obsolete = new Set(obsoleteKeys.map((k) => String(k).toLowerCase()));
  const retained = new Set();
  const out = { inserts: [], updates: [], deletes: [], duplicates: [], unchanged: [] };

  for (const raw of existingRows) {
    const row = normalizeRecord(raw);
    const key = activityKey(row);
    const desired = canonicalByKey.get(key);
    const personKey = normalizeLookup(row.person_name);

    if ((managedPersons.has(personKey) && !desired) || obsolete.has(key)) {
      out.deletes.push({ id: row.id, key });
      continue;
    }
    if (!desired) {
      out.unchanged.push({ id: row.id, key });
      continue;
    }
    if (retained.has(key)) {
      out.duplicates.push({ id: row.id, key });
      continue;
    }
    retained.add(key);
    const differs = FIELDS.some((field) => String(row[field] ?? '') !== String(desired[field] ?? ''));
    if (differs) out.updates.push({ id: row.id, key });
    else out.unchanged.push({ id: row.id, key });
  }

  for (const [key] of canonicalByKey) {
    if (!retained.has(key)) out.inserts.push({ key });
  }
  return out;
}

function simplifyPlanner(report) {
  const keyOf = (item) => item.evidence?.activity_key;
  return {
    inserts: report.proposed_inserts.map((x) => ({ key: keyOf(x) })),
    updates: report.proposed_updates.map((x) => ({ id: x.id, key: keyOf(x) })),
    deletes: report.proposed_deletes.map((x) => ({ id: x.id, key: keyOf(x) })),
    duplicates: report.proposed_duplicate_removals.map((x) => ({ id: x.id, key: keyOf(x) })),
    unchangedCount: report.unchanged_row_count
  };
}

const canonical = [
  { person_name:'Ada Lovelace', politic_name:'United Kingdom', activity_start:1842, activity_end:1852, role:'Mathematician', period_basis:'intellectual_activity', notes:null },
  { person_name:'Grace Hopper', politic_name:'United States', activity_start:1944, activity_end:1986, role:'Computer scientist', period_basis:'intellectual_activity', notes:null },
  { person_name:'Alan Turing', politic_name:'United Kingdom', activity_start:1936, activity_end:1954, role:'Mathematician', period_basis:'intellectual_activity', notes:null }
];

const exactAda = { id:1, ...canonical[0] };
const updateGrace = { id:2, ...canonical[1], role:'Naval officer' };
const managedAbsent = { id:3, ...canonical[0], politic_name:'France' };
const duplicateAda = { id:4, ...canonical[0] };
const unmanaged = { id:5, person_name:'Unmanaged Person', politic_name:'Nowhere', activity_start:1900, activity_end:1901, role:null, period_basis:'general_activity', notes:null };
const obsolete = { id:6, person_name:'Old Person', politic_name:'Old Polity', activity_start:1, activity_end:2, role:null, period_basis:'general_activity', notes:null };
const obsoleteKey = activityKey(normalizeRecord(obsolete));

const fixture = {
  existingRows: [exactAda, updateGrace, managedAbsent, duplicateAda, unmanaged, obsolete],
  canonicalRows: canonical,
  excludedNames: [],
  obsoleteKeys: [obsoleteKey],
  snapshotId: 'phase8b-parity-fixture'
};

test('planner matches legacy reconciliation decisions on all valid branches', () => {
  const legacy = legacyModel(fixture);
  const planner = planReconciliation(fixture);
  const simple = simplifyPlanner(planner);

  assert.deepEqual(simple.inserts, legacy.inserts);
  assert.deepEqual(simple.updates, legacy.updates);
  assert.deepEqual(simple.deletes, legacy.deletes);
  assert.deepEqual(simple.duplicates, legacy.duplicates);
  assert.equal(simple.unchangedCount, legacy.unchanged.length);
  assert.equal(planner.commit, false);
  assert.equal(planner.database_writes, 0);
});

test('planner safety divergence for invalid rows is explicit and non-mutating', () => {
  const invalid = { id:99, person_name:'Broken', politic_name:'X', activity_start:10, activity_end:1, role:null, period_basis:'general_activity', notes:null };
  const report = planReconciliation({ existingRows:[invalid], canonicalRows:[] });
  assert.equal(report.validation_failures.length, 1);
  assert.equal(report.validation_failures[0].reason_code, 'UNRESOLVED_IDENTITY');
  assert.equal(report.proposed_deletes.length, 0);
  assert.equal(report.proposed_duplicate_removals.length, 0);
  assert.equal(report.database_writes, 0);
});
