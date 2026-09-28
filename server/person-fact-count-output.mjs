export const PHFC_STANDARD = 'ATLAS-PHFC-4.2';
export const PHFC_DOMAINS = Object.freeze(['governance','military','knowledge','technology','commerce','culture','religion','exploration']);
export const PHFC_G_MODES = Object.freeze(['institutional_adoption','formal_teaching','documented_imitation','operative_application','movement_reception','documented_circulation']);
const VALID = new Set(['1','0','?']);

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(label + ' must be an object');
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new TypeError(label + ' must contain exactly: ' + expected.join(', '));
}

function state(value, label) {
  const v = String(value);
  if (!VALID.has(v)) throw new TypeError(label + ' must be 1, 0, or ?');
  return v;
}

function fixed(value, group) {
  if (!Array.isArray(value) || value.length !== 6) throw new TypeError(group + ' must contain exactly 6 states');
  return value.map((v, i) => state(v, group + (i + 1)));
}

function strings(value, label) {
  if (!Array.isArray(value)) throw new TypeError(label + ' must be an array');
  const out = value.map((v) => {
    if (typeof v !== 'string' || !v.trim()) throw new TypeError(label + ' entries must be non-empty strings');
    return v.trim();
  });
  if (new Set(out).size !== out.length) throw new TypeError(label + ' must not contain duplicates');
  return out;
}

function domains(value) {
  exactObject(value, PHFC_DOMAINS, 'D');
  return Object.fromEntries(PHFC_DOMAINS.map((d) => [d, state(value[d], 'D.' + d)]));
}

function geography(value) {
  exactObject(value, ['originSet','modes'], 'G');
  exactObject(value.modes, PHFC_G_MODES, 'G.modes');
  const originSet = strings(value.originSet, 'G.originSet');
  const origin = new Set(originSet.map((v) => v.toLowerCase()));
  const modes = {};
  PHFC_G_MODES.forEach((mode, i) => {
    const id = 'G' + (i + 1);
    const entry = value.modes[mode];
    exactObject(entry, ['state','units'], 'G.modes.' + mode);
    const s = state(entry.state, id);
    const units = strings(entry.units, id + '.units');
    if (s === '1' && units.length === 0) throw new TypeError(id + ' VERIFIED requires at least one external unit');
    if (s !== '1' && units.length !== 0) throw new TypeError(id + ' non-VERIFIED state must not store verified units');
    for (const unit of units) if (origin.has(unit.toLowerCase())) throw new TypeError(id + ' external unit overlaps ORIGIN_SET: ' + unit);
    modes[mode] = { state: s, units };
  });
  return { originSet, modes };
}

function cellStates(p) {
  const out = [];
  for (const group of ['E','R','T']) p[group].forEach((v, i) => out.push([group + (i + 1), v]));
  PHFC_DOMAINS.forEach((d) => out.push(['D.' + d, p.D[d]]));
  PHFC_G_MODES.forEach((mode, i) => out.push(['G' + (i + 1), p.G.modes[mode].state]));
  p.S.forEach((v, i) => out.push(['S' + (i + 1), v]));
  return out;
}

function closure(value, p) {
  const shown = strings(value, 'zeroReviewClosed');
  const expected = cellStates(p).filter(([,v]) => v === '0').map(([id]) => id);
  const valid = new Set(cellStates(p).map(([id]) => id));
  for (const id of shown) if (!valid.has(id)) throw new TypeError('zeroReviewClosed contains unknown cell: ' + id);
  if (JSON.stringify([...shown].sort()) !== JSON.stringify([...expected].sort())) throw new TypeError('zeroReviewClosed must exactly match every 0-state cell');
  return expected;
}

export function normalizePersonFactProfile(input) {
  exactObject(input, ['E','R','T','D','G','S','zeroReviewClosed'], 'profile input');
  const p = {
    E: fixed(input.E, 'E'),
    R: fixed(input.R, 'R'),
    T: fixed(input.T, 'T'),
    D: domains(input.D),
    G: geography(input.G),
    S: fixed(input.S, 'S'),
  };
  return { ...p, zeroReviewClosed: closure(input.zeroReviewClosed, p) };
}

export function collectPersonFactUnresolved(input) {
  const p = normalizePersonFactProfile(input);
  return cellStates(p).filter(([,v]) => v === '?').map(([id]) => id);
}

function ones(values) { return values.filter((v) => v === '1').length; }

export function derivePersonFactCounts(input) {
  const p = normalizePersonFactProfile(input);
  const counts = {
    E: ones(p.E),
    R: ones(p.R),
    T: ones(p.T),
    D: Math.min(PHFC_DOMAINS.filter((d) => p.D[d] === '1').length, 6),
    G: PHFC_G_MODES.filter((mode) => p.G.modes[mode].state === '1').length,
    S: ones(p.S),
  };
  const verifiedCount = counts.E + counts.R + counts.T + counts.D + counts.G + counts.S;
  const unresolved = cellStates(p).filter(([,v]) => v === '?').map(([id]) => id);
  return { profile: p, counts, verifiedCount, unresolved, status: unresolved.length ? 'HOLD' : 'COMPLETE' };
}

