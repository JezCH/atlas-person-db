import process from "node:process";

const ENDPOINT=String(process.env.ATLAS_PERSON_DOMAIN_ENDPOINT||"https://atlas-person-db.vercel.app/api/atlas-person-domain").trim();
const CODES=["governance","military","science","technology","commerce","culture","religion","exploration"];
const LABELS=["정치·통치","군사","과학","공학·기술","경제·상업","인문·예술","종교","탐험"];
const CODE_SET=new Set(CODES);

function fail(message,details=null){const error=new Error(message);error.details=details;throw error;}

async function main(){
  const response=await fetch(ENDPOINT,{headers:{accept:"application/json"},cache:"no-store"});
  const body=await response.json().catch(()=>null);
  if(!response.ok||body?.ok!==true||body?.marker!=="ATLAS_PERSON_REPRESENTATIVE_DOMAIN_V2"||body?.schema!=="atlas-person-domain/v2") {
    fail(`Person Domain v2 read failed: HTTP ${response.status}`,body);
  }

  const definitions=Array.isArray(body.definitions)?body.definitions:[];
  if(JSON.stringify(definitions.map((x)=>x.code))!==JSON.stringify(CODES)) fail("Canonical code order drift",definitions);
  if(JSON.stringify(definitions.map((x)=>x.label_ko))!==JSON.stringify(LABELS)) fail("Canonical label drift",definitions);

  const rows=Array.isArray(body.rows)?body.rows:[];
  const assigned=Number(body.assigned);
  if(!Number.isInteger(assigned)||assigned<0) fail("Assigned count invalid",body.assigned);
  if(rows.length!==assigned) fail("Assigned count and row count drift",{assigned,rows:rows.length});

  const personIds=new Set();
  const derived=Object.fromEntries(CODES.map((code)=>[code,0]));
  for(const row of rows){
    const personId=String(row?.person_id||"").trim().toLowerCase();
    const domain=String(row?.representative_domain||"").trim().toLowerCase();
    if(!personId) fail("Domain row missing Person id",row);
    if(personIds.has(personId)) fail("Duplicate Person domain row",personId);
    personIds.add(personId);
    if(domain==="knowledge") fail("Legacy knowledge remains live",row);
    if(!CODE_SET.has(domain)) fail("Unsupported live representative domain",row);
    derived[domain]+=1;
  }

  const counts=body.counts&&typeof body.counts==="object"&&!Array.isArray(body.counts)?body.counts:{};
  const normalized=Object.fromEntries(CODES.map((code)=>[code,Number(counts[code]||0)]));
  if(Object.keys(counts).some((code)=>!CODE_SET.has(code))) fail("Unexpected Production domain count key",counts);
  if(JSON.stringify(normalized)!==JSON.stringify(derived)) fail("Production domain count/row drift",{counts:normalized,derived});
  if(Object.values(normalized).reduce((sum,value)=>sum+value,0)!==assigned) fail("Production domain counts do not sum to assigned",{assigned,counts:normalized});

  console.log(JSON.stringify({
    marker:"ATLAS_PERSON_DOMAIN_V2_VERIFY",
    assigned,
    counts:normalized,
    legacy_knowledge:0,
    canonical_codes:CODES.length
  }));
}

main().catch((error)=>{console.error(error.message);if(error.details!=null)console.error(JSON.stringify(error.details));process.exit(1);});
