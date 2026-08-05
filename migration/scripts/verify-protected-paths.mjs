#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const baseline = process.argv[2] || 'a8ed85b7cf8bf687450688eb7f2216c766112950';
let output = '';
try {
  output = execFileSync('git',['diff','--name-only',`${baseline}...HEAD`],{encoding:'utf8'});
} catch (error) {
  console.error(error.stderr || error.message);
  process.exit(15);
}
const changed = output.split(/\r?\n/).filter(Boolean);
const unauthorized = changed.filter(p => !(p.startsWith('migration/') || p === '.github/workflows/phase-2-audit.yml'));
if (unauthorized.length) {
  console.error(`Unauthorized paths:\n${unauthorized.join('\n')}`);
  process.exit(14);
}
console.log(`PROTECTED_PATHS_PASS ${changed.length}`);
