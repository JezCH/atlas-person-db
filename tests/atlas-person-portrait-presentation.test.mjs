import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
const domainSource=fs.readFileSync(new URL("../atlas-person-domain-registry.js",import.meta.url),"utf8");
const presentationSource=fs.readFileSync(new URL("../atlas-person-portrait-presentation.js",import.meta.url),"utf8");
const mainSource=fs.readFileSync(new URL("../atlas-person-main.js",import.meta.url),"utf8");
function load(){const c=vm.createContext({globalThis:null,window:null});c.globalThis=c;c.window=c;vm.runInContext(domainSource,c);vm.runInContext(presentationSource,c);return c.ATLAS_PERSON_PORTRAIT_PRESENTATION;}
test("portrait presentation derives only the domain background",()=>{const row=load().presentationFor({first_activity_year:1592},"military");assert.equal(row.domain_code,"military");assert.equal(row.background_url,"./portrait-assets/backgrounds/military.png");assert.equal("frame_url" in row,false);assert.equal("era_code" in row,false);});
test("missing domain stays explicit",()=>{const row=load().presentationFor({},null);assert.equal(row.domain_code,null);assert.equal(row.background_url,null);});
test("person detail consumes representative-domain mapping without duplicate portrait taxonomy",()=>{assert.match(mainSource,/portraitPresentation\.presentationFor\(person, personDomainsById\?\.\[person\?\.id\]\)/);assert.doesNotMatch(mainSource,/person\.portrait_era|person\.portrait_domain/);});
