#!/usr/bin/env node
import fs from 'node:fs';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error('usage: node phase7c-db-preflight.mjs <db.json> <report.json>');
  process.exit(64);
}

const db = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(Number(db.legacy_rows) === 319, `legacy row count ${db.legacy_rows}`);
assert(Number(db.v2_rows) === 349, `v2 row count ${db.v2_rows}`);
assert(db.compat_select_anon === true, 'anon SELECT privilege missing');
assert(db.compat_select_authenticated === true, 'authenticated SELECT privilege missing');
for (const key of [
  'compat_insert_anon', 'compat_update_anon', 'compat_delete_anon',
  'compat_insert_authenticated', 'compat_update_authenticated', 'compat_delete_authenticated'
]) {
  assert(db[key] === false, `${key} must be false`);
}

const report = {
  marker: 'PHASE_7C_PREFLIGHT_DATABASE',
  counts: { legacy: Number(db.legacy_rows), v2: Number(db.v2_rows) },
  privileges: {
    anon_select: db.compat_select_anon,
    authenticated_select: db.compat_select_authenticated,
    anon_write_denied: !db.compat_insert_anon && !db.compat_update_anon && !db.compat_delete_anon,
    authenticated_write_denied: !db.compat_insert_authenticated && !db.compat_update_authenticated && !db.compat_delete_authenticated
  },
  failures,
  pass: failures.length === 0
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
