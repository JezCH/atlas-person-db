import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { validateHumanAuthoringOrigin } from "../scripts/person-domain-authoring-origin.mjs";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const base = Object.freeze({
  person_id:"e762da53-76d6-425f-9baa-ca23735f6bb7",
  canonical_name_en:"Asaṅga",
  preferred_name_ko:"아상가",
  representative_domain:"culture",
  previous_representative_domain:"knowledge",
  supersedes_origin:"human_authoring",
  supersedes_source:"authoring/requests/philosophy-canon-20260928-asanga.json",
  supersedes_request_id:"authoring:philosophy-canon-20260928:asanga:gupta:v1"
});

test("Human Authoring origin validates an approved exact request", () => {
  const result = validateHumanAuthoringOrigin({ root, entry:base });
  assert.equal(result.source, base.supersedes_source);
  assert.equal(result.request_id, base.supersedes_request_id);
  assert.equal(result.previous_representative_domain, "knowledge");
});

test("Human Authoring origin rejects fabricated or mismatched provenance", () => {
  assert.throws(
    () => validateHumanAuthoringOrigin({ root, entry:{ ...base, supersedes_request_id:"authoring:wrong" } }),
    /REQUEST_ID_MISMATCH/
  );
  assert.throws(
    () => validateHumanAuthoringOrigin({ root, entry:{ ...base, canonical_name_en:"Different Person" } }),
    /CANONICAL_NAME_MISMATCH/
  );
  assert.throws(
    () => validateHumanAuthoringOrigin({ root, entry:{ ...base, previous_representative_domain:"culture" } }),
    /DOMAIN_MISMATCH/
  );
  assert.throws(
    () => validateHumanAuthoringOrigin({ root, entry:{ ...base, supersedes_source:"../outside.json" } }),
    /SOURCE_INVALID/
  );
});
