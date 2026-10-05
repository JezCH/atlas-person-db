import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  normalizeNamuWikiInput,
  shouldBlockExternalReferenceOverwrite
} = require("../server/atlas-person-profile-service.js");
const LINKED_URL = "https://namu.wiki/w/%EC%9C%8C%ED%94%84%EB%A6%AC%EB%93%9C%20%EB%A1%9C%EB%A6%AC%EC%97%90";

test("NamuWiki linked normalization remains backward compatible", () => {
  const linked = normalizeNamuWikiInput(LINKED_URL);
  assert.equal(linked.provider, "namuwiki");
  assert.equal(linked.status, "linked");
  assert.equal(linked.document_title, "윌프리드 로리에");
  assert.equal(linked.url, LINKED_URL);
});

test("NamuWiki not_found normalization enforces null document and URL", () => {
  const missing = normalizeNamuWikiInput({ status:"not_found", document_title:null, url:null });
  assert.deepEqual(missing, {
    provider:"namuwiki",
    status:"not_found",
    document_title:null,
    url:null
  });
  assert.throws(
    () => normalizeNamuWikiInput({ status:"not_found", url:LINKED_URL }),
    /PERSON_NAMUWIKI_NOT_FOUND_REFERENCE_MUST_BE_EMPTY/
  );
});

test("overwrite guard protects linked references but allows not_found upgrade", () => {
  const linked = normalizeNamuWikiInput(LINKED_URL);
  const missing = normalizeNamuWikiInput({ status:"not_found" });
  assert.equal(shouldBlockExternalReferenceOverwrite(linked, missing, { preventOverwrite:true }), true);
  assert.equal(shouldBlockExternalReferenceOverwrite(missing, linked, { preventOverwrite:true }), false);
});
