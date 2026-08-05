#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const root = path.resolve(getArg('--root', '.'));
const output = path.resolve(getArg('--output', path.join(root, 'migration/phase-3/reports')));
const schema = fs.readFileSync(path.join(output, 'phase-3-schema.sql'), 'utf8');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'migration/phase-3/contracts/prohibited-operations.json'), 'utf8'));
const violations = [];
for (const source of ['migration/phase-3/schema', 'migration/phase-3/scripts', '.github/workflows/phase-3-schema.yml']) {
  const full = path.join(root, source);
  const entries = fs.existsSync(full)
    ? (fs.statSync(full).isDirectory() ? fs.readdirSync(full).map(name => path.join(full, name)) : [full])
    : [];
  for (const file of entries.filter(f => fs.statSync(f).isFile())) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of contract.forbidden_patterns) {
      const re = new RegExp(pattern, 'i');
      if (re.test(text)) violations.push({ file: path.relative(root, file).split(path.sep).join('/'), pattern });
    }
  }
}
if (!schema.includes('definition only')) violations.push({ file: 'phase-3-schema.sql', pattern: 'definition-only marker missing' });
const report = { status: violations.length === 0 ? 'PASS' : 'FAIL', violations };
fs.writeFileSync(path.join(output, 'phase-3-safety-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
if (violations.length) process.exit(22);
