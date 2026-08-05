#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
const baseline='aaf3eec0b07a4108cb80b0acdc5f6c9f5f8c4e8b';
const allowed=['migration/phase-4/','.github/workflows/phase-4-compiler.yml'];
const files=execFileSync('git',['diff','--name-only',baseline,'HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const violations=files.filter(f=>!allowed.some(p=>f===p||f.startsWith(p)));
const result={status:violations.length?'FAIL':'PASS',baseline,files,violations};console.log(JSON.stringify(result,null,2));if(violations.length)process.exit(33);
