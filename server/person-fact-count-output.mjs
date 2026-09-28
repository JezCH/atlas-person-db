export const PHFC_STANDARD = 'ATLAS-PHFC-4.1';
export const PHFC_DOMAINS = Object.freeze(['governance','military','knowledge','technology','commerce','culture','religion','exploration']);
const GROUPS = Object.freeze(['E','R','T','S']);
const VALID = new Set(['1','0','?']);

function state(value, label) {
  const v = String(value);
  if (!VALID.has(v)) throw new TypeError(label + ' must be 1, 0, or ?');
  return v;
}

function fixed(value, group) {
  if (!Array.isArray(value) || value.length !== 6) throw new TypeError(group + ' must contain exactly 6 states');
  return value.map((v, i) => state(v, group + (i + 1)));
}

function domains(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('D must be an object');
  const keys = Object.keys(value).sort();
  const expected = [...PHFC_DOMAINS].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) throw new TypeError('D must contain exactly the canonical 8 domains');
  return Object.fromEntries(PHFC_DOMAINS.map((d) => [d, state(value[d], 'D.' + d)]));
}

function strings(value, label) {
  if (!Array.isArray(value)) throw new TypeError(label + ' must be an array');
  return [...new Set(value.map((v) => {
    if (typeof v !== 'string' || !v.trim()) throw new TypeError(label + ' entries must be non-empty strings');
    return v.trim();
  }))];
}

function geography(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('G must be an object');
  const originSet = strings(value.originSet || [], 'G.originSet');
  const externalReceptionSet = strings(value.externalReceptionSet || [], 'G.externalReceptionSet');
  const unresolved = strings(value.unresolved || [], 'G.unresolved');
  const origin = new Set(originSet.map((v) => v.toLowerCase()));
  for (const unit of externalReceptionSet) {
    if (origin.has(unit.toLowerCase())) throw new TypeError('G external unit overlaps ORIGIN_SET: ' + unit);
  }
  return { originSet, externalReceptionSet, unresolved };
}

export function normalizePersonFactProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('profile input must be an object');
  return {
    E: fixed(input.E, 'E'),
    R: fixed(input.R, 'R'),
    T: fixed(input.T, 'T'),
    D: domains(input.D),
    G: geography(input.G),
    S: fixed(input.S, 'S'),
  };
}

export function collectPersonFactUnresolved(input) {
  const p = normalizePersonFactProfile(input);
  const out = [];
  for (const group of GROUPS) p[group].forEach((v, i) => { if (v === '?') out.push(group + (i + 1)); });
  for (const d of PHFC_DOMAINS) if (p.D[d] === '?') out.push('D.' + d);
  for (const claim of p.G.unresolved) out.push('G:' + claim);
  return out;
}

function ones(values) {
  return values.filter((v) => v === '1').length;
}

export function derivePersonFactCounts(input) {
  const p = normalizePersonFactProfile(input);
  const counts = {
    E: ones(p.E),
    R: ones(p.R),
    T: ones(p.T),
    D: Math.min(PHFC_DOMAINS.filter((d) => p.D[d] === '1').length, 6),
    G: Math.min(p.G.externalReceptionSet.length, 6),
    S: ones(p.S),
  };
  const verifiedCount = counts.E + counts.R + counts.T + counts.D + counts.G + counts.S;
  const unresolved = collectPersonFactUnresolved(p);
  return { profile: p, counts, verifiedCount, unresolved, status: unresolved.length ? 'HOLD' : 'COMPLETE' };
}

function groupLine(group, values) {
  return group + ' ' + values.map((v, i) => group + (i + 1) + '=' + v).join(' ');
}

export function formatPersonFactCountResult(input) {
  const r = derivePersonFactCounts(input);
  const p = r.profile;
  return [
    'E_COUNT ' + r.counts.E + '/6',
    'R_COUNT ' + r.counts.R + '/6',
    'T_COUNT ' + r.counts.T + '/6',
    'D_COUNT ' + r.counts.D + '/6',
    'G_COUNT ' + r.counts.G + '/6',
    'S_COUNT ' + r.counts.S + '/6',
    'VERIFIED_COUNT ' + r.verifiedCount + '/36',
    'UNRESOLVED ' + r.unresolved.length,
    'STATUS ' + r.status,
    groupLine('E', p.E),
    groupLine('R', p.R),
    groupLine('T', p.T),
    'D ' + PHFC_DOMAINS.map((d) => d + '=' + p.D[d]).join(' '),
    'G_ORIGIN ' + JSON.stringify(p.G.originSet),
    'G_EXTERNAL ' + JSON.stringify(p.G.externalReceptionSet),
    'G_UNRESOLVED ' + JSON.stringify(p.G.unresolved),
    groupLine('S', p.S),
  ].join('\n');
}

