import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {
  SOURCE_FIELDS,normalizeStage2AssertionOperation,
  loadSourceBundle,assertStage2AssertionAbsent,verifyStage2AssertionApplied
}=require("../server/atlas-correction-v2-stage2-assertions.js");
const {queryBrazilStage2Contract}=require("../server/atlas-polity-reference-audit-handler.js");
const id="fd8a2edc-9a02-491e-8b43-e852707d2068";
const rich={
  id,source_key:"brazil-official-law-5389-1968",
  source_type:"web_bibliographic_reference",
  title:"Lei nº 5.389, de 22 de fevereiro de 1968",
  author_creator:"Congresso Nacional",
  institution:"Câmara dos Deputados",
  publisher:"Diário Oficial da União",
  publication_date:"1968-02-23",publication_year:1968,
  canonical_url:"https://www2.camara.leg.br/legin/fed/lei/1960-1969/lei-5389-22-fevereiro-1968-359075-publicacaooriginal-1-pl.html",
  external_identifier:"Lei 5.389/1968",
  citation_text:"Art. 1º, incisos 2-3; Arts. 3-4; DOU 23/02/1968, Seção 1 p.1673",
  citation_metadata:{official_locator:"DOU 23/02/1968, Seção 1, p. 1673"},
  artifact_metadata:{primary_source:"Brazilian Chamber scanned original"},
  sha256:null,bytes:null
};
function operation(source){return normalizeStage2AssertionOperation({
  type:"assert_source",decision_id:"P2-03J-RICH-SOURCE-TEST",
  exact_before:{source_absent_id:id},exact_after:{source}
},1)}

test("Stage2 exact Source normalizer preserves every rich bibliography field",()=>{
  const normalized=operation(rich).exact_after.source;
  assert.deepEqual(Object.keys(normalized).sort(),[...SOURCE_FIELDS].sort());
  for(const [key,value] of Object.entries(rich))assert.deepEqual(normalized[key],value,key);
});

test("previous eight-field Source assertions remain valid with nullable rich metadata",()=>{
  const minimal=Object.fromEntries(["id","source_key","source_type","title",
    "canonical_url","citation_text","sha256","bytes"].map(k=>[k,rich[k]]));
  const normalized=operation(minimal).exact_after.source;
  for(const field of ["author_creator","institution","publisher","publication_date",
    "publication_year","external_identifier","citation_metadata","artifact_metadata"])
    assert.equal(normalized[field],null,field);
});

test("invalid bibliographic calendar / fake hashes fail closed",()=>{
  assert.throws(()=>operation({...rich,publication_date:"1968/02/23"}),/SOURCE_PUBLICATION_DATE_INVALID/);
  assert.throws(()=>operation({...rich,publication_year:0}),/SOURCE_PUBLICATION_YEAR_INVALID/);
  assert.throws(()=>operation({...rich,sha256:"unverified"}),/SOURCE_FAKE_MATERIALIZATION_FORBIDDEN/);
  assert.throws(()=>operation({...rich,bytes:123}),/SOURCE_FAKE_MATERIALIZATION_FORBIDDEN/);
  assert.throws(()=>operation({...rich,canonical_url:"http://example.com"}),/SOURCE_BIBLIOGRAPHIC_EVIDENCE_REQUIRED/);
});

test("rich exact Source verifies full saved bibliography and notices drift",async()=>{
  const canonical=operation(rich);
  const fake={
    async query(sql,args){assert.deepEqual(args,[id]);assert.match(sql,/publication_date::text as publication_date/);
      return {rowCount:1,rows:[{...rich}]};
    }
  };
  const found=await loadSourceBundle(fake,id);
  assert.deepEqual(found,canonical.exact_after);
  await verifyStage2AssertionApplied(fake,canonical);
  await assert.rejects(()=>assertStage2AssertionAbsent(fake,canonical),/ASSERTION_ID_ALREADY_EXISTS/);
  const drift={...fake,async query(sql,args){const x=await fake.query(sql,args);return {...x,rows:[{...rich,publisher:"Other"}]};}};
  await assert.rejects(()=>verifyStage2AssertionApplied(drift,canonical),/STAGE2_ASSERTION_DRIFT/);
});

test("read-only live DB constraint audit discovers designation types and all Source columns",async()=>{
  const queries=[];
  const fake={async query(sql){
    queries.push(sql);
    assert.match(sql.trim(),/^select /i);
    if(sql.includes("from pg_constraint"))return {rows:[{constraint_name:"polity_designations_type_check",definition:"CHECK (designation_type IN ('official_name'))"}]};
    if(sql.includes("temporal_boundary_or_unresolved_valid"))return {rows:[{definition:"CREATE FUNCTION ..."}]};
    if(sql.includes("temporal_boundary_detail_valid"))return {rows:[{definition:"CREATE FUNCTION ..."}]};
    if(sql.includes("information_schema.columns"))return {rows:SOURCE_FIELDS.map(column_name=>({column_name,data_type:"text",is_nullable:"YES"}))};
    throw Error("UNEXPECTED_QUERY");
  }};
  const x=await queryBrazilStage2Contract(fake);
  assert.equal(x.complete,true);
  assert.equal(x.missing_source_columns.length,0);
  assert.equal(queries.length,4);
  assert.ok(queries.every(sql=>!/\b(insert|update|delete|create|alter|drop|truncate)\b(?=\s+(table|into|atlas_v2\.))/i.test(sql)));
  const absent={async query(sql){const q=await fake.query(sql);if(sql.includes("information_schema"))q.rows=q.rows.filter(x=>x.column_name!=="publisher");return q;}};
  const y=await queryBrazilStage2Contract(absent);
  assert.equal(y.complete,false);
  assert.deepEqual(y.missing_source_columns,["publisher"]);
});
