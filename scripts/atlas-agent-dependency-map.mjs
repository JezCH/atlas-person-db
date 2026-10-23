import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const CODE=/\.(?:js|mjs|cjs|ts|tsx)$/;
const MAX_FILES=4000,MAX_BYTES=196608;
function git(root,args){
  const p=spawnSync('git',['-C',root,...args],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:20000});
  if(p.status!==0)throw Error('ATLAS_DEPENDENCY_GIT: '+(p.stderr||p.error?.message||'unknown').trim());
  return p.stdout;
}
function trackedCode(root){
  const out=git(root,['ls-files','-z','--','scripts','server','api','tests','db','config','atlas-*.js']);
  if(out&&!out.endsWith('\0'))throw Error('ATLAS_DEPENDENCY_INCOMPLETE_LIST');
  const paths=out?out.slice(0,-1).split('\0').filter(x=>CODE.test(x)):[];
  if(paths.length>MAX_FILES)throw Error('ATLAS_DEPENDENCY_TOO_MANY_FILES');
  return paths;
}
function safeFile(root,name){
  if(typeof name!=='string'||!name||name.startsWith('/')||name.split('/').includes('..')||
    name.includes('\\')||/[\x00-\x1f]/.test(name))return false;
  const full=path.resolve(root,name);
  if(!full.startsWith(root+path.sep))return false;
  try{return fs.realpathSync(full)===full&&fs.statSync(full).isFile()&&fs.statSync(full).size<=MAX_BYTES}
  catch{return false}
}
function blank(c){return c==='\n'?'\n':' '}
export function codeMask(source){
  let out='',state='code',escaped=false;
  for(let i=0;i<source.length;i++){
    const c=source[i],next=source[i+1];
    if(state==='code'){
      if(c==='/'&&next==='/'){out+='  ';i++;state='line';continue}
      if(c==='/'&&next==='*'){out+='  ';i++;state='block';continue}
      if(c==='"'||c==="'"||c.charCodeAt(0)===96){out+=' ';state=c;escaped=false;continue}
      out+=c;continue;
    }
    if(state==='line'){out+=blank(c);if(c==='\n')state='code';continue}
    if(state==='block'){
      if(c==='*'&&next==='/'){out+='  ';i++;state='code'}
      else out+=blank(c);
      continue;
    }
    out+=blank(c);
    if(escaped){escaped=false;continue}
    if(c==='\\'){escaped=true;continue}
    if(c===state)state='code';
  }
  return out;
}
function literal(source,start){
  let p=start;
  while(p<source.length&&/\s/.test(source[p]))p++;
  const quote=source[p];
  if(quote!=="'"&&quote!=='"')return null;
  const begin=++p;
  while(p<source.length&&source[p]!==quote){
    if(source[p]==='\\'||source[p]==='\n'||p-begin>240)return null;
    p++;
  }
  return source[p]===quote?source.slice(begin,p):null;
}
export function relativeSpecifiers(source){
  const mask=codeMask(source),result=new Set();
  for(const match of mask.matchAll(/\b(?:import|require|from)\b/g)){
    const token=match[0],i=match.index;
    if(token==='from'){
      const prefix=mask.slice(Math.max(0,i-320),i).split(';').pop();
      if(!/\b(?:import|export)\b/.test(prefix))continue;
    }
    let j=i+token.length;
    while(/\s/.test(mask[j]||'!'))j++;
    if(token!=='from'){
      if(mask[j]==='(')j++;
      else if(token==='require')continue;
    }
    const found=literal(source,j);
    if(found&&/^\.{1,2}\//.test(found))result.add(found);
  }
  return [...result];
}
function resolveImport(from,spec,known){
  const root=path.posix.normalize(path.posix.join(path.posix.dirname(from),spec));
  if(root==='..'||root.startsWith('../')||root.startsWith('/'))return null;
  const options=[root,root+'.mjs',root+'.js',root+'.cjs',root+'.ts',root+'.tsx',
    root+'/index.mjs',root+'/index.js',root+'/index.ts'];
  return options.find(v=>known.has(v))||null;
}
export function analyzeDependencies({root=process.cwd(),target,depth=2,cap=25}={}){
  if(!Number.isInteger(depth)||depth<1||depth>3||!Number.isInteger(cap)||cap<1||cap>50)
    throw Error('ATLAS_DEPENDENCY_OPTIONS');
  const base=fs.realpathSync(root);
  if(!safeFile(base,target))throw Error('ATLAS_DEPENDENCY_TARGET');
  const paths=trackedCode(base),known=new Set(paths);
  if(!known.has(target))throw Error('ATLAS_DEPENDENCY_NOT_TRACKED');
  const reverse=new Map(),deps=new Map();
  let examined=0,skipped=0;
  for(const name of paths){
    if(!safeFile(base,name)){skipped++;continue}
    const content=fs.readFileSync(path.join(base,name),'utf8');
    const refs=[...new Set(relativeSpecifiers(content)
      .map(s=>resolveImport(name,s,known)).filter(Boolean))].sort();
    deps.set(name,refs);
    for(const dep of refs){
      if(!reverse.has(dep))reverse.set(dep,new Set());
      reverse.get(dep).add(name);
    }
    examined++;
  }
  const direct=[...(reverse.get(target)||[])].sort();
  const seen=new Set([target]),levels=[];
  let frontier=[target];
  for(let distance=1;distance<=depth;distance++){
    const next=[];
    for(const current of frontier)
      for(const caller of [...(reverse.get(current)||[])].sort())
        if(!seen.has(caller)){seen.add(caller);next.push(caller)}
    next.sort();
    levels.push({distance,paths:next.slice(0,cap),truncated:next.length>cap});
    frontier=next;
    if(!frontier.length)break;
  }
  const tests=new Map(),stem=path.posix.basename(target).replace(CODE,'');
  for(const p of [...direct,...levels.flatMap(x=>x.paths)])
    if(/^tests\/.+\.test\.(?:mjs|js|cjs)$/.test(p))
      tests.set(p,'static direct/transitive importer');
  for(const p of paths)
    if(p.startsWith('tests/')&&p.includes(stem)&&/\.test\.(?:mjs|js|cjs)$/.test(p))
      tests.set(p,'filename match, not verified coverage');
  return {version:2,target,head_sha:git(base,['rev-parse','HEAD']).trim(),
    scope:'Static literal relative module edges only. Not full AST, call graph, runtime routes or verified test coverage.',
    dependencies:(deps.get(target)||[]).slice(0,cap),
    dependencies_truncated:(deps.get(target)||[]).length>cap,
    direct_importers:direct.slice(0,cap),direct_importers_truncated:direct.length>cap,
    reverse_levels:levels,related_tests:[...tests].sort((a,b)=>a[0].localeCompare(b[0]))
      .slice(0,cap).map(([file,reason])=>({file,reason})),
    scanned_files:examined,unreadable_or_large:skipped};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2);
    if(args.length!==2||args[0]!=='--path')
      throw Error('usage: node scripts/atlas-agent-dependency-map.mjs --path scripts/example.mjs');
    console.log(JSON.stringify(analyzeDependencies({target:args[1]}),null,2));
  }catch(e){console.error(e.message);process.exitCode=1}
}
