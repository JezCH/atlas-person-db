import test from "node:test";
import assert from "node:assert/strict";
import { parseNamuWikiCommand } from "../scripts/parse-namuwiki-command.mjs";

const A = "343c16d7-e1f2-5e1a-81a8-df27723da0dd";
const B = "1b1d39b4-42ee-55bb-a371-dd49df885ed2";
const URL = "https://namu.wiki/w/%EC%BF%A0%ED%8E%98";
const OLD_URL = "https://namu.wiki/w/%EC%98%A4%EB%9E%98%EB%90%9C%20%EB%AC%B8%EC%84%9C";

test("single NamuWiki commands remain backward compatible", () => {
  assert.deepEqual(parseNamuWikiCommand(`/namuwiki-link ${A} ${URL}`), [
    { person_id:A, status:"linked", url:URL }
  ]);
  assert.deepEqual(parseNamuWikiCommand(`/namuwiki-correct ${A} ${OLD_URL} ${URL}`), [
    { person_id:A, status:"linked", url:URL, expected_current_url:OLD_URL }
  ]);
  assert.deepEqual(parseNamuWikiCommand(`/namuwiki-not-found ${A}`), [
    { person_id:A, status:"not_found", url:null }
  ]);
  assert.deepEqual(parseNamuWikiCommand(`/namuwiki-not-found ${A} no_exact_document`), [
    { person_id:A, status:"not_found", url:null, review_reason:"no_exact_document" }
  ]);
  assert.deepEqual(parseNamuWikiCommand(`/namuwiki-not-found-correct ${A} ${OLD_URL} related_or_derivative_only`), [
    { person_id:A, status:"not_found", url:null, expected_current_url:OLD_URL, review_reason:"related_or_derivative_only" }
  ]);
});

test("batch command parses mixed operations in order", () => {
  assert.deepEqual(parseNamuWikiCommand(`/namuwiki-batch\nlink ${A.toUpperCase()} ${URL}\nnot_found ${B}`), [
    { person_id:A, status:"linked", url:URL },
    { person_id:B, status:"not_found", url:null }
  ]);
  assert.deepEqual(parseNamuWikiCommand(`/namuwiki-batch\nnot_found_correct ${A} ${OLD_URL} no_exact_document`), [
    { person_id:A, status:"not_found", url:null, expected_current_url:OLD_URL, review_reason:"no_exact_document" }
  ]);
});

test("batch command rejects malformed, duplicate, and oversized input before writes", () => {
  assert.throws(() => parseNamuWikiCommand(`/namuwiki-batch\nlink ${A} https://example.com/x`), /Invalid canonical NamuWiki URL/);
  assert.throws(() => parseNamuWikiCommand(`/namuwiki-correct ${A} ${URL} ${URL}`), /must change/);
  assert.throws(() => parseNamuWikiCommand(`/namuwiki-batch\nnot_found ${A}\nnot_found ${A}`), /Duplicate person UUID/);
  assert.throws(() => parseNamuWikiCommand(`/namuwiki-not-found ${A} invented_reason`), /Invalid NamuWiki review reason/);
  assert.throws(() => parseNamuWikiCommand(`/namuwiki-not-found-correct ${A} https://example.com/x no_exact_document`), /Invalid expected current NamuWiki URL/);
  assert.throws(() => parseNamuWikiCommand(`/namuwiki-not-found-correct ${A} ${OLD_URL} invented_reason`), /Invalid NamuWiki review reason/);
  const rows = Array.from({ length:26 }, (_, index) => {
    const suffix = index.toString(16).padStart(12, "0");
    return `not_found 00000000-0000-4000-8000-${suffix}`;
  });
  assert.throws(() => parseNamuWikiCommand(`/namuwiki-batch\n${rows.join("\n")}`), /exceeds maximum size 25/);
});
