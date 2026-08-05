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
const schemaPath = path.join(output, 'phase-3-schema.sql');
const contractPath = path.join(root, 'migration/phase-3/contracts/target-schema.contract.json');
const schema = fs.readFileSync(schemaPath, 'utf8').toLowerCase();
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const failures = [];
for (const table of contract.required_tables) {
  if (!schema.includes(`create table ${table.toLowerCase()} (`)) failures.push({ type: 'missing_table', value: table });
}
for (const type of contract.required_types) {
  if (!schema.includes(`create type ${type.toLowerCase()} as enum`)) failures.push({ type: 'missing_type', value: type });
}
for (const fragment of contract.required_fragments) {
  if (!schema.includes(fragment.toLowerCase())) failures.push({ type: 'missing_fragment', value: fragment });
}
const report = {
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  required_tables: contract.required_tables.length,
  required_types: contract.required_types.length,
  required_fragments: contract.required_fragments.length,
  failures
};
fs.writeFileSync(path.join(output, 'phase-3-contract-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(21);
