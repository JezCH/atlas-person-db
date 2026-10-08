"use strict";

// Wikidata evidence is supplemental, not an authoritative alive/dead registry.
// A single exact English human label with a plausible birth date and no recorded
// death is a *likely living* match. Ambiguities and missing data stay unknown.
const WIKIDATA_QUERY_URL="https://query.wikidata.org/sparql";
const CACHE_TTL_MS=6*60*60*1000;
const statusCache=new Map();
const MAX_NAMES=25;
const MAX_AGE=115;

function validatedNames(input) {
  if(!Array.isArray(input)||input.length<1||input.length>MAX_NAMES) throw new Error("INVALID_LIVING_NAMES");
  const names=[];
  for(const name of input) {
    if(typeof name!=="string"||name.length<2||name.length>90||!/\p{L}/u.test(name)) throw new Error("INVALID_LIVING_NAMES");
    const trimmed=name.normalize("NFC").trim();
    if(!trimmed||trimmed.includes("\n")) throw new Error("INVALID_LIVING_NAMES");
    if(!names.includes(trimmed)) names.push(trimmed);
  }
  return names;
}

function buildQuery(names) {
  const values=names.map(name=>JSON.stringify(name)+"@en").join(" ");
  return `SELECT ?label ?human ?birth ?death WHERE {
    VALUES ?label { ${values} }
    ?human rdfs:label ?label .
    ?human wdt:P31 wd:Q5 .
    OPTIONAL { ?human wdt:P569 ?birth }
    OPTIONAL { ?human wdt:P570 ?death }
  } LIMIT 800`;
}

function resolveMatches(names,bindings,asOfYear=new Date().getUTCFullYear()) {
  const matches=new Map(names.map(name=>[name,new Map()]));
  for(const row of bindings) {
    const name=String(row?.label?.value||"");
    const id=String(row?.human?.value||"").match(/Q[1-9][0-9]*$/)?.[0];
    if(!id||!matches.has(name)) continue;
    const people=matches.get(name);
    if(!people.has(id)) people.set(id,{birth:null,death:false});
    const p=people.get(id);
    if(row.birth?.value) p.birth=String(row.birth.value).match(/^[+]?([0-9]{3,4})-/)?.[1]||null;
    if(row.death?.value) p.death=true;
  }
  return names.map(name=>{
    const people=matches.get(name);
    const matchedPeople=[...people.entries()];
    if(matchedPeople.length!==1) return {name,status:"unknown",wikidata_id:null};
    const [qid,item]=matchedPeople[0];
    if(item.death) return {name,status:"deceased",wikidata_id:qid};
    const year=Number(item.birth);
    if(!Number.isInteger(year)||year>asOfYear||year<asOfYear-MAX_AGE) return {name,status:"unknown",wikidata_id:null};
    return {name,status:"living_likely",wikidata_id:qid};
  });
}

async function readLivingEvidence({names,fetchImpl=globalThis.fetch,now=Date.now()}={}) {
  const selected=validatedNames(names);
  const missing=selected.filter(name=>{
    const item=statusCache.get(name);
    return !item||item.expires_at<=now;
  });
  if(missing.length) {
    if(typeof fetchImpl!=="function") throw new Error("WIKIDATA_FETCH_UNAVAILABLE");
    const url=new URL(WIKIDATA_QUERY_URL);
    url.searchParams.set("query",buildQuery(missing));
    url.searchParams.set("format","json");
    const response=await fetchImpl(url.toString(),{
      headers:{"accept":"application/sparql-results+json","user-agent":"ATLAS-YouTube-Discovery/1.0 (evidence-only)"},
      signal:AbortSignal.timeout(8500)
    });
    if(!response.ok) throw new Error("WIKIDATA_LOOKUP_UNAVAILABLE");
    const payload=await response.json();
    const rows=payload?.results?.bindings;
    if(!Array.isArray(rows)||rows.length>=800) throw new Error("WIKIDATA_LOOKUP_INCOMPLETE");
    for(const item of resolveMatches(missing,rows,new Date(now).getUTCFullYear())) {
      statusCache.set(item.name,{...item,expires_at:now+CACHE_TTL_MS});
    }
    if(statusCache.size>3000) statusCache.clear();
  }
  return Object.freeze({
    evidence_source:"Wikidata P31/P569/P570 (unique exact English label, unverified living inference)",
    checked_at:new Date(now).toISOString(),
    rows:Object.freeze(selected.map(name=>{
      const item=statusCache.get(name);
      return Object.freeze({name,status:item?.status||"unknown",wikidata_id:item?.wikidata_id||null});
    }))
  });
}

module.exports=Object.freeze({MAX_NAMES,MAX_AGE,validatedNames,buildQuery,resolveMatches,readLivingEvidence});
