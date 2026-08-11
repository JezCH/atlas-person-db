import fs from 'node:fs';
import path from 'node:path';
import {
  stage2DomainContract,
  temporalGranularities,
  temporalCertainties,
  temporalCalendars
} from './stage2-domain-contract.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const ledgerPath = arg('--ledger');
const outPath = arg('--out', 'artifacts/temporal-contract-audit.json');
const summaryPath = arg('--summary', 'artifacts/temporal-contract-audit-summary.json');
if (!ledgerPath) throw new Error('--ledger is required');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
if (ledger.schema !== 'atlas-polity-semantic-master-ledger/v1') throw new Error(`unexpected ledger schema: ${ledger.schema}`);
if (!Array.isArray(ledger.rows) || ledger.rows.length !== 346) throw new Error(`unexpected ledger baseline: ${ledger.rows?.length}`);
const byId = new Map(ledger.rows.map((r) => [r.activity_id, r]));
if (byId.size !== 346) throw new Error(`duplicate Activity UUIDs: ${byId.size}`);

const oldSubYear = ledger.rows.filter((r) => r.audit?.dependencies?.includes('sub_year_precision'));
if (oldSubYear.length !== 1) throw new Error(`sub-year planning baseline drift: ${oldSubYear.length}`);

const YOSHIDA_ID = '0c084a88-58be-52e8-81bb-b73bf0a11bb1';
const row = byId.get(YOSHIDA_ID);
if (!row) throw new Error('Yoshida Activity missing');
if (oldSubYear[0].activity_id !== YOSHIDA_ID) throw new Error(`unexpected sub-year target: ${oldSubYear[0].activity_id}`);
if (row.person?.canonical !== 'Shigeru Yoshida' || row.polity?.canonical !== 'Japan' || row.activity?.role !== 'Prime Minister') {
  throw new Error(`Yoshida semantic target drift: ${JSON.stringify({ person: row.person?.canonical, polity: row.polity?.canonical, role: row.activity?.role })}`);
}
if (row.activity?.start_year !== 1946 || row.activity?.end_year !== 1954) {
  throw new Error(`Yoshida chronology baseline drift: ${row.activity?.start_year}-${row.activity?.end_year}`);
}

for (const required of ['day']) if (!temporalGranularities.includes(required)) throw new Error(`temporal contract missing granularity ${required}`);
for (const required of ['exact']) if (!temporalCertainties.includes(required)) throw new Error(`temporal contract missing certainty ${required}`);
for (const required of ['gregorian']) if (!temporalCalendars.includes(required)) throw new Error(`temporal contract missing calendar ${required}`);

const boundary = (year, month, day) => ({
  year,
  month,
  day,
  granularity: 'day',
  certainty: 'exact',
  calendar: 'gregorian'
});

const proposedIntervals = [
  {
    start: boundary(1946, 5, 22),
    end: boundary(1947, 5, 24)
  },
  {
    start: boundary(1948, 10, 15),
    end: boundary(1954, 12, 10)
  }
];

function historicalOrdinalPart(b) {
  if (!Number.isInteger(b.year) || b.year === 0) throw new Error(`invalid historical year: ${b.year}`);
  if (!Number.isInteger(b.month) || b.month < 1 || b.month > 12) throw new Error(`invalid month: ${b.month}`);
  if (!Number.isInteger(b.day) || b.day < 1 || b.day > 31) throw new Error(`invalid day: ${b.day}`);
  return [b.year, b.month, b.day];
}

function compare(a, b) {
  const aa = historicalOrdinalPart(a);
  const bb = historicalOrdinalPart(b);
  for (let i = 0; i < aa.length; i += 1) {
    if (aa[i] < bb[i]) return -1;
    if (aa[i] > bb[i]) return 1;
  }
  return 0;
}

for (const interval of proposedIntervals) {
  if (compare(interval.start, interval.end) > 0) throw new Error('reversed reviewed interval');
}
if (compare(proposedIntervals[0].end, proposedIntervals[1].start) >= 0) throw new Error('reviewed Yoshida intervals unexpectedly overlap');

const summary = {
  schema: 'atlas-temporal-contract-audit-summary/v1',
  baseline_relationships: ledger.rows.length,
  explicit_sub_year_blockers: oldSubYear.length,
  acceptance_activity_id: YOSHIDA_ID,
  reviewed_split_intervals: proposedIntervals.length,
  historical_year_zero_allowed: stage2DomainContract.temporal.historical_year_zero_allowed,
  canonical_timestamp_model: false,
  existing_rows_backfill_granularity: 'year',
  conclusion: 'SHARED_TEMPORAL_BOUNDARY_CONTRACT_REQUIRED_BEFORE_YOSHIDA_CORRECTION'
};

if (summary.historical_year_zero_allowed !== false) throw new Error('Stage 2 temporal contract must continue to reject historical year zero');

const payload = {
  schema: 'atlas-temporal-contract-audit/v1',
  status: 'AUDIT_ONLY_NO_PRODUCTION_MUTATION',
  contract: {
    historical_year: 'SIGNED_NONZERO_INTEGER',
    boundary_fields: ['year', 'month', 'day', 'granularity', 'certainty', 'calendar'],
    granularities: temporalGranularities,
    certainties: temporalCertainties,
    calendars: temporalCalendars,
    interval_semantics: stage2DomainContract.temporal.interval_semantics,
    shared_column_contract: true,
    global_temporal_intervals_table: false,
    js_date_as_canonical_history: false
  },
  summary,
  acceptance_case: {
    current: {
      activity_id: row.activity_id,
      person: row.person.canonical,
      polity: row.polity.canonical,
      role: row.activity.role,
      start_year: row.activity.start_year,
      end_year: row.activity.end_year
    },
    reviewed_target: proposedIntervals
  }
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
