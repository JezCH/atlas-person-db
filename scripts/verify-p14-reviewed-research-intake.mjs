import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const { normalizeReviewedResearchArtifact }=require("../server/atlas-p14-reviewed-research-intake.js");

const root=path.resolve(new URL("..",import.meta.url).pathname);
const intakeDir=path.join(root,"research","p14","intake");
const explicit=process.argv.slice(2);
const files=explicit.length
  ? explicit.map((item)=>path.resolve(root,item))
  : (fs.existsSync(intakeDir)
      ? fs.readdirSync(intakeDir).filter((name)=>name.endsWith(".json")).sort().map((name)=>path.join(intakeDir,name))
      : []);

let approved=0,hold=0,rejected=0;
for(const file of files){
  const raw=JSON.parse(fs.readFileSync(file,"utf8"));
  const normalized=normalizeReviewedResearchArtifact(raw);
  approved+=normalized.approved_count;
  hold+=normalized.hold_count;
  rejected+=normalized.rejected_count;
}
console.log(JSON.stringify({
  marker:"ATLAS_P14_REVIEWED_RESEARCH_INTAKE_OK",
  artifacts:files.length,
  approved,
  hold,
  rejected,
  production_mutation_authorized:false
},null,2));
