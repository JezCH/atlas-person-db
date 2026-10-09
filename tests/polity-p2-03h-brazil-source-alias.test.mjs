import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {queryBrazilSourceAliases,BRAZIL_P2_03H_SOURCE_ALIAS_PATTERN}=require("../server/atlas-polity-reference-audit-handler.js");
test("1968 law and official titles are in explicit source alias scope",()=>{
  for(const s of ["5389","733","1891","1934","1946","1967","1969","1988","estados unidos do brasil"]) assert.ok(BRAZIL_P2_03H_SOURCE_ALIAS_PATTERN.includes(s),s);
});
test("read-only metadata search preserves one bound regex and complete result",async()=>{
  const seen=[];
  const fake={async query(sql,params){seen.push({sql,params});assert.deepEqual(params,[BRAZIL_P2_03H_SOURCE_ALIAS_PATTERN]);assert.match(sql.trim(),/^select /i);
    if(sql.includes("count(*)"))return {rows:[{total:1}]};
    return {rows:[{source_id:"a",source_key:"law-5389",title:"1968 law",canonical_url:"https://official.example"}]};
  }};
  const result=await queryBrazilSourceAliases(fake);
  assert.equal(result.total_metadata_matches,1);assert.equal(result.complete,true);assert.equal(result.truncated,false);assert.equal(result.returned_rows.length,1);
  assert.equal(seen.length,2);assert.match(seen[1].sql,/limit 101/i);
});
test("truncated match list reports incomplete, never false exhaustive absence",async()=>{
  const fake={async query(sql){return sql.includes("count(*)")?{rows:[{total:102}]}:{rows:Array.from({length:101},(_,i)=>({source_id:String(i)}))}}};
  const result=await queryBrazilSourceAliases(fake);
  assert.equal(result.complete,false);assert.equal(result.truncated,true);assert.equal(result.returned_rows.length,100);
});
