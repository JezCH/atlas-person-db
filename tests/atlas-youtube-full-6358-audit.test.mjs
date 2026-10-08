import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";

const require=createRequire(import.meta.url);
const {REVIEWED_REGISTRATION_ALIASES}=require("../server/atlas-reviewed-person-registration-aliases.js");
const {REVIEWED_LIVING_NAMES,reviewedLivingStatus}=require("../atlas-youtube-reviewed-living-people.js");
const prefix=new URL("../audits/",import.meta.url);
const rawPath=new URL("youtube-full-6358-raw-signals-20261009.csv",prefix);
const reviewPath=new URL("youtube-6358-registration-living-screen-20261009.csv",prefix);
const parse=(path,pattern)=>{
  const lines=fs.readFileSync(path,"utf8").trim().split("\n").slice(1);
  return lines.map(line=>{
    const found=line.match(pattern);
    assert.ok(found,"Unparseable row: "+line.slice(0,100));
    return found;
  });
};
const rawRe=/^(\d+),"((?:[^"]|"")*)",(\d+),(\d+)$/;
const reviewedRe=/^"(\d+)","((?:[^"]|"")*)","(\d+)","(\d+)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"$/;
const unpack=v=>v.replaceAll('""','"');

test("full unregistered-nonliving review covers every immutable source signal exactly once",()=>{
  const raw=parse(rawPath,rawRe),rows=parse(reviewPath,reviewedRe);
  assert.equal(raw.length,6358);
  assert.equal(rows.length,6358);
  for(let index=0;index<rows.length;index++){
    assert.equal(Number(raw[index][1]),index+1);
    assert.equal(Number(rows[index][1]),index+1);
    assert.equal(unpack(raw[index][2]),unpack(rows[index][2]));
    assert.equal(Number(raw[index][3]),Number(rows[index][3]));
    assert.equal(Number(raw[index][4]),Number(rows[index][4]));
  }
  const count=lane=>rows.filter(item=>item[5]===lane).length;
  assert.equal(count("REGISTERED"),642);
  assert.equal(count("REVIEWED_LIVING"),59);
  assert.equal(count("NEEDS_REVIEW"),5657);
  assert.equal(rows.filter(row=>row[5]==="NEEDS_REVIEW"&&Number(row[3])>=10).length,165);
});

test("reconciled names show Person IDs, reviewed living evidence and safe unresolved exceptions",()=>{
  const rows=parse(reviewPath,reviewedRe);
  const lookup=new Map(rows.map(row=>[unpack(row[2]),row]));
  for(const name of ["Mussolini","Galileo","JFK","Churchill","Prophet Muhammad","Kafka","Bismarck",
    "Rasputin","Buddha","Sun Tzu"]){
    assert.equal(lookup.get(name)?.[5],"REGISTERED",name);
    assert.match(lookup.get(name)?.[6]||"",/^[a-f0-9]{8}-/);
  }
  for(const name of ["Warren Buffett","King Charles III","Pope Leo XIV"]){
    assert.equal(lookup.get(name)?.[5],"REVIEWED_LIVING",name);
    assert.equal(reviewedLivingStatus(name,Date.parse("2026-10-09T00:00:00Z"))?.status,"living_likely");
  }
  for(const name of ["Paris","Alexandria","the Habsburgs","Bonnie and Clyde","Metamorphosis",
    "Yugoslavia","Sparta","Minecraft","Chopin","Dostoevsky","Dolly Parton"]){
    assert.equal(lookup.get(name)?.[5],"NEEDS_REVIEW",name);
  }
  assert.ok(REVIEWED_REGISTRATION_ALIASES.length>=83);
  assert.ok(REVIEWED_LIVING_NAMES.length>=62);
});
