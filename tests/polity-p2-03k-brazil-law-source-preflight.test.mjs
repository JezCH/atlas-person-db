import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {
  queryBrazilLawSourcePreflight,BRAZIL_P2_03K_LAW_SOURCE_KEY,
  BRAZIL_P2_03K_OFFICIAL_LAW_URLS,BRAZIL_P2_03K_LAW_METADATA_TERMS
}=require("../server/atlas-polity-reference-audit-handler.js");

test("Brazil 1968 primary Law official source URLs and key are exact constants",()=>{
  assert.equal(BRAZIL_P2_03K_LAW_SOURCE_KEY,"brazil-law-5389-1968-official");
  assert.equal(BRAZIL_P2_03K_OFFICIAL_LAW_URLS.length,6);
  assert.equal(new Set(BRAZIL_P2_03K_OFFICIAL_LAW_URLS).size,6);
  for(const item of BRAZIL_P2_03K_OFFICIAL_LAW_URLS)assert.equal(new URL(item).protocol,"https:");
  assert.ok(BRAZIL_P2_03K_LAW_METADATA_TERMS.includes("%5389%"));
  assert.ok(BRAZIL_P2_03K_LAW_METADATA_TERMS.includes("%5.389%"));
});

function fakeDatabase({exact=[],metadata=[],count=metadata.length,generic=[]}={}){
  const calls=[];
  const client={async query(sql,params=[]){
    calls.push({sql,params});
    assert.match(sql.trim(),/^select /i);
    if(sql.includes("where source_key=$1::text or canonical_url=any"))return {rows:exact};
    if(sql.includes("count(*)::int as total from atlas_v2.sources"))return {rows:[{total:count}]};
    if(sql.includes("where lower(concat_ws"))return {rows:metadata};
    if(sql.includes("group by source_type"))return {rows:[{source_type:"repository_dataset",total:11},{source_type:"web_bibliographic_reference",total:8}]};
    if(sql.includes("where lower(source_type) like any"))return {rows:generic};
    throw Error("unexpected query");
  }};
  return {client,calls};
}

test("Source law preflight checks exact IDs, URL variants and rich metadata without writing",async()=>{
  const db=fakeDatabase({metadata:[{source_id:"existing",source_key:"generic",title:"Lei 5.389"}],
    generic:[{source_id:"other",source_key:"pending-records",source_type:"repository_dataset"}]});
  const result=await queryBrazilLawSourcePreflight(db.client);
  assert.equal(result.metadata_match_total,1);
  assert.equal(result.metadata_candidates.length,1);
  assert.equal(result.exact_source_key_or_url_matches.length,0);
  assert.equal(result.catalog_scan_complete,true);
  assert.equal(result.safe_for_automatic_source_assertion,false);
  assert.equal(result.absence_of_semantically_duplicate_unlabeled_external_payloads_proven,false);
  assert.equal(result.generic_catalogue_samples.length,1);
  assert.equal(db.calls.length,5);
  assert.deepEqual(db.calls[0].params,[BRAZIL_P2_03K_LAW_SOURCE_KEY,[...BRAZIL_P2_03K_OFFICIAL_LAW_URLS]]);
  assert.deepEqual(db.calls[1].params,[[...BRAZIL_P2_03K_LAW_METADATA_TERMS]]);
  for(const {sql} of db.calls){
    assert.doesNotMatch(sql,/^\s*(insert|update|delete|alter|drop|create|truncate)\b/i);
  }
});

test("Even zero matches cannot authorize insert over unlabeled generic dataset provenance",async()=>{
  const db=fakeDatabase();
  const result=await queryBrazilLawSourcePreflight(db.client);
  assert.equal(result.metadata_match_total,0);
  assert.equal(result.catalog_scan_complete,true);
  assert.equal(result.safe_for_automatic_source_assertion,false);
  assert.equal(result.absence_of_semantically_duplicate_unlabeled_external_payloads_proven,false);
  assert.ok(result.caveat.includes("Generic dataset content"));
});

test("Overflow is explicitly truncated and cannot be mistaken for complete metadata census",async()=>{
  const metadata=Array.from({length:51},(_,i)=>({source_id:String(i)}));
  const exact=Array.from({length:51},(_,i)=>({source_id:String(i)}));
  const generic=Array.from({length:51},(_,i)=>({source_id:String(i)}));
  const db=fakeDatabase({metadata,exact,count:51,generic});
  const result=await queryBrazilLawSourcePreflight(db.client);
  assert.equal(result.catalog_scan_complete,false);
  assert.equal(result.metadata_truncated,true);
  assert.equal(result.exact_truncated,true);
  assert.equal(result.generic_catalogue_sample_truncated,true);
  assert.equal(result.metadata_candidates.length,50);
  assert.equal(result.exact_source_key_or_url_matches.length,50);
});
