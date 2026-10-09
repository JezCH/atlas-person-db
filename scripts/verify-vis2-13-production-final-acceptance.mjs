import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";

/* VIS2-13 aggregates actual exact-SHA browser reports; this does not assert
 * visual acceptance until a person reviews the PNGs and signs the decision.
 */
const OUT=process.env.ATLAS_VISUAL_OUT_DIR||"artifacts/spacetime-visual-acceptance";
const SHA=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"");
const report={schema:"atlas-vis2-13-phase-ii-final-automatic-gate/v1",expected_sha:SHA,status:"PENDING",sources:[],screenshots:[],coverage:{},manual_visual_review:"REQUIRED"};
function ensure(ok,message,details){if(!ok){const e=new Error(message);e.details=details||null;throw e;}}
function data(filename){const name=path.join(OUT,filename);ensure(fs.existsSync(name),"Missing report "+filename);const x=JSON.parse(fs.readFileSync(name,"utf8"));report.sources.push({filename,status:x.status,expected_sha:x.expected_sha||x.expected_runtime_sha||null});return x;}
const required=[
 "exact-sha-parity.json",
 "visual-acceptance.json",
 "domain-color-acceptance.json",
 "polity-production-visual.json",
 "ui-p6-person-register-acceptance.json",
 "ui-v10-visual-acceptance.json",
 ...Array.from({length:12},(_,i)=>null).filter(Boolean),
 "vis2-01-production-material.json",
 "vis2-02-production-engraving.json",
 "vis2-03-production-typography.json",
 "vis2-04-production-ticks.json",
 "vis2-06-production-instrument.json",
 "vis2-07-production-register.json",
 "vis2-08-production-register-interaction.json",
 "vis2-09-production-detail-hero.json",
 "vis2-10-production-chronicle-source.json",
 "vis2-11-production-polity-dashboard.json",
 "vis2-12-production-interaction-motion.json",
 "vis2-13-keyboard-density.json"
];
function screenshot(name){
 ensure(typeof name==="string"&&name.endsWith(".png"),"Invalid screenshot path",{name});
 const f=path.join(OUT,name);
 ensure(fs.existsSync(f),"Missing required screenshot "+name);
 const bytes=fs.readFileSync(f);
 ensure(bytes.length>1500&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),"Invalid PNG "+name);
 report.screenshots.push({name,bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")});
}
function equalSha(d,file){const v=d.expected_sha||d.expected_runtime_sha; if(v)ensure(v===SHA,"Mismatched source SHA in "+file,{expected:SHA,actual:v});}
try{
 ensure(/^[a-f0-9]{40}$/.test(SHA),"Missing exact Production SHA");
 for(const file of required){
  const d=data(file);
  ensure(d.status==="PASS","Previously implemented acceptance gate not PASS",{file,status:d.status});
  equalSha(d,file);
  for(const image of d.screenshots||[])screenshot(image);
 }
 const baseline=data("vis2-00-baseline.json");
 ensure(baseline.status==="CAPTURED_PENDING_HUMAN_REVIEW","Baseline acceptance must require human review",{status:baseline.status});
 equalSha(baseline,"vis2-00-baseline.json");
 ensure((baseline.captures||[]).length>=29,"Missing Phase II Production screenshot matrix");
 for(const item of baseline.captures)screenshot(item.name);
 for(const width of [390,768,1440,1600]){
  const names=baseline.captures.filter(x=>x.width===width).map(x=>x.kind);
  for(const kind of ["person-main","polity","dashboard","spacetime"])ensure(names.includes(kind),"Missing screen/width core baseline",{width,kind});
 }
 const regionZooms=baseline.captures.filter(x=>x.kind==="spacetime"&&x.width===1600).map(x=>x.zoom);
 for(const zoom of ["500%","1000%","1500%"])ensure(regionZooms.filter(v=>v===zoom).length>=2,"Missing dual-region Spacetime zoom screenshots",{zoom});
 const watermark=data("vis2-05-watermark-ab.json");equalSha(watermark,"vis2-05-watermark-ab.json");
 ensure(watermark.production_candidate_shipped===false&&watermark.default==="REJECT","Rejected watermark is enabled or default has changed");
 ensure(watermark.status==="CAPTURED_PENDING_VISUAL_REJECTION_REVIEW","Watermark evidence state changed",{status:watermark.status});
 ensure((watermark.scenes||[]).length>=12,"Missing rejected watermark A/B capture scenarios");
 for(const image of watermark.screenshots||[])screenshot(image);
 const keyboard=data("vis2-13-keyboard-density.json"); // recorded above; here for coverage
 const expected=keyboard.cases||[];
 ensure(expected.length===16&&expected.every(x=>x.status==="PASS"&&x.keyboardFocusVisible),"Keyboard / density matrix incomplete");
 for(const physicalWidth of [390,1440])for(const domain of ["persons","polities","dashboard","spacetime"])
  ensure(expected.some(x=>x.physicalWidth===physicalWidth&&x.scale===1&&x.domain===domain),"Missing base keyboard case",{physicalWidth,domain});
 for(const scale of [1.25,1.5])for(const domain of ["persons","polities","dashboard","spacetime"])
  ensure(expected.some(x=>x.physicalWidth===1440&&x.scale===scale&&x.domain===domain),"Missing CSS-pixel density case",{scale,domain});
 ensure((data("vis2-04-production-ticks.json").cases||[]).some(x=>x.zoom==="1500%"),"Missing 1500% Spacetime regression");
 const allNames=new Set(fs.readdirSync(OUT).filter(x=>x.endsWith(".png")));
 report.coverage={baseline_captures:baseline.captures.length,all_pngs:allNames.size,validated_screenshot_mentions:report.screenshots.length,distinct_validated_pngs:new Set(report.screenshots.map(s=>s.name)).size,
  case_count_keyboard_density:expected.length,spacetime_zooms:["500%","1000%","1500%"],css_zoom_equivalent:[1,1.25,1.5],widths:[390,768,1440,1600],prior_gate_count:required.length};
 ensure(report.coverage.all_pngs>=180,"Unexpected visual evidence regression",{count:report.coverage.all_pngs});
 report.status="AUTO_GATES_PASS_PENDING_MANUAL_REVIEW";
 console.log("ATLAS_VIS2_13_FINAL_AUTO_GATES_PASS_PENDING_HUMAN_REVIEW",JSON.stringify(report.coverage));
}catch(e){report.status="FAIL";report.error=e.message;report.details=e.details||null;console.error("ATLAS_VIS2_13_FINAL_GATE_FAIL",e);process.exitCode=1;
}finally{fs.writeFileSync(path.join(OUT,"vis2-13-production-final-acceptance.json"),JSON.stringify(report,null,2)+"\n");}
