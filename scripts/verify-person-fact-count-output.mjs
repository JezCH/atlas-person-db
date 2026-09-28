import fs from 'node:fs';
import { assertPersonFactProfileOutput } from '../server/person-fact-count-output.mjs';

const path = process.argv[2];
const input = path ? fs.readFileSync(path, 'utf8') : fs.readFileSync(0, 'utf8');
const result = assertPersonFactProfileOutput(input);
console.log(JSON.stringify({
  valid: true,
  standard: result.standard,
  status: result.status,
  unresolved: result.unresolved,
}, null, 2));
