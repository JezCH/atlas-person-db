#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const baseline = process.argv[2] || 'ce4b1b714f3c9ebc2da2bb7e56d76479a33e4580';
const allowed = [
  /^migration\/phase-3\//,
  /^\.github\/workflows\/phase-3-schema\.yml$/,
  /^migration\/MIGRATION_PLAN\.md$/
];
const output = execFileSync('git', ['diff', '--name-only', `${baseline}...HEAD`], { encoding: 'utf8' });
const changed = output.split(/\r?\n/).filter(Boolean);
const violations = changed.filter(file => !allowed.some(re => re.test(file)));
const report = { status: violations.length === 0 ? 'PASS' : 'FAIL', baseline, changed, violations };
console.log(JSON.stringify(report, null, 2));
if (violations.length) process.exit(25);
