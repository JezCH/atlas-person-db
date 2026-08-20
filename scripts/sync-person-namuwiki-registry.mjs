import fs from 'node:fs';
import path from 'node:path';

const HUMAN_SCHEMA = 'atlas-human-authoring/v1';
const REGISTRY_SCHEMA = 'atlas-person-namuwiki-registry/v1';
const REQUEST_DIR = path.resolve('authoring/requests');
const REGISTRY_PATH = path.resolve('authoring/person-namuwiki-registry.json');

function fail(message) {
  throw new Error(message);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function canonicalNamuWikiUrl(value) {
  if (!nonEmptyString(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'namu.wiki') return null;
    if (!url.pathname.startsWith('/w/') || url.pathname.length <= 3) return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function normalizeNamuWiki(file, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail(`${file}: external_references.namuwiki must be an object`);
  const status = raw.status;
  if (status !== 'linked' && status !== 'not_found') fail(`${file}: external_references.namuwiki.status must be linked or not_found`);
  if (!validIsoDate(raw.checked_at)) fail(`${file}: external_references.namuwiki.checked_at must be a valid YYYY-MM-DD date`);

  if (status === 'linked') {
    if (!nonEmptyString(raw.document_title)) fail(`${file}: linked NamuWiki reference requires document_title`);
    const url = canonicalNamuWikiUrl(raw.url);
    if (!url) fail(`${file}: linked NamuWiki reference requires a canonical https://namu.wiki/w/... URL`);
    return Object.freeze({
      status,
      checked_at: raw.checked_at,
      document_title: raw.document_title.trim(),
      url
    });
  }

  if (raw.document_title != null || raw.url != null) fail(`${file}: not_found NamuWiki reference must not contain document_title or url`);
  return Object.freeze({ status, checked_at: raw.checked_at });
}

function sameDecision(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function collectRegistry() {
  const selected = new Map();
  const files = fs.readdirSync(REQUEST_DIR)
    .filter((name) => /^[A-Za-z0-9._-]+\.json$/.test(name))
    .sort();

  for (const name of files) {
    const file = path.join(REQUEST_DIR, name);
    let manifest;
    try { manifest = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (error) { fail(`${file}: invalid JSON: ${error.message}`); }
    if (manifest?.schema !== HUMAN_SCHEMA) continue;
    const rawReference = manifest?.external_references?.namuwiki;
    if (rawReference == null) continue; // legacy pre-cutover request
    const canonicalName = manifest?.person?.canonical_name_en;
    if (!nonEmptyString(canonicalName)) fail(`${file}: person.canonical_name_en is required for NamuWiki registry generation`);
    const normalized = normalizeNamuWiki(file, rawReference);
    const key = canonicalName.trim();
    const previous = selected.get(key);
    if (!previous || normalized.checked_at > previous.reference.checked_at) {
      selected.set(key, { reference: normalized, file });
      continue;
    }
    if (normalized.checked_at === previous.reference.checked_at && !sameDecision(normalized, previous.reference)) {
      fail(`${file}: conflicts with ${previous.file} for ${key} on checked_at ${normalized.checked_at}`);
    }
  }

  const persons = {};
  for (const key of [...selected.keys()].sort((a, b) => a.localeCompare(b, 'en'))) {
    persons[key] = selected.get(key).reference;
  }
  return {
    schema: REGISTRY_SCHEMA,
    generated_from: 'authoring/requests/*.json',
    persons
  };
}

function renderedRegistry() {
  return `${JSON.stringify(collectRegistry(), null, 2)}\n`;
}

const mode = process.argv[2] || '--check';
if (mode !== '--check' && mode !== '--write') fail(`Unsupported mode ${mode}; use --check or --write`);
const rendered = renderedRegistry();

if (mode === '--write') {
  fs.writeFileSync(REGISTRY_PATH, rendered);
  console.log(`Updated ${path.relative(process.cwd(), REGISTRY_PATH)} from reviewed human-authoring requests.`);
} else {
  if (!fs.existsSync(REGISTRY_PATH)) fail('authoring/person-namuwiki-registry.json is missing; run sync script with --write');
  const current = fs.readFileSync(REGISTRY_PATH, 'utf8');
  if (current !== rendered) {
    fail('NamuWiki registry is stale; run node scripts/sync-person-namuwiki-registry.mjs --write and commit the result');
  }
  const registry = JSON.parse(rendered);
  const values = Object.values(registry.persons);
  const linked = values.filter((item) => item.status === 'linked').length;
  const notFound = values.filter((item) => item.status === 'not_found').length;
  console.log(`NamuWiki registry verified: ${linked} linked, ${notFound} not_found.`);
}
