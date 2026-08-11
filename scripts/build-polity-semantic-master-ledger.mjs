import fs from 'node:fs';
import path from 'node:path';

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const snapshotPath = arg('--snapshot');
const outPath = arg('--out', 'artifacts/polity-semantic-master-ledger.json');
const summaryPath = arg('--summary', 'artifacts/polity-semantic-master-ledger-summary.json');
const auditDir = arg('--audit-dir', 'docs/audits');

if (!snapshotPath) throw new Error('missing --snapshot');

function cleanCell(s) {
  return String(s ?? '')
    .trim()
    .replace(/^`|`$/g, '')
    .replace(/\\\|/g, '|')
    .trim();
}

function splitMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return [];
  const body = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  const cells = [];
  let current = '';
  let inCode = false;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '`') {
      inCode = !inCode;
      current += ch;
      continue;
    }
    if (ch === '|' && !inCode && body[i - 1] !== '\\') {
      cells.push(cleanCell(current));
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(cleanCell(current));
  return cells;
}

function isSeparator(line) {
  if (!line?.trim().startsWith('|')) return false;
  const cells = splitMarkdownRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c.replace(/\s/g, '')));
}

function normalizeHeader(h) {
  return cleanCell(h).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function parseTables(text, file) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (!lines[i].trim().startsWith('|') || !isSeparator(lines[i + 1])) continue;
    const headers = splitMarkdownRow(lines[i]).map(normalizeHeader);
    let j = i + 2;
    while (j < lines.length && lines[j].trim().startsWith('|')) {
      const cells = splitMarkdownRow(lines[j]);
      if (cells.length === headers.length) {
        const values = Object.fromEntries(headers.map((h, idx) => [h, cells[idx]]));
        out.push({ file, line: j + 1, values, raw: lines[j] });
      }
      j += 1;
    }
    i = j - 1;
  }
  return out;
}

function firstField(values, names) {
  for (const n of names) {
    if (values[n] != null && String(values[n]).trim() !== '') return cleanCell(values[n]);
  }
  return null;
}

function parsePeriod(period) {
  if (!period) return [null, null];
  const s = cleanCell(period).replace(/[–—]/g, '-');
  const nums = s.match(/-?\d+/g)?.map(Number) ?? [];
  if (nums.length === 1) return [nums[0], nums[0]];
  if (nums.length >= 2) return [nums[0], nums[1]];
  return [null, null];
}

function semanticKey({ person, polity, start, end, role }) {
  return [person, polity, start, end, role].map((v) => String(v ?? '').trim().toLowerCase()).join('|');
}

function filePriority(file) {
  const base = path.basename(file);
  if (base.includes('STAGE2_R1_CORRECTION_DECISION_LEDGER')) return 100;
  if (base.includes('STAGE2_R0_NORMALIZED_INVENTORY_EVIDENCE')) return 95;
  if (base.includes('STAGE2_R0_RECONCILIATION_DECISIONS')) return 90;
  if (base.includes('WAVE14_CURRENT_HIGH_RISK')) return 85;
  if (base.includes('WAVE15')) return 80;
  if (base.includes('WAVE13_LIVE_RECONCILIATION')) return 75;
  if (base.includes('CURRENT_UUID_CARRY_FORWARD')) return 70;
  if (/WAVE(?:8|9|10|11|12)_/.test(base)) return 60;
  if (/WAVE(?:2|3|4|5|6|7)_/.test(base)) return 55;
  if (base === 'POLITY_SEMANTIC_AUDIT_2026-08-11.md') return 50;
  return 20;
}

