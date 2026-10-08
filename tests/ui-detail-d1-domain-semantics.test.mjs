import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const detail = read("atlas-person-chronicle-detail.css");
const registry = read("atlas-person-domain-registry.js");
const html = read("index.html");

const CODES = [
  "governance",
  "military",
  "science",
  "technology",
  "commerce",
  "culture",
  "religion",
  "exploration"
];

test("Detail D1 maps every canonical Domain v2 code and no legacy knowledge code", () => {
  for (const code of CODES) {
    assert.match(registry, new RegExp(`code:"${code}"`));
    assert.match(detail, new RegExp(`data-representative-domain="${code}"`));
  }
  assert.doesNotMatch(detail, /data-representative-domain="knowledge"/);
});

test("Detail D1 keeps domain surface semantic area weak and uses readable on-dark accents", () => {
  const washes = [
    /governance"[\s\S]*?rgba\(212,175,55,\.045\)/,
    /military"[\s\S]*?rgba\(184,58,58,\.045\)/,
    /science"[\s\S]*?rgba\(63,120,197,\.045\)/,
    /technology"[\s\S]*?rgba\(89,99,109,\.05\)/,
    /commerce"[\s\S]*?rgba\(46,139,87,\.04\)/,
    /culture"[\s\S]*?rgba\(154,91,165,\.045\)/,
    /religion"[\s\S]*?rgba\(226,215,185,\.035\)/,
    /exploration"[\s\S]*?rgba\(217,107,30,\.04\)/
  ];
  for (const pattern of washes) assert.match(detail, pattern);

  for (const code of CODES) {
    assert.match(
      detail,
      new RegExp(`data-representative-domain="${code}"[\\s\\S]*?--person-detail-domain-accent: var\\(--atlas-person-domain-${code}-on-dark`)
    );
  }
});

test("Detail D1 uses the semantic accent only as a tiny hero marker", () => {
  assert.match(detail, /\.person-detail-domain::before \{[\s\S]*?width: 6px;[\s\S]*?height: 1px;[\s\S]*?background: var\(--person-detail-domain-accent\)/s);
  assert.match(detail, /radial-gradient\(circle at 18% 4%, var\(--person-detail-domain-wash\), transparent 25rem\)/);
  assert.doesNotMatch(detail, /background:\s*var\(--person-detail-domain-accent\);[\s\S]*?width:\s*100%/s);
});

test("Detail D1 keeps governance semantic gold separate from neutral honor metal", () => {
  assert.match(detail, /--person-detail-domain-accent: var\(--atlas-person-domain-governance-on-dark, #e6c65a\)/);
  assert.match(detail, /--person-detail-domain-accent: var\(--atlas-honor-metal, #aa9a79\)/);
});

test("Detail D1 publishes the superseding Chronicle Detail asset", () => {
  assert.match(html, /atlas-person-chronicle-detail\.css\?v=20261008-detail-m4-evidence-legibility-v1/);
});
