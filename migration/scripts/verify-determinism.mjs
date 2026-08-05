#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const a = path.resolve(process.argv[2] || 'migration/tmp/run-1');
const b = path.resolve(process.argv[3] || 'migration/tmp/run-2');
const files = ['phase-2-file-inventory.json','phase-2-anomalies.json','phase-2-baseline.json','phase-2-baseline.md'];
const digest = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for (const name of files) {
  const pa = path.join(a,name), pb = path.join(b,name);
  if (!fs.existsSync(pa) || !fs.existsSync(pb)) { console.error(`Missing deterministic output ${name}`); process.exit(13); }
  if (digest(pa) !== digest(pb)) { console.error(`Non-deterministic output: ${name}`); process.exit(13); }
}
console.log('DETERMINISM_PASS');
