#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const argv=process.argv.slice(2);const arg=(n,f=null)=>{const i=argv.indexOf(n);return i>=0?argv[i+1]:f};
const out=path.resolve(arg('--output','migration/phase-4/output'));
const read=n=>JSON.parse(fs.readFileSync(path.join(out,n),'utf8'));
const required=['persons.json','person_names.json','polities.json','polity_names.json','roles.json','role_names.json','period_bases.json','period_basis_names.json','person_politics_v2.json','sources.json','person_sources.json','polity_sources.json','person_politics_sources.json','chronology_claims.json','person_descriptions.json','polity_descriptions.json','relationship_descriptions.json','compiler-summary.json','count-conservation-report.json','reference-integrity-report.json','collision-report.json','locale-conflict-report.json'];
const missing=required.filter(n=>!fs.existsSync(path.join(out,n)));const failures=[];
if(missing.length)failures.push({code:'MISSING_OUTPUTS',missing});
if(!missing.length){const s=read('compiler-summary.json');if(s.gate.count_conservation!=='PASS')failures.push({code:'COUNT_CONSERVATION'});if(s.gate.reference_integrity!=='PASS')failures.push({code:'REFERENCE_INTEGRITY'});if(s.gate.uuid_collisions!=='PASS')failures.push({code:'UUID_COLLISIONS'});if(s.counts.legacy_relationship_rows!==s.counts.compiled_relationship_rows)failures.push({code:'ROW_LOSS'});}
const result={status:failures.length?'FAIL':'PASS',failures};console.log(JSON.stringify(result,null,2));if(failures.length)process.exit(31);
