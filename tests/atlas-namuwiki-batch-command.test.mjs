import test from "node:test";
import assert from "node:assert/strict";
import { parseNamuWikiCommand } from "../scripts/parse-namuwiki-command.mjs";

const A = "343c16d7-e1f2-5e1a-81a8-df27723da0dd";
const B = "1b1d39b4-42ee-55bb-a371-dd49df885ed2";
const URL = "https://namu.wiki/w/%EC%BF%A0%ED%8E%98";

test("single NamuWiki commands remain backward compatible", () => {
  assert.deepEqual(parseNamuWikiCommand(`/namuwiki-link ${A} ${URL}`), [
    { person_id:A, status:"linked", url:URL }
  ]);
  assert.deepEqual(parseNamuWikiCommand(`/namuwiki-not-found ${A}`), [
    { person_id:A, status:"not_found", url:null }
  ]);
});

test("batch command parses mixed operations in order", () => {
  assert.deepEqual(parseNamuWikiCommand(`/namuwiki-batch\nlink ${A.toUpperCase()} ${URL}\nnot_found ${B}`), [
    { person_id:A, status:"linked", url:URL },
    { person_id:B, status:"not_found", url:null }
  ]);
});

test("batch command rejects malformed, duplicate, and oversized input before writes", () => {
  assert.throws(() => parseNamuWikiCommand(`/namuwiki-batch\nlink ${A} https://example.com/x`), /Invalid canonical NamuWiki URL/);
  assert.throws(() => parseNamuWikiCommand(`/namuwiki-batch\nnot_found ${A}\nnot_found ${A}`), /Duplicate person UUID/);
  const rows = Array.from({ length:26 }, (_, index) => {
    const suffix = index.toString(16).padStart(12, "0");
    return `not_found 00000000-0000-4000-8000-${suffix}`;
  });
  assert.throws(() => parseNamuWikiCommand(`/namuwiki-batch\n${rows.join("\n")}`), /exceeds maximum size 25/);
});
