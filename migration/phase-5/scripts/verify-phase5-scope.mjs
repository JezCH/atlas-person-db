import { execFileSync } from 'node:child_process';

const baseline = '3093cdd558e879338fdab31586eafbcf2cace217';
const files = execFileSync('git', ['diff','--name-only',`${baseline}...HEAD`], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const allowed = files.every((f) => f.startsWith('migration/phase-5/') || f === '.github/workflows/phase-5-shadow-dry.yml' || f === '.github/workflows/phase-5-shadow-apply.yml' || f.startsWith('supabase/migrations/'));
const report = { status: allowed ? 'PASS' : 'FAIL', baseline, files };
console.log(JSON.stringify(report, null, 2));
if (!allowed) process.exit(33);
