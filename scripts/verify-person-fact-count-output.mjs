import fs from 'node:fs';
import { assertPersonFactCountOutput } from '../server/person-fact-count-output.mjs';

const path = process.argv[2];
const input = path ? fs.readFileSync(path, 'utf8') : fs.readFileSync(0, 'utf8');
const result = assertPersonFactCountOutput(input);
console.log(JSON.stringify({
  valid: true,
  standard: result.standard,
  counts: result.counts,
  verified_count: result.verifiedCount,
  unresolved: result.unresolved.length,
  status: result.status,
}, null, 2));