function classifyDependencies(decision, relationHint, contextText = '') {
  const s = `${decision ?? ''} ${relationHint ?? ''} ${contextText}`.toUpperCase();
  const deps = new Set();
  if (/RELATION|SERVES|ACTIVE_IN|ACTIVE IN|OPPOSES|GOVERNS|CONTROLS_GOVERNMENT|CONTROLS GOVERNMENT/.test(s)) deps.add('relation_type');
  if (/REGIME|GOVERNMENT_LAYER|GOVERNANCE_CONTEXT|FIFTH REPUBLIC|GANDEN PHODRANG/.test(s)) deps.add('governance_context');
  if (/CONTINUITY|PARENT_CHILD|PARENT-CHILD|STATE_FORM|STATE FORM|TEMPORAL_LABEL|IDENTITY_RECONCILIATION|POLITY_ALIAS|POLITY_NAME/.test(s)) deps.add('polity_identity_model');
  if (/SPLIT|CHRONOLOGY|BACK_PROJECT|BACKPROJECT|BACK-PROJECT|BACK PROJECTION|UPDATE_ACTIVITY_END/.test(s)) deps.add('chronology_correction');
  if (/SUB_YEAR|SUBYEAR|SUB-YEAR|MONTH|DAY PRECISION/.test(s)) deps.add('sub_year_precision');
  if (/RESEARCH|REVIEW|DEFER|UNCERTAIN/.test(s)) deps.add('historical_research');
  if (/LAYERED_AUTHORITY|REGIONAL_AUTHORITY|OVERLORD|TRIBUTARY|DEPENDENT|CONSTITUENT/.test(s)) deps.add('polity_relation_model');
  return [...deps].sort();
}

function executionClass(decision, deps, relationHint = null) {
  const s = String(decision ?? '').toUpperCase();
  if (s === 'R0_TRUE_ACTIVITY_DUPLICATE_KEEP') return 'R0_KEEP_REPRESENTATIVE';
  if (s === 'R0_TRUE_ACTIVITY_DUPLICATE_DROP') return 'R0_COALESCE_DROP';
  if (s.startsWith('R1_READY_')) return 'R1_READY_AFTER_R0';
  if (s.startsWith('R1_BLOCKED_')) return 'R1_BLOCKED_SCHEMA';
  if (/OUT_OF_POLITY_MODEL/.test(s)) return 'DEFER_MODEL_EXTENSION';
  if (deps.includes('polity_identity_model')) return 'BLOCKED_POLITY_IDENTITY';
  if (deps.includes('polity_relation_model')) return 'BLOCKED_LAYERED_AUTHORITY';
  if (deps.includes('governance_context')) return 'BLOCKED_GOVERNANCE_CONTEXT';
  if (deps.includes('relation_type') && /KEEP/.test(s)) return 'KEEP_POLITY_RELATION_LAYER_PENDING';
  if (deps.includes('historical_research')) return 'DEFER_RESEARCH';
  if (deps.includes('chronology_correction')) return 'STAGE2_CHRONOLOGY_CORRECTION';
  if (/^KEEP(?:_POLITY)?$/.test(s) && ['rules', null, undefined, ''].includes(relationHint)) return 'NO_CHANGE_POLITY';
  if (/KEEP/.test(s)) return 'KEEP_POLITY_STAGE2_REVIEW';
  if (/RELINK/.test(s)) return 'STAGE2_RELINK';
  if (/SPLIT/.test(s)) return 'STAGE2_SPLIT';
  return 'STAGE2_REVIEW';
}

const auditFiles = fs.readdirSync(auditDir)
  .filter((n) => n.endsWith('.md'))
  .filter((n) => /POLITY_SEMANTIC_AUDIT|STAGE2_R0|STAGE2_R1/.test(n))
  .map((n) => path.join(auditDir, n));

const fileTexts = new Map(auditFiles.map((file) => [file, fs.readFileSync(file, 'utf8')]));
const tableRows = auditFiles.flatMap((file) => parseTables(fileTexts.get(file), file));

const directCandidatesByUuid = new Map();
const historicalByKey = new Map();
const carryRows = [];

function addCandidate(uuid, candidate) {
  const id = uuid.toLowerCase();
  if (!directCandidatesByUuid.has(id)) directCandidatesByUuid.set(id, []);
  directCandidatesByUuid.get(id).push(candidate);
}