function parseCount(line, label, max) {
  const match = String(line || '').match(new RegExp('^' + label + ' ([0-9]+)\\/' + max + '$'));
  if (!match) throw new Error(label + ' is missing or misplaced');
  const value = Number(match[1]);
  if (!Number.isInteger(value) || value < 0 || value > max) throw new Error(label + ' is out of range');
  return value;
}

function parseGroup(line, group) {
  const tokens = String(line || '').trim().split(/\s+/);
  if (tokens.shift() !== group || tokens.length !== 6) throw new Error(group + ' line has invalid shape');
  return tokens.map((token, i) => {
    const expected = group + (i + 1) + '=';
    if (!token.startsWith(expected)) throw new Error(group + (i + 1) + ' is missing or reordered');
    return state(token.slice(expected.length), group + (i + 1));
  });
}

function parseDomains(line) {
  const tokens = String(line || '').trim().split(/\s+/);
  if (tokens.shift() !== 'D' || tokens.length !== PHFC_DOMAINS.length) throw new Error('D line has invalid shape');
  const out = {};
  PHFC_DOMAINS.forEach((d, i) => {
    const expected = d + '=';
    if (!tokens[i].startsWith(expected)) throw new Error('D.' + d + ' is missing or reordered');
    out[d] = state(tokens[i].slice(expected.length), 'D.' + d);
  });
  return out;
}

function parseJsonLine(line, prefix) {
  if (!String(line || '').startsWith(prefix + ' ')) throw new Error(prefix + ' is missing or misplaced');
  const parsed = JSON.parse(line.slice(prefix.length + 1));
  return strings(parsed, prefix);
}

export function validatePersonFactCountOutput(text) {
  if (typeof text !== 'string') return { ok: false, error: 'output must be a string' };
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i += 1;
  if (lines[i] && lines[i].trim().startsWith('```')) i += 1;
  try {
    const shown = {
      E: parseCount(lines[i++], 'E_COUNT', 6),
      R: parseCount(lines[i++], 'R_COUNT', 6),
      T: parseCount(lines[i++], 'T_COUNT', 6),
      D: parseCount(lines[i++], 'D_COUNT', 6),
      G: parseCount(lines[i++], 'G_COUNT', 6),
      S: parseCount(lines[i++], 'S_COUNT', 6),
    };
    const verifiedCount = parseCount(lines[i++], 'VERIFIED_COUNT', 36);
    const unresolvedMatch = String(lines[i++] || '').match(/^UNRESOLVED ([0-9]+)$/);
    if (!unresolvedMatch) throw new Error('UNRESOLVED is missing or misplaced');
    const shownUnresolved = Number(unresolvedMatch[1]);
    const statusMatch = String(lines[i++] || '').match(/^STATUS (COMPLETE|HOLD)$/);
    if (!statusMatch) throw new Error('STATUS is missing or misplaced');

    const E = parseGroup(lines[i++], 'E');
    const R = parseGroup(lines[i++], 'R');
    const T = parseGroup(lines[i++], 'T');
    const D = parseDomains(lines[i++]);
    const originSet = parseJsonLine(lines[i++], 'G_ORIGIN');
    const externalReceptionSet = parseJsonLine(lines[i++], 'G_EXTERNAL');
    const gUnresolved = parseJsonLine(lines[i++], 'G_UNRESOLVED');
    const S = parseGroup(lines[i++], 'S');

    const derived = derivePersonFactCounts({ E, R, T, D, G: { originSet, externalReceptionSet, unresolved: gUnresolved }, S });
    for (const group of ['E','R','T','D','G','S']) {
      if (shown[group] !== derived.counts[group]) throw new Error(group + '_COUNT does not match raw profile');
    }
    if (verifiedCount !== derived.verifiedCount) throw new Error('VERIFIED_COUNT arithmetic mismatch');
    if (shownUnresolved !== derived.unresolved.length) throw new Error('UNRESOLVED does not match raw profile');
    if (statusMatch[1] !== derived.status) throw new Error('STATUS does not match raw profile');

    return { ok: true, standard: PHFC_STANDARD, ...derived };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function assertPersonFactCountOutput(text) {
  const result = validatePersonFactCountOutput(text);
  if (!result.ok) throw new Error('Invalid PHFC output: ' + result.error);
  return result;
}

export const formatPersonFactProfile = formatPersonFactCountResult;
export const validatePersonFactProfileOutput = validatePersonFactCountOutput;
export const assertPersonFactProfileOutput = assertPersonFactCountOutput;
