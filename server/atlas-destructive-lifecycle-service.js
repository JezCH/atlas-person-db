"use strict";

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDENT=/^[A-Za-z_][A-Za-z0-9_]{0,62}$/;
function q(v){const s=String(v||"");if(!IDENT.test(s))throw new Error("DESTRUCTIVE_LIFECYCLE_UNSAFE_IDENTIFIER");return `"${s}"`}
function key(r){return `${r.source_schema}.${r.source_table}.${r.source_column}`}
async function discoverIdentityReferences(client,{targetTable,targetColumn="id",semanticColumnPattern=null}={}){
 if(!IDENT.test(String(targetTable||"")))throw new Error("DESTRUCTIVE_LIFECYCLE_TARGET_REQUIRED");
 const fk=await client.query(`select ns.nspname source_schema,c.relname source_table,a.attname source_column,con.conname constraint_name,con.confdeltype delete_action_code
 from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace ns on ns.oid=c.relnamespace
 join pg_class t on t.oid=con.confrelid join pg_namespace tn on tn.oid=t.relnamespace
 join lateral unnest(con.conkey) with ordinality u(attnum,ord) on true
 join lateral unnest(con.confkey) with ordinality v(attnum,ord) on v.ord=u.ord
 join pg_attribute a on a.attrelid=c.oid and a.attnum=u.attnum join pg_attribute ta on ta.attrelid=t.oid and ta.attnum=v.attnum
 where con.contype='f' and tn.nspname='atlas_v2' and t.relname=$1 and ta.attname=$2
 order by ns.nspname,c.relname,a.attname,con.conname`,[targetTable,targetColumn]);
 const m=new Map((fk.rows||[]).map(r=>[key(r),Object.freeze({...r,constraint_backed:true})]));
 if(semanticColumnPattern){
  const sem=await client.query(`select c.table_schema source_schema,c.table_name source_table,c.column_name source_column
  from information_schema.columns c join information_schema.tables t on t.table_schema=c.table_schema and t.table_name=c.table_name
  where c.table_schema='atlas_v2' and c.data_type='uuid' and c.column_name ~* $1 and t.table_type='BASE TABLE'
  order by c.table_schema,c.table_name,c.column_name`,[semanticColumnPattern]);
  for(const r of sem.rows||[])if(!m.has(key(r)))m.set(key(r),Object.freeze({...r,constraint_name:null,delete_action_code:null,constraint_backed:false}));
 }
 return Object.freeze([...m.values()].sort((a,b)=>key(a).localeCompare(key(b))));
}
async function snapshotIdentityDependencies(client,{identityId,references,classify=()=> "external"}){
 const id=String(identityId||"").trim();if(!UUID_RE.test(id))throw new Error("DESTRUCTIVE_LIFECYCLE_ID_REQUIRED");
 const rows=[];for(const r of references){const z=await client.query(`select count(*)::int count from ${q(r.source_schema)}.${q(r.source_table)} where ${q(r.source_column)}=$1::uuid`,[id]);rows.push(Object.freeze({...r,classification:classify(r),count:Number(z.rows[0]?.count||0)}))}
 return Object.freeze(rows);
}
function assertNoUnownedDependencies(snapshot,{ownedKeys=[]}={}){
 const owned=new Set(ownedKeys);const blockers=snapshot.filter(r=>r.count>0&&!owned.has(key(r)));if(blockers.length){const e=new Error("DESTRUCTIVE_LIFECYCLE_EXTERNAL_DEPENDENCIES_PRESENT");e.blockers=blockers;throw e}return Object.freeze({ready:true,snapshot});
}
async function verifyIdentityAbsent(client,{targetTable,identityId,references}){
 const id=String(identityId);const entity=await client.query(`select count(*)::int count from atlas_v2.${q(targetTable)} where id=$1::uuid`,[id]);
 const deps=await snapshotIdentityDependencies(client,{identityId:id,references});const live=deps.filter(r=>r.count>0);
 if(Number(entity.rows[0]?.count||0)!==0||live.length){const e=new Error("DESTRUCTIVE_LIFECYCLE_POSTCONDITION_FAILED");e.live=live;throw e}
 return Object.freeze({absent:true,dependencies:deps});
}
module.exports=Object.freeze({key,discoverIdentityReferences,snapshotIdentityDependencies,assertNoUnownedDependencies,verifyIdentityAbsent});
