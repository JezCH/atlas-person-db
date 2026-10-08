import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const service=require("../server/atlas-youtube-living-evidence-service.js");
const {createYoutubeLivingEvidenceHandler}=require("../server/atlas-youtube-living-evidence-handler.js");

const record=(name,id,birth=null,death=null)=>({
  label:{value:name},
  human:{value:"http://www.wikidata.org/entity/"+id},
  ...(birth?{birth:{value:birth}}:{}),
  ...(death?{death:{value:death}}:{})
});

test("living evidence only excludes a unique plausible human with no recorded death",()=>{
  const names=["Unique Present","Definitely Deceased","Ambiguous Name","Unidentified Name","Old Unknown"];
  const rows=[
    record("Unique Present","Q101","+1980-01-01T00:00:00Z"),
    record("Definitely Deceased","Q102","+1980-01-01T00:00:00Z","+2020-01-01T00:00:00Z"),
    record("Ambiguous Name","Q103","+1970-01-01T00:00:00Z"),
    record("Ambiguous Name","Q104","+1975-01-01T00:00:00Z"),
    record("Old Unknown","Q105","+1840-01-01T00:00:00Z")
  ];
  const states=service.resolveMatches(names,rows,2026);
  assert.deepEqual(states.map(x=>x.status),["living_likely","deceased","unknown","unknown","unknown"]);
  assert.equal(states[0].wikidata_id,"Q101");
  assert.equal(states[2].wikidata_id,null);
  assert.match(service.buildQuery(["A Name"]),/VALUES \?label/);
  assert.throws(()=>service.validatedNames([]),/INVALID_LIVING_NAMES/);
  assert.throws(()=>service.validatedNames(["test".repeat(30)]),/INVALID_LIVING_NAMES/);
});

test("living evidence caches successful Wikidata responses",async()=>{
  let calls=0;
  const fetchImpl=async(url,options)=>{
    calls++;
    assert.match(url,/query\.wikidata\.org/);
    assert.match(String(options.headers.accept),/sparql-results/);
    return {ok:true,json:async()=>({results:{bindings:[record("Fixture Living Individual","Q334","+1990-01-01T00:00:00Z")]}})};
  };
  const args={names:["Fixture Living Individual"],now:Date.parse("2026-10-08T12:00:00Z"),fetchImpl};
  const first=await service.readLivingEvidence(args);
  const second=await service.readLivingEvidence(args);
  assert.equal(first.rows[0].status,"living_likely");
  assert.equal(second.rows[0].status,"living_likely");
  assert.equal(calls,1);
});

test("living evidence read failures remain an explicit unavailable response",async()=>{
  const handler=createYoutubeLivingEvidenceHandler({
    read:async({names})=>{
      if(names[0]==="fail") throw new Error("network unavailable");
      return {rows:[{name:names[0],status:"unknown"}]};
    }
  });
  async function call(url,method="GET") {
    const res={headers:{},setHeader(k,v){this.headers[k]=v},end(str){this.payload=JSON.parse(str)}};
    await handler({url,method},res);
    return res;
  }
  const accepted=await call("/api/atlas-read?__atlas_read_surface=youtube-person-living&names="+encodeURIComponent(JSON.stringify(["test"])));
  assert.equal(accepted.statusCode,200);
  assert.equal(accepted.payload.rows[0].status,"unknown");
  const bad=await call("/api/atlas-read?__atlas_read_surface=youtube-person-living&names=not-json");
  assert.equal(bad.statusCode,400);
  const failed=await call("/api/atlas-read?__atlas_read_surface=youtube-person-living&names="+encodeURIComponent(JSON.stringify(["fail"])));
  assert.equal(failed.statusCode,503);
  const method=await call("/api/atlas-read","POST");
  assert.equal(method.statusCode,405);
});

test("reviewed currently living people exclude Musk and Trump without consulting Wikidata",async()=>{
  const {reviewedLivingStatus,REVIEWED_LIVING_NAMES,REVIEW_EXPIRES_AT}=require("../server/atlas-youtube-reviewed-living-people.js");
  const now=Date.parse("2026-10-09T00:00:00Z");
  assert.ok(REVIEWED_LIVING_NAMES.length>=40);
  assert.equal(reviewedLivingStatus("Elon Musk",now)?.status,"living_likely");
  assert.equal(reviewedLivingStatus("Donald Trump",now)?.status,"living_likely");
  assert.equal(reviewedLivingStatus("Trump",now)?.status,"living_likely");
  assert.equal(reviewedLivingStatus("President Donald Trump",now)?.status,"living_likely");
  assert.equal(reviewedLivingStatus("Taylor Swift",now)?.status,"living_likely");
  assert.equal(reviewedLivingStatus("Beyonce",now)?.status,"living_likely");
  assert.equal(reviewedLivingStatus("Trump vs Musk",now),null);
  assert.equal(reviewedLivingStatus("Donald Trump Biography",now),null);
  assert.equal(reviewedLivingStatus("Kim Jong-il",now),null);
  assert.equal(reviewedLivingStatus("Elon Musk",Date.parse(REVIEW_EXPIRES_AT)),null);
  let fetchCalls=0;
  const payload=await service.readLivingEvidence({
    names:["Elon Musk","Donald Trump","Trump","Taylor Swift"],
    now,fetchImpl:async()=>{fetchCalls++;throw new Error("should not call Wikidata")}
  });
  assert.equal(fetchCalls,0);
  assert.equal(payload.evidence_unavailable,false);
  assert.deepEqual(payload.rows.map(row=>row.status),["living_likely","living_likely","living_likely","living_likely"]);
});

test("mixed reviewed living and unknown names keep definite exclusions on provider outage",async()=>{
  const now=Date.parse("2026-10-09T00:01:00Z");
  let called=0;
  const failingFetch=async()=>{called++;throw new Error("fake wikidata timeout")};
  const payload=await service.readLivingEvidence({
    names:["Elon Musk","Donald Trump","Case Unknown For Outage"],
    fetchImpl:failingFetch,now
  });
  assert.equal(called,1);
  assert.equal(payload.evidence_unavailable,true);
  assert.deepEqual(payload.rows.map(row=>row.status),["living_likely","living_likely","unknown"]);
  const next=await service.readLivingEvidence({
    names:["President Trump","Another Unknown Case"],
    fetchImpl:failingFetch,now:now+1000
  });
  assert.equal(called,1,"provider must be suppressed for the 60s cooldown");
  assert.equal(next.evidence_unavailable,true);
  assert.deepEqual(next.rows.map(row=>row.status),["living_likely","unknown"]);
});