function groupLine(group, values) { return group + ' ' + values.map((v,i) => group + (i + 1) + '=' + v).join(' '); }
function gLine(g) { return 'G ' + PHFC_G_MODES.map((m,i) => 'G' + (i + 1) + '=' + g.modes[m].state).join(' '); }
function gUnits(g) { return Object.fromEntries(PHFC_G_MODES.map((m,i) => ['G' + (i + 1), g.modes[m].units])); }

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
    gLine(p.G),
    'G_ORIGIN ' + JSON.stringify(p.G.originSet),
    'G_UNITS ' + JSON.stringify(gUnits(p.G)),
    groupLine('S', p.S),
    'ZERO_REVIEW_CLOSED ' + JSON.stringify(p.zeroReviewClosed),
  ].join('\n');
}

function parseCount(line, label, max) {
  const match = String(line || '').match(new RegExp('^' + label + ' ([0-9]+)\\/' + max + '$'));
  if (!match) throw new Error(label + ' is missing or misplaced');
  const n = Number(match[1]);
  if (!Number.isInteger(n) || n < 0 || n > max) throw new Error(label + ' is out of range');
  return n;
}

function parseGroup(line, group) {
  const tokens = String(line || '').trim().split(/\s+/);
  if (tokens.shift() !== group || tokens.length !== 6) throw new Error(group + ' line has invalid shape');
  return tokens.map((token, i) => {
    const prefix = group + (i + 1) + '=';
    if (!token.startsWith(prefix)) throw new Error(group + (i + 1) + ' is missing or reordered');
    return state(token.slice(prefix.length), group + (i + 1));
  });
}

function parseDomains(line) {
  const tokens = String(line || '').trim().split(/\s+/);
  if (tokens.shift() !== 'D' || tokens.length !== PHFC_DOMAINS.length) throw new Error('D line has invalid shape');
  const out = {};
  PHFC_DOMAINS.forEach((d, i) => {
    const prefix = d + '=';
    if (!tokens[i].startsWith(prefix)) throw new Error('D.' + d + ' is missing or reordered');
    out[d] = state(tokens[i].slice(prefix.length), 'D.' + d);
  });
  return out;
}

function jsonArrayLine(line, prefix) {
  if (!String(line || '').startsWith(prefix + ' ')) throw new Error(prefix + ' is missing or misplaced');
  return strings(JSON.parse(line.slice(prefix.length + 1)), prefix);
}

function jsonObjectLine(line, prefix) {
  if (!String(line || '').startsWith(prefix + ' ')) throw new Error(prefix + ' is missing or misplaced');
  const out = JSON.parse(line.slice(prefix.length + 1));
  if (!out || typeof out !== 'object' || Array.isArray(out)) throw new Error(prefix + ' must be a JSON object');
  return out;
}

function parseG(stateLine, originLine, unitsLine) {
  const states = parseGroup(stateLine, 'G');
  const originSet = jsonArrayLine(originLine, 'G_ORIGIN');
  const units = jsonObjectLine(unitsLine, 'G_UNITS');
  const keys = PHFC_G_MODES.map((_,i) => 'G' + (i + 1));
  exactObject(units, keys, 'G_UNITS');
  const modes = {};
  PHFC_G_MODES.forEach((mode, i) => { modes[mode] = { state: states[i], units: strings(units['G' + (i + 1)], 'G' + (i + 1) + '.units') }; });
  return { originSet, modes };
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
    const u = String(lines[i++] || '').match(/^UNRESOLVED ([0-9]+)$/);
    if (!u) throw new Error('UNRESOLVED is missing or misplaced');
    const status = String(lines[i++] || '').match(/^STATUS (COMPLETE|HOLD)$/);
    if (!status) throw new Error('STATUS is missing or misplaced');
    const E = parseGroup(lines[i++], 'E');
    const R = parseGroup(lines[i++], 'R');
    const T = parseGroup(lines[i++], 'T');
    const D = parseDomains(lines[i++]);
    const G = parseG(lines[i++], lines[i++], lines[i++]);
    const S = parseGroup(lines[i++], 'S');
    const zeroReviewClosed = jsonArrayLine(lines[i++], 'ZERO_REVIEW_CLOSED');
    const d = derivePersonFactCounts({ E, R, T, D, G, S, zeroReviewClosed });
    for (const group of ['E','R','T','D','G','S']) if (shown[group] !== d.counts[group]) throw new Error(group + '_COUNT does not match raw profile');
    if (verifiedCount !== d.verifiedCount) throw new Error('VERIFIED_COUNT arithmetic mismatch');
    if (Number(u[1]) !== d.unresolved.length) throw new Error('UNRESOLVED does not match raw profile');
    if (status[1] !== d.status) throw new Error('STATUS does not match raw profile');
    return { ok: true, standard: PHFC_STANDARD, ...d };
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
