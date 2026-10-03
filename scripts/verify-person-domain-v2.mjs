import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT=path.resolve(new URL("..",import.meta.url).pathname);
const DIR=path.join(ROOT,"proposals/person-representative-domain");
const CUTOVER=JSON.parse(fs.readFileSync(path.join(ROOT,"contracts/person-domain-v2-final-cutover.json"),"utf8"));
const ENDPOINT=String(process.env.ATLAS_PERSON_DOMAIN_ENDPOINT||"https://atlas-person-db.vercel.app/api/atlas-person-domain").trim();
const CODES=["governance","military","science","technology","commerce","culture","religion","exploration"];
const LABELS=["정치·통치","군사","과학","공학·기술","경제·상업","인문·예술","종교","탐험"];

function fail(message,details=null){const error=new Error(message);error.details=details;throw error;}
function same(a,b){const x=[...a].map(String).sort(),y=[...b].map(String).sort();return x.length===y.length&&x.every((v,i)=>v===y[i]);}

function historicalScienceIds(){
  const files=fs.readdirSync(DIR).filter((name)=>/^batch-(?:\d{3}|repair-\d{3})\.json$/.test(name)).sort();
  const ids=[];
  for(const name of files){
    const parsed=JSON.parse(fs.readFileSync(path.join(DIR,name),"utf8"));
    for(const item of parsed.science_retained||[]){
      if(item.v2_target_domain!=="science"||item.stored_domain!=="knowledge") fail(`Invalid science_retained evidence: ${name}`,item);
      ids.push(String(item.person_id).toLowerCase());
    }
  }
  if(new Set(ids).size!==ids.length) fail("Duplicate science_retained Person");
  return ids.sort();
}

async function main(){
  const reviewed=historicalScienceIds();
  const approved=CUTOVER.science_target_ids.map((id)=>String(id).toLowerCase()).sort();
  if(reviewed.length!==72||approved.length!==72||!same(reviewed,approved)) fail("Cutover science set does not exactly equal historical science_retained evidence",{reviewed:reviewed.length,approved:approved.length});

  const response=await fetch(ENDPOINT,{headers:{accept:"application/json"},cache:"no-store"});
  const body=await response.json().catch(()=>null);
  if(!response.ok||body?.ok!==true||body?.marker!=="ATLAS_PERSON_REPRESENTATIVE_DOMAIN_V2"||body?.schema!=="atlas-person-domain/v2") fail(`Person Domain v2 read failed: HTTP ${response.status}`,body);
  if(JSON.stringify((body.definitions||[]).map((x)=>x.code))!==JSON.stringify(CODES)) fail("Canonical code order drift",body.definitions);
  if(JSON.stringify((body.definitions||[]).map((x)=>x.label_ko))!==JSON.stringify(LABELS)) fail("Canonical label drift",body.definitions);
  if(Number(body.assigned)!==1978) fail("Assigned count drift",body.assigned);
  const expected={governance:1346,military:205,science:72,technology:38,commerce:28,culture:161,religion:100,exploration:28};
  if(JSON.stringify(body.counts)!==JSON.stringify(expected)) fail("Production v2 count drift",body.counts);
  if((body.rows||[]).some((row)=>row.representative_domain==="knowledge")) fail("Legacy knowledge remains live");
  const liveScience=(body.rows||[]).filter((row)=>row.representative_domain==="science").map((row)=>String(row.person_id).toLowerCase());
  if(!same(liveScience,approved)) fail("Live science UUID set differs from reviewed cutover authority");
  console.log(JSON.stringify({marker:"ATLAS_PERSON_DOMAIN_V2_VERIFY",assigned:body.assigned,counts:body.counts,science_targets:approved.length,legacy_knowledge:0}));
}
main().catch((error)=>{console.error(error.message);if(error.details!=null)console.error(JSON.stringify(error.details));process.exit(1);});
