import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  normalizeNamuWikiInput,
  shouldBlockExternalReferenceOverwrite
} = require("../server/atlas-person-profile-service.js");
const {
  requireNamuWikiLinkPayload
} = require("../server/atlas-namuwiki-link-handler.js");

const PERSON_ID = "343c16d7-e1f2-5e1a-81a8-df27723da0dd";
const RUNTIME_SHA = "a".repeat(40);
const WORKFLOW_SHA = "b".repeat(40);
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

test("NamuWiki handler payload accepts exact not_found contract", () => {
  const payload = requireNamuWikiLinkPayload({
    runtime_sha:RUNTIME_SHA,
    workflow_sha:WORKFLOW_SHA,
    person_id:PERSON_ID,
    status:"not_found"
  });
  assert.equal(payload.personId, PERSON_ID);
  assert.deepEqual(payload.externalReference, {
    provider:"namuwiki",
    status:"not_found",
    document_title:null,
    url:null
  });
});

test("NamuWiki handler keeps linked default and rejects URL on not_found", () => {
  const linked = requireNamuWikiLinkPayload({
    runtime_sha:RUNTIME_SHA,
    workflow_sha:WORKFLOW_SHA,
    person_id:PERSON_ID,
    url:LINKED_URL
  });
  assert.equal(linked.externalReference.status, "linked");
  assert.equal(linked.externalReference.url, LINKED_URL);

  assert.throws(
    () => requireNamuWikiLinkPayload({
      runtime_sha:RUNTIME_SHA,
      workflow_sha:WORKFLOW_SHA,
      person_id:PERSON_ID,
      status:"not_found",
      url:LINKED_URL
    }),
    /NAMUWIKI_NOT_FOUND_URL_FORBIDDEN/
  );
});