export const PHFP_STANDARD = 'ATLAS-PHFP-4.0';
export const PHFP_DOMAINS = Object.freeze(['governance','military','knowledge','technology','commerce','culture','religion','exploration']);
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
  const expected = [...PHFP_DOMAINS].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expected)) throw new TypeError('D must contain exactly the canonical 8 domains');
  return Object.fromEntries(PHFP_DOMAINS.map((d) => [d, state(value[d], 'D.' + d)]));
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

export function collectPersonFactProfileUnresolved(input) {
  const p = normalizePersonFactProfile(input);
  const out = [];
  for (const group of GROUPS) p[group].forEach((v, i) => { if (v === '?') out.push(group + (i + 1)); });
  for (const d of PHFP_DOMAINS) if (p.D[d] === '?') out.push('D.' + d);
  for (const claim of p.G.unresolved) out.push('G:' + claim);
  return out;
}

function groupLine(group, values) {
  return group + ' ' + values.map((v, i) => group + (i + 1) + '=' + v).join(' ');
}

export function formatPersonFactProfile(input) {
  const p = normalizePersonFactProfile(input);
  const unresolved = collectPersonFactProfileUnresolved(p);
  return [
    groupLine('E', p.E),
    groupLine('R', p.R),
    groupLine('T', p.T),
    'D ' + PHFP_DOMAINS.map((d) => d + '=' + p.D[d]).join(' '),
    'G_ORIGIN ' + JSON.stringify(p.G.originSet),
    'G_EXTERNAL ' + JSON.stringify(p.G.externalReceptionSet),
    'G_UNRESOLVED ' + JSON.stringify(p.G.unresolved),
    groupLine('S', p.S),
    'UNRESOLVED ' + JSON.stringify(unresolved),
    'STATUS ' + (unresolved.length ? 'HOLD' : 'COMPLETE'),
  ].join('\n');
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
  if (tokens.shift() !== 'D' || tokens.length !== PHFP_DOMAINS.length) throw new Error('D line has invalid shape');
  const out = {};
  PHFP_DOMAINS.forEach((d, i) => {
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

export function validatePersonFactProfileOutput(text) {
  if (typeof text !== 'string') return { ok: false, error: 'output must be a string' };
  if (text.includes('VERIFIED_TOTAL') || text.includes('/36')) return { ok: false, error: 'aggregate scalar output is forbidden in PHFP v4.0' };
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i += 1;
  if (lines[i] && lines[i].trim().startsWith('```')) i += 1;
  try {
    const E = parseGroup(lines[i++], 'E');
    const R = parseGroup(lines[i++], 'R');
    const T = parseGroup(lines[i++], 'T');
    const D = parseDomains(lines[i++]);
    const originSet = parseJsonLine(lines[i++], 'G_ORIGIN');
    const externalReceptionSet = parseJsonLine(lines[i++], 'G_EXTERNAL');
    const gUnresolved = parseJsonLine(lines[i++], 'G_UNRESOLVED');
    const S = parseGroup(lines[i++], 'S');
    const shownUnresolved = parseJsonLine(lines[i++], 'UNRESOLVED');
    const statusLine = String(lines[i++] || '');
    if (!statusLine.startsWith('STATUS ')) throw new Error('STATUS is missing or misplaced');
    const shownStatus = statusLine.slice(7);
    if (!['COMPLETE','HOLD'].includes(shownStatus)) throw new Error('STATUS must be COMPLETE or HOLD');
    const profile = normalizePersonFactProfile({ E, R, T, D, G: { originSet, externalReceptionSet, unresolved: gUnresolved }, S });
    const unresolved = collectPersonFactProfileUnresolved(profile);
    if (JSON.stringify(shownUnresolved) !== JSON.stringify(unresolved)) throw new Error('UNRESOLVED does not match profile state');
    const status = unresolved.length ? 'HOLD' : 'COMPLETE';
    if (shownStatus !== status) throw new Error('STATUS does not match profile state');
    return { ok: true, standard: PHFP_STANDARD, profile, unresolved, status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function assertPersonFactProfileOutput(text) {
  const result = validatePersonFactProfileOutput(text);
  if (!result.ok) throw new Error('Invalid PHFP output: ' + result.error);
  return result;
}
