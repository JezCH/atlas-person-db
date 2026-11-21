import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const validate = fileURLToPath(new URL("../scripts/validate-authoring-request-files.mjs", import.meta.url));
const sharedSource = {
  canonical_url:"https://example.invalid/fermat",
  source_type:"academic_reference",
  title:"Historical biography",
  citation_text:"Biographical profile of the mathematician"
};

function request(year, source) {
  return {
    schema:"atlas-human-authoring/v1",
    request_id:`fermat-${year}`,
    review_status:"approved",
    person:{canonical_name_en:"Pierre de Fermat",life_status:"deceased",life_status_checked_at:"2026-11-21",life_status_basis:"documented_death"},
    polity:{canonical_name_en:"France"},
    activity:{
      relation_type:"active_in",period_basis:"intellectual_activity",
      start_year:year,start_certainty:"exact",
      end_year:year,end_certainty:"exact",
      confidence:"well_established"
    },
    sources:[source],
    external_references:{namuwiki:{status:"not_found",checked_at:"2026-11-21",review_reason:"no_exact_document"}}
  };
}

function validateBatch(t, secondSource) {
  const dir = mkdtempSync(join(tmpdir(), "atlas-authoring-source-parity-"));
  t.after(() => rmSync(dir,{recursive:true,force:true}));
  mkdirSync(join(dir,"authoring","requests"),{recursive:true});
  const files=["authoring/requests/fermat-1640.json","authoring/requests/fermat-1654.json"];
  for (const [i, manifest] of [request(1640,{...sharedSource,locator:"Section one"}),request(1654,secondSource)].entries()) {
    writeFileSync(join(dir,files[i]),JSON.stringify(manifest));
  }
  return spawnSync(process.execPath,[validate,...files],{cwd:dir,encoding:"utf8"});
}

test("batch validation blocks conflicting citation assertions on the same canonical URL", (t) => {
  const result = validateBatch(t,{...sharedSource,
    canonical_url:"https://EXAMPLE.invalid/fermat#probability",
    citation_text:"The 1654 letters founded mathematical probability"
  });
  assert.equal(result.status,1,result.stdout+result.stderr);
  assert.match(result.stderr,/SOURCE_CANONICAL_URL_ASSERTION_COLLISION_REVIEW_REQUIRED/);
  assert.match(result.stderr,/fermat-1654\.json.*fermat-1640\.json/);
});

test("batch validation allows exact source reuse with different Activity locators", (t) => {
  const result = validateBatch(t,{...sharedSource,
    canonical_url:"https://EXAMPLE.invalid/fermat#probability",locator:"Section two"
  });
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/Validated 2 authoring request files/);
});

test("batch validation leaves existing Source UUID locators to live validation", (t) => {
  const result = validateBatch(t,{
    source_id:"15236151-3a4c-4e08-acab-bbf0f51f96eb",locator:"Section two"
  });
  assert.equal(result.status,0,result.stderr);
});

