#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
const root = path.resolve(arg('--root', '.'));
const out = path.resolve(arg('--output', path.join(root, 'migration', 'phase-4', 'output')));
const branch = arg('--branch', process.env.GITHUB_REF_NAME || 'agent/phase4-deterministic-compiler');
const commit = arg('--commit', process.env.GITHUB_SHA || 'unknown');
const PHASE3_SHA = 'aaf3eec0b07a4108cb80b0acdc5f6c9f5f8c4e8b';
const NS = {
  person: 'fc5f12ec-2f67-5f7b-8aa3-741c8b9f7b33',
  polity: 'edb9c5f4-5ee8-54ff-ae8b-11455d24e7b9',
  relationship: '7f64f1f8-249f-53e7-8ee7-877a1394de18',
  name: '20575ecb-6490-5ec3-bc0d-c0470fe72b8a',
  source: '7b57cddb-e47b-588f-a48d-516bd7727955'
};
const PERIODS = ['reign','term','de_facto_rule','military_activity','religious_activity','intellectual_activity','artistic_activity','general_activity'];
const EMPTY = ['chronology_claims','person_descriptions','polity_descriptions','relationship_descriptions'];

function stable(v) { if (Array.isArray(v)) return v.map(stable); if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])); return v; }
function write(name, value) { fs.mkdirSync(out,{recursive:true}); fs.writeFileSync(path.join(out,name), JSON.stringify(stable(value), null, 2)+'\n'); }
function normalize(v) { return String(v ?? '').normalize('NFC').trim().replace(/\s+/g,' '); }
function hash(v) { return crypto.createHash('sha256').update(v).digest('hex'); }
function uuidBytes(uuid) { return Buffer.from(uuid.replace(/-/g,''),'hex'); }
function uuidv5(namespace, name) { const b = crypto.createHash('sha1').update(Buffer.concat([uuidBytes(namespace),Buffer.from(name)])).digest().subarray(0,16); b[6]=(b[6]&0x0f)|0x50; b[8]=(b[8]&0x3f)|0x80; const h=b.toString('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`; }
function suffix(f) { const m=f.match(/-supplement-(\d+)\./); return m?Number(m[1]):f.includes('-supplement.')?1:0; }
function sourceSort(a,b) { const na=suffix(a), nb=suffix(b); if(na!==nb)return na-nb; if(a.includes('corrections')!==b.includes('corrections')) return a.includes('corrections')?1:-1; return a.localeCompare(b); }
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function parseObjectLiterals(src) {
  const maps=[]; let i=0;
  while(i<src.length){ const eq=src.indexOf('=',i); if(eq<0) break; let j=eq+1; while(/\s/.test(src[j]))j++; if(src[j]!=='{'){i=eq+1;continue;} const obj={}; let k=j+1, ok=true;
    while(k<src.length){ while(/\s|,/.test(src[k]))k++; if(src[k]==='}') { maps.push(obj); i=k+1; break; } if(src[k]!=='"'&&src[k]!=="'"){ok=false;break;} const q=src[k++]; let key=''; while(k<src.length&&src[k]!==q){key+=src[k++];} k++; while(/\s/.test(src[k]))k++; if(src[k++]!==':'){ok=false;break;} while(/\s/.test(src[k]))k++; if(src[k]!=='"'&&src[k]!=="'"){ok=false;break;} const q2=src[k++]; let val=''; while(k<src.length&&src[k]!==q2){val+=src[k++];} k++; obj[key]=val; }
    if(!ok) i=eq+1;
  }
  return maps;
}

const top = fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()).map(e=>e.name);
const canonicalFiles = top.filter(n=>/^pending-records(?:-supplement(?:-\d+)?)?\.json$/.test(n)||n==='pending-records-corrections.json').sort(sourceSort);
const localeFiles = top.filter(n=>/^person-locales(?:-supplement(?:-\d+)?)?\.js$/.test(n)).sort(sourceSort);
const inputInventory=[]; const rows=[];
for(const file of canonicalFiles){ const buf=fs.readFileSync(path.join(root,file)); inputInventory.push({path:file,bytes:buf.length,sha256:hash(buf)}); const data=JSON.parse(buf.toString('utf8')); if(!Array.isArray(data)) throw new Error(`${file} must be an array`); data.forEach((r,index)=>rows.push({...r,__file:file,__index:index,__source_sha256:hash(buf)})); }
for(const file of localeFiles){ const buf=fs.readFileSync(path.join(root,file)); inputInventory.push({path:file,bytes:buf.length,sha256:hash(buf)}); }

const personNamesByKey=new Map(), polityNamesByKey=new Map(), localeConflicts=[];
for(const file of localeFiles){ const maps=parseObjectLiterals(read(file)); for(const map of maps){ for(const [key,value] of Object.entries(map)){ const target = rows.some(r=>normalize(r.person_name)===normalize(key)) ? personNamesByKey : rows.some(r=>normalize(r.politic_name)===normalize(key)) ? polityNamesByKey : null; if(!target) continue; const k=normalize(key), v=normalize(value); if(!target.has(k)) target.set(k,[]); const arr=target.get(k); if(!arr.includes(v)) arr.push(v); } } }
for(const [key,values] of [...personNamesByKey,...polityNamesByKey]) if(values.length>1) localeConflicts.push({key,values:[...values].sort()});

const persons=[...new Set(rows.map(r=>normalize(r.person_name)))].sort().map(canonical_key=>({id:uuidv5(NS.person,`person:${canonical_key}`),canonical_key,person_type:'historical',historicity:'historical'}));
const polities=[...new Set(rows.map(r=>normalize(r.politic_name)))].sort().map(canonical_key=>({id:uuidv5(NS.polity,`polity:${canonical_key}`),canonical_key,polity_type:'historical_polity',historicity:'historical'}));
const personId=new Map(persons.map(x=>[x.canonical_key,x.id])); const polityId=new Map(polities.map(x=>[x.canonical_key,x.id]));
const person_names=[]; const polity_names=[];
for(const p of persons){ person_names.push({id:uuidv5(NS.name,`person-name:${p.id}:en:canonical:${p.canonical_key}`),person_id:p.id,locale:'en',name:p.canonical_key,name_type:'canonical',is_preferred:true}); const vals=(personNamesByKey.get(p.canonical_key)||[]).sort(); vals.forEach((name,i)=>person_names.push({id:uuidv5(NS.name,`person-name:${p.id}:ko:display:${name}`),person_id:p.id,locale:'ko',name,name_type:'display',is_preferred:i===0})); }
for(const p of polities){ polity_names.push({id:uuidv5(NS.name,`polity-name:${p.id}:en:canonical:${p.canonical_key}`),polity_id:p.id,locale:'en',name:p.canonical_key,name_type:'canonical',is_preferred:true}); const vals=(polityNamesByKey.get(p.canonical_key)||[]).sort(); vals.forEach((name,i)=>polity_names.push({id:uuidv5(NS.name,`polity-name:${p.id}:ko:display:${name}`),polity_id:p.id,locale:'ko',name,name_type:'display',is_preferred:i===0})); }
const roleTexts=[...new Set(rows.map(r=>normalize(r.role)||'unspecified'))].sort();
const roles=roleTexts.map(label=>({id:uuidv5(NS.name,`role:${label}`),code:`legacy_${hash(label).slice(0,16)}`,category:'legacy_free_text',source_label:label,is_active:true})); const roleId=new Map(roles.map(x=>[x.source_label,x.id]));
const role_names=roles.map(r=>({id:uuidv5(NS.name,`role-name:${r.id}:en:${r.source_label}`),role_id:r.id,locale:'en',name:r.source_label,is_preferred:true}));
const period_bases=PERIODS.map(code=>({id:uuidv5(NS.name,`period-basis:${code}`),code,is_active:true})); const periodId=new Map(period_bases.map(x=>[x.code,x.id]));
const period_basis_names=PERIODS.map(code=>({id:uuidv5(NS.name,`period-basis-name:${code}:en`),period_basis_id:periodId.get(code),locale:'en',name:code,is_preferred:true}));
const sources=inputInventory.sort((a,b)=>a.path.localeCompare(b.path)).map(x=>({id:uuidv5(NS.source,`repository-source:${x.path}:${x.sha256}`),source_key:`repository-source:${x.path}:${x.sha256}`,source_type:'repository_dataset',title:x.path,sha256:x.sha256,bytes:x.bytes})); const sourceId=new Map(sources.map(x=>[x.title,x.id]));
const relationships=[]; const person_politics_sources=[];
for(const r of rows){ const person=normalize(r.person_name), polity=normalize(r.politic_name), role=normalize(r.role)||'unspecified', basis=normalize(r.period_basis||'general_activity'); const start=Number(r.activity_start), end=Number(r.activity_end); if(!Number.isInteger(start)||!Number.isInteger(end)||start===0||end===0||end<start) throw new Error(`Invalid chronology ${r.__file}:${r.__index}`); if(!periodId.has(basis)) throw new Error(`Unsupported period basis ${basis}`); const canonical={person,polity,start,end,role,basis,notes:normalize(r.notes)}; const content_hash=hash(JSON.stringify(stable(canonical))); const legacy_source_key=`${r.__file}:${r.__index}:${content_hash.slice(0,16)}`; const id=uuidv5(NS.relationship,`relationship:${legacy_source_key}`); relationships.push({id,person_id:personId.get(person),polity_id:polityId.get(polity),activity_start:start,activity_end:end,role_id:roleId.get(role),period_basis_id:periodId.get(basis),confidence:'legacy_asserted',chronology_status:'exact_as_recorded',legacy_source_key,notes:normalize(r.notes)||null,source_locator:{file:r.__file,index:r.__index,source_sha256:r.__source_sha256},content_hash}); person_politics_sources.push({person_politics_id:id,source_id:sourceId.get(r.__file),source_locator_key:`${r.__file}:${r.__index}`}); }
relationships.sort((a,b)=>a.legacy_source_key.localeCompare(b.legacy_source_key)); person_politics_sources.sort((a,b)=>a.person_politics_id.localeCompare(b.person_politics_id));
const person_sources=persons.map(p=>({person_id:p.id,source_ids:[...new Set(rows.filter(r=>normalize(r.person_name)===p.canonical_key).map(r=>sourceId.get(r.__file)))].sort()}));
const polity_sources=polities.map(p=>({polity_id:p.id,source_ids:[...new Set(rows.filter(r=>normalize(r.politic_name)===p.canonical_key).map(r=>sourceId.get(r.__file)))].sort()}));
const collisionKeys=new Map(), collisions=[]; for(const group of [persons,polities,person_names,polity_names,roles,period_bases,relationships,sources]) for(const item of group){ if(!item.id) continue; const sig=JSON.stringify(stable(item)); if(collisionKeys.has(item.id)&&collisionKeys.get(item.id)!==sig) collisions.push({id:item.id}); else collisionKeys.set(item.id,sig); }
const refs={missing_person:relationships.filter(x=>!personId.has(persons.find(p=>p.id===x.person_id)?.canonical_key)).length,missing_polity:relationships.filter(x=>!polities.some(p=>p.id===x.polity_id)).length,missing_role:relationships.filter(x=>!roles.some(p=>p.id===x.role_id)).length,missing_period_basis:relationships.filter(x=>!period_bases.some(p=>p.id===x.period_basis_id)).length};
const summary={metadata:{repository:'JezCH/atlas-person-db',branch,audited_commit_sha:commit,phase3_closing_sha:PHASE3_SHA,compiler_version:1},counts:{legacy_relationship_rows:rows.length,compiled_relationship_rows:relationships.length,persons:persons.length,polities:polities.length,person_names:person_names.length,polity_names:polity_names.length,roles:roles.length,sources:sources.length},gate:{count_conservation:rows.length===relationships.length?'PASS':'FAIL',reference_integrity:Object.values(refs).every(x=>x===0)?'PASS':'FAIL',uuid_collisions:collisions.length===0?'PASS':'FAIL',locale_conflicts_reported:localeConflicts.length,compiler:'PASS'}};

write('input-inventory.json',{files:inputInventory.sort((a,b)=>a.path.localeCompare(b.path))}); write('persons.json',persons); write('person_names.json',person_names); write('polities.json',polities); write('polity_names.json',polity_names); write('roles.json',roles); write('role_names.json',role_names); write('period_bases.json',period_bases); write('period_basis_names.json',period_basis_names); write('person_politics_v2.json',relationships); write('sources.json',sources); write('person_sources.json',person_sources); write('polity_sources.json',polity_sources); write('person_politics_sources.json',person_politics_sources); for(const n of EMPTY) write(`${n}.json`,[]); write('locale-conflict-report.json',{status:'REPORTED',conflicts:localeConflicts.sort((a,b)=>a.key.localeCompare(b.key))}); write('collision-report.json',{status:collisions.length?'FAIL':'PASS',collisions}); write('reference-integrity-report.json',{status:Object.values(refs).every(x=>x===0)?'PASS':'FAIL',...refs}); write('count-conservation-report.json',{status:rows.length===relationships.length?'PASS':'FAIL',legacy_rows:rows.length,compiled_rows:relationships.length}); write('compiler-summary.json',summary);
console.log(JSON.stringify(summary,null,2)); if(summary.gate.count_conservation!=='PASS'||summary.gate.reference_integrity!=='PASS'||summary.gate.uuid_collisions!=='PASS') process.exit(30);