for (const row of tableRows) {
  const v = row.values;
  const uuidField = firstField(v, ['current_activity_uuid', 'activity_uuid', 'current_uuid', 'uuid', 'id']);
  const person = firstField(v, ['person', 'current_person']);
  const polity = firstField(v, ['current_polity', 'polity', 'politic']);
  const role = firstField(v, ['role']);
  const period = firstField(v, ['period']);
  const [start, end] = parsePeriod(period);
  const decision = firstField(v, ['decision', 'verdict', 'status', 'classification']);
  const relationHint = firstField(v, ['relation_hint', 'relation']);
  const priorSource = firstField(v, ['prior_audit_source']);
  const contextText = Object.values(v).join(' | ');

  if (uuidField) {
    const uuids = uuidField.match(UUID_RE) ?? [];
    for (const uuid of uuids) {
      addCandidate(uuid, {
        kind: priorSource ? 'carry_forward' : 'table',
        file: row.file,
        line: row.line,
        decision,
        relation_hint: relationHint,
        prior_source: priorSource,
        person,
        polity,
        role,
        start,
        end,
        context_text: contextText,
        priority: filePriority(row.file),
      });
      if (priorSource) carryRows.push({ uuid: uuid.toLowerCase(), ...row, person, polity, role, start, end, priorSource });
    }
  }

  if (person && polity && decision) {
    const key = semanticKey({ person, polity, start, end, role });
    if (!historicalByKey.has(key)) historicalByKey.set(key, []);
    historicalByKey.get(key).push({
      file: row.file,
      line: row.line,
      decision,
      relation_hint: relationHint,
      context_text: contextText,
      priority: filePriority(row.file),
    });
  }
}

// Stage-2 R1 prose contains both retained and target rows in several sections.
// Therefore only UUIDs explicitly reviewed as correction targets receive the R1 override.
const r1TargetDecisions = new Map(Object.entries({
  '2a749964-c057-5671-bdaa-8388099b871d': 'R1_READY_REMOVE_BACKPROJECTED_ALTERNATIVE',
  '6bac2b6f-ebf0-5131-bbf2-7fa524bcfae8': 'R1_READY_UPDATE_ACTIVITY_END',
  'e4b374f5-ee25-5c12-80bf-5b7b1d2d149c': 'R1_READY_REMOVE_BACKPROJECTED_ALTERNATIVE',
  '4ac4c38c-6d8b-55ce-b999-b0639e67eb22': 'R1_BLOCKED_REGIME_LAYER',
  '7a89364b-dacf-5798-9a6d-dd312cbbee4d': 'R1_BLOCKED_RELATION_SEMANTICS',
  'e5337054-ff56-58fd-a105-ea6d71d4ef33': 'R1_BLOCKED_RELATION_AND_ROLE_SPLIT',
  '0c084a88-58be-52e8-81bb-b73bf0a11bb1': 'R1_BLOCKED_SUBYEAR_PRECISION',
  'b651ff3e-0df1-552a-9134-56ca95e9f3be': 'R1_DEFER_TARGET_POLITY',
  '7eefdc4d-8aec-5689-b4d8-6b1745240581': 'R1_DEFER_LAYERED_HAN_WEI_TARGET',
  'f64072c1-a665-5e09-9581-ab5d8cf766a9': 'R1_DEFER_PRE221_SHU_TARGET',
  'df6cc626-135e-5abc-ae54-6dc1f64ac2aa': 'R1_DEFER_PRE221_SHU_TARGET',
  'b16e2fb0-7515-5bd6-8aa0-0f921f55b63f': 'R1_DEFER_PRE221_SHU_TARGET',
}));

for (const [file, text] of fileTexts.entries()) {
  if (!/STAGE2_R1_CORRECTION_DECISION_LEDGER/.test(file)) continue;
  const lines = text.split(/\r?\n/);
  for (const [uuid, decision] of r1TargetDecisions) {
    const lineIndex = lines.findIndex((line) => line.toLowerCase().includes(uuid));
    if (lineIndex < 0) throw new Error(`R1 target UUID ${uuid} missing from ${file}`);
    const from = Math.max(0, lineIndex - 8);
    const to = Math.min(lines.length, lineIndex + 24);
    addCandidate(uuid, {
      kind: 'stage2_r1_target',
      file,
      line: lineIndex + 1,
      decision,
      relation_hint: null,
      prior_source: null,
      context_text: lines.slice(from, to).join('\n'),
      priority: filePriority(file),
    });
  }
}

