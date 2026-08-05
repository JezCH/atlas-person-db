#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const argv=process.argv.slice(2);const arg=(n,f=null)=>{const i=argv.indexOf(n);return i>=0?argv[i+1]:f};
const a=path.resolve(arg('--a'));const b=path.resolve(arg('--b'));
const list=d=>fs.readdirSync(d).filter(n=>fs.statSync(path.join(d,n)).isFile()).sort();
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const af=list(a),bf=list(b);const failures=[];if(JSON.stringify(af)!==JSON.stringify(bf))failures.push({code:'FILE_LIST_MISMATCH',a:af,b:bf});
for(const n of [...new Set([...af,...bf])].sort()){if(!fs.existsSync(path.join(a,n))||!fs.existsSync(path.join(b,n)))continue;const ha=hash(path.join(a,n)),hb=hash(path.join(b,n));if(ha!==hb)failures.push({code:'BYTE_MISMATCH',file:n,a:ha,b:hb});}
const result={status:failures.length?'FAIL':'PASS',files:af.length,failures};console.log(JSON.stringify(result,null,2));if(failures.length)process.exit(32);
