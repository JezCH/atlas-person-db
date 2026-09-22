import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const main=fs.readFileSync(new URL("../atlas-person-main.js",import.meta.url),"utf8");
const imageModule=fs.readFileSync(new URL("../atlas-person-portrait-image.js",import.meta.url),"utf8");

test("portrait image pipeline is absent from initial HTML and loaded only on first conversion",()=>{
  assert.doesNotMatch(html,/atlas-person-portrait-image\.js/);
  assert.match(main,/const PERSON_PORTRAIT_IMAGE_SCRIPT_URL = "\.\/atlas-person-portrait-image\.js\?v=20260922-image-pipeline-v1"/);
  assert.match(main,/function ensurePortraitImageModule\(\)/);
  assert.match(main,/if \(personPortraitImageModulePromise\) return personPortraitImageModulePromise/);
  assert.match(main,/script\.dataset\.atlasPersonPortraitImage = "true"/);
  assert.match(main,/personPortraitImageModulePromise = null/);
  assert.match(main,/script\?\.remove\?\.\(\)/);

  const loaderStart=main.indexOf("function ensurePortraitImageModule()");
  const wrapperStart=main.indexOf("async function portraitFileToWebpBase64",loaderStart);
  const loader=main.slice(loaderStart,wrapperStart);
  assert.ok(loader.indexOf('script.addEventListener("load"') < loader.indexOf("document.head.append(script)"));
});

test("Person Main keeps the public converter API as a thin lazy wrapper",()=>{
  const start=main.indexOf("async function portraitFileToWebpBase64");
  const end=main.indexOf("function preservedPortraitSources",start);
  const block=main.slice(start,end);
  assert.match(block,/const converter = await ensurePortraitImageModule\(\)/);
  assert.match(block,/return converter\.portraitFileToWebpBase64\(file\)/);
  assert.doesNotMatch(block,/createElement\("canvas"\)|canvas\.toBlob|arrayBuffer\(\)|PORTRAIT_OUTPUT_MAX_BYTES/);
  assert.match(main,/window\.ATLAS_PERSON_MAIN = Object\.freeze\([\s\S]*portraitFileToWebpBase64/);
});

test("extracted portrait image module owns exact upload and output limits",()=>{
  assert.match(imageModule,/PORTRAIT_SOURCE_MAX_BYTES = 20 \* 1024 \* 1024/);
  assert.match(imageModule,/PORTRAIT_OUTPUT_MAX_BYTES = 3 \* 1024 \* 1024/);
  assert.match(imageModule,/PORTRAIT_MAX_SIDE = 1600/);
  assert.match(imageModule,/String\(file\.type \|\| ""\)\.startsWith\("image\/"\)/);
  assert.match(imageModule,/const qualities = \[0\.9, 0\.78, 0\.66\]/);
  assert.match(imageModule,/for \(let pass = 0; pass < 4; pass \+= 1\)/);
  assert.match(imageModule,/scale \*= 0\.8/);
  assert.match(imageModule,/blob\.size <= PORTRAIT_OUTPUT_MAX_BYTES/);
});

test("portrait image object URLs are released on both decode failure and successful conversion cleanup",()=>{
  assert.match(imageModule,/image\.onerror = \(\) => \{[\s\S]*URL\.revokeObjectURL\(objectUrl\)/);
  assert.match(imageModule,/finally \{\s*loaded\.release\(\);\s*\}/);
});

test("WebP and Base64 mechanics live only in the extracted image pipeline",()=>{
  assert.match(imageModule,/canvas\.toBlob/);
  assert.match(imageModule,/"image\/webp"/);
  assert.match(imageModule,/new Uint8Array\(await blob\.arrayBuffer\(\)\)/);
  assert.match(imageModule,/return btoa\(binary\)/);
  assert.doesNotMatch(main,/canvas\.toBlob|new Uint8Array\(await blob\.arrayBuffer\(\)\)|PORTRAIT_SOURCE_MAX_BYTES|PORTRAIT_OUTPUT_MAX_BYTES|PORTRAIT_MAX_SIDE/);
});