// R0 normalized evidence explicitly chooses keep/drop representatives.
for (const row of tableRows.filter((r) => /STAGE2_R0_NORMALIZED_INVENTORY_EVIDENCE/.test(r.file))) {
  const keep = firstField(row.values, ['keep']);
  const drop = firstField(row.values, ['drop']);
  if (!keep || !drop) continue;
  const keepUuid = keep.match(UUID_RE)?.[0];
  const dropUuid = drop.match(UUID_RE)?.[0];
  if (keepUuid) addCandidate(keepUuid, {
    kind: 'r0_normalized', file: row.file, line: row.line,
    decision: 'R0_TRUE_ACTIVITY_DUPLICATE_KEEP', relation_hint: null,
    context_text: Object.values(row.values).join(' | '), priority: 95,
  });
  if (dropUuid) addCandidate(dropUuid, {
    kind: 'r0_normalized', file: row.file, line: row.line,
    decision: 'R0_TRUE_ACTIVITY_DUPLICATE_DROP', relation_hint: null,
    context_text: Object.values(row.values).join(' | '), priority: 95,
  });
}

// Resolve carry-forward rows to their prior audited semantic decision.
for (const c of carryRows) {
  const existing = directCandidatesByUuid.get(c.uuid) ?? [];
  const carry = existing.find((x) => x.kind === 'carry_forward' && x.line === c.line);
  if (!carry || carry.decision) continue;

  const priorMatch = c.priorSource.match(/([^`:\s]+\.md):(\d+)/);
  let inherited = null;
  if (priorMatch) {
    const priorFile = path.join(auditDir, priorMatch[1]);
    const targetLine = Number(priorMatch[2]);
    const rows = tableRows.filter((r) => r.file === priorFile && Math.abs(r.line - targetLine) <= 3);
    inherited = rows
      .map((r) => ({
        decision: firstField(r.values, ['decision', 'verdict', 'status', 'classification']),
        relation_hint: firstField(r.values, ['relation_hint', 'relation']),
        file: r.file, line: r.line,
        context_text: Object.values(r.values).join(' | '),
      }))
      .find((r) => r.decision);
  }

  if (!inherited && c.person && c.polity) {
    const key = semanticKey({ person: c.person, polity: c.polity, start: c.start, end: c.end, role: c.role });
    inherited = (historicalByKey.get(key) ?? []).sort((a, b) => b.priority - a.priority)[0] ?? null;
  }

  if (inherited) {
    carry.decision = inherited.decision;
    carry.relation_hint = inherited.relation_hint;
    carry.inherited_from = `${path.basename(inherited.file)}:${inherited.line}`;
    carry.context_text = `${carry.context_text} | inherited: ${inherited.context_text}`;
  }
}

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
if (snapshot?.ok !== true || snapshot?.source !== 'v2-direct' || !Array.isArray(snapshot?.data)) {
  throw new Error('snapshot must be GET /api/atlas-read payload with ok=true, source=v2-direct, data[]');
}
if (snapshot.data.length !== 346) {
  throw new Error(`expected frozen audit baseline 346 rows, got ${snapshot.data.length}; refresh/reconcile before regenerating ledger`);
}

const seen = new Set();
const ledgerRows = [];
const missing = [];

for (const current of snapshot.data) {
  const id = String(current.id).toLowerCase();
  if (seen.has(id)) throw new Error(`duplicate current Activity UUID in snapshot: ${id}`);
  seen.add(id);

  const candidates = (directCandidatesByUuid.get(id) ?? [])
    .filter((c) => c.decision)
    .sort((a, b) => b.priority - a.priority || a.file.localeCompare(b.file) || a.line - b.line);

  if (candidates.length === 0) {
    missing.push({ id, person: current.person_name, polity: current.politic_name });
    continue;
  }

  const primary = candidates[0];
  const distinctDecisionSources = [...new Map(candidates.map((c) => [`${c.decision}|${c.file}|${c.line}`, c])).values()];
  const deps = classifyDependencies(primary.decision, primary.relation_hint, primary.context_text);
  const cls = executionClass(primary.decision, deps, primary.relation_hint);

  ledgerRows.push({
    activity_id: id,
    person: {
      canonical: current.person_name,
      display_ko: current.person_display_name ?? null,
    },
    polity: {
      canonical: current.politic_name,
      display_ko: current.politic_display_name ?? null,
    },
    activity: {
      start_year: current.activity_start,
      end_year: current.activity_end,
      role: current.role ?? null,
      role_display_ko: current.role_display_name ?? null,
      period_basis: current.period_basis ?? null,
    },
    audit: {
      decision: primary.decision,
      relation_hint: primary.relation_hint ?? null,
      execution_class: cls,
      dependencies: deps,
      primary_source: `${path.basename(primary.file)}:${primary.line}`,
      inherited_from: primary.inherited_from ?? null,
      candidate_decisions: distinctDecisionSources.map((c) => ({
        decision: c.decision,
        relation_hint: c.relation_hint ?? null,
        source: `${path.basename(c.file)}:${c.line}`,
        kind: c.kind,
      })),
    },
  });
}

if (missing.length) {
  console.error(JSON.stringify({ missing }, null, 2));
  throw new Error(`master ledger has ${missing.length} current Activity UUID(s) without a resolvable decision`);
}
if (ledgerRows.length !== 346) throw new Error(`ledger row count mismatch: ${ledgerRows.length}`);

ledgerRows.sort((a, b) => a.activity.start_year - b.activity.start_year || a.activity.end_year - b.activity.end_year || a.person.canonical.localeCompare(b.person.canonical));

const countBy = (getter) => Object.fromEntries([...ledgerRows.reduce((m, r) => {
  const k = getter(r);
  m.set(k, (m.get(k) ?? 0) + 1);
  return m;
}, new Map()).entries()].sort((a, b) => a[0].localeCompare(b[0])));

const dependencyCounts = {};
for (const row of ledgerRows) for (const dep of row.audit.dependencies) dependencyCounts[dep] = (dependencyCounts[dep] ?? 0) + 1;

const summary = {
  schema: 'atlas-polity-semantic-master-ledger-summary/v1',
  baseline: {
    source: snapshot.source,
    relationship_count: snapshot.data.length,
    coverage_run: 31490306377,
    coverage_artifact_id: 9100736121,
    coverage_artifact_digest: 'sha256:ff921c1299af176c1d30cb7f5833b13896693af29e6cb7fc194e78ab888a0986',
  },
  ledger_rows: ledgerRows.length,
  unique_activity_ids: new Set(ledgerRows.map((r) => r.activity_id)).size,
  execution_class_counts: countBy((r) => r.audit.execution_class),
  primary_decision_counts: countBy((r) => r.audit.decision),
  dependency_counts: Object.fromEntries(Object.entries(dependencyCounts).sort((a, b) => a[0].localeCompare(b[0]))),
  r0_drop_count: ledgerRows.filter((r) => r.audit.execution_class === 'R0_COALESCE_DROP').length,
  r0_keep_count: ledgerRows.filter((r) => r.audit.execution_class === 'R0_KEEP_REPRESENTATIVE').length,
  r1_ready_count: ledgerRows.filter((r) => r.audit.execution_class === 'R1_READY_AFTER_R0').length,
};

if (summary.r0_drop_count !== 6 || summary.r0_keep_count !== 6) {
  throw new Error(`expected R0 exact duplicate keep/drop 6/6; got ${summary.r0_keep_count}/${summary.r0_drop_count}`);
}
if (summary.r1_ready_count !== 3) {
  throw new Error(`expected exactly 3 reviewed R1-ready targets; got ${summary.r1_ready_count}`);
}

const master = {
  schema: 'atlas-polity-semantic-master-ledger/v1',
  status: 'AUDIT_ONLY_NO_PRODUCTION_MUTATION',
  baseline: summary.baseline,
  generated_from: {
    audit_directory: auditDir,
    audit_markdown_files: auditFiles.map((f) => path.basename(f)).sort(),
    generator: 'scripts/build-polity-semantic-master-ledger.mjs',
  },
  summary,
  rows: ledgerRows,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(master, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`ATLAS_MASTER_LEDGER_OK rows=${ledgerRows.length} r0_keep=${summary.r0_keep_count} r0_drop=${summary.r0_drop_count} r1_ready=${summary.r1_ready_count}`);
console.log(JSON.stringify(summary, null, 2));
