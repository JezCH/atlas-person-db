#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const argv = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const root = path.resolve(getArg('--root', '.'));
const output = path.resolve(getArg('--output', path.join(root, 'migration/phase-3/reports')));
const schemaDir = path.join(root, 'migration/phase-3/schema');
const branch = getArg('--branch', process.env.GITHUB_REF_NAME || 'agent/phase3-target-schema');
const commit = getArg('--commit', process.env.GITHUB_SHA || 'unknown');

const files = fs.readdirSync(schemaDir).filter(f => /^\d{3}_.+\.sql$/.test(f)).sort();
if (files.length === 0) throw new Error('No schema fragments found');
const chunks = files.map(file => `-- BEGIN ${file}\n${fs.readFileSync(path.join(schemaDir, file), 'utf8').trimEnd()}\n-- END ${file}\n`);
const bundle = `-- ATLAS Phase 3 target schema\n-- Definition only; do not deploy in Phase 3.\n\n${chunks.join('\n')}`;
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'phase-3-schema.sql'), bundle, 'utf8');
const digest = crypto.createHash('sha256').update(bundle).digest('hex');
const summary = {
  metadata: {
    repository: 'JezCH/atlas-person-db',
    branch,
    audited_commit_sha: commit,
    phase2_baseline_sha: 'ce4b1b714f3c9ebc2da2bb7e56d76479a33e4580',
    generator_version: 1
  },
  fragment_count: files.length,
  fragments: files,
  bytes: Buffer.byteLength(bundle),
  sha256: digest
};
fs.writeFileSync(path.join(output, 'phase-3-bundle-report.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ status: 'PASS', ...summary }, null, 2));
