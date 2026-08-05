import fs from 'node:fs';
import path from 'node:path';

const [a, b] = process.argv.slice(2);
if (!a || !b) process.exit(32);
const files = ['phase-5-deployment.sql','phase-5-rollback.sql','phase-5-build-report.json','phase-5-validation-report.json'];
const mismatches = [];
for (const file of files) {
  const aa = fs.readFileSync(path.join(a, file));
  const bb = fs.readFileSync(path.join(b, file));
  if (!aa.equals(bb)) mismatches.push(file);
}
const report = { status: mismatches.length ? 'FAIL' : 'PASS', files, mismatches };
console.log(JSON.stringify(report, null, 2));
if (mismatches.length) process.exit(32);
