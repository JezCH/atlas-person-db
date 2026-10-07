import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("REVIEW-M1 uses the shared structural hairline scale without changing semantic states", () => {
  const css = read("atlas-registration-review.css");

  assert.match(css, /REVIEW-M1 — Registration Review material normalization/);
  assert.match(css, /\.registration-review-head,\.registration-review-section\{border:1px solid var\(--atlas-material-hairline\)/);
  assert.match(css, /\.registration-review-stats\{[^}]*border:1px solid var\(--atlas-material-hairline-soft\);background:var\(--atlas-material-hairline-soft\)/);
  assert.match(css, /\.registration-review-table-wrap\{[^}]*border:1px solid var\(--atlas-material-hairline-soft\)/);
  assert.match(css, /\.registration-review-table th\{[^}]*border-bottom:1px solid var\(--atlas-material-hairline\)/);
  assert.match(css, /\.registration-review-table td\{[^}]*border-bottom:1px solid var\(--atlas-material-hairline-soft\)/);

  assert.match(css, /\.registration-review-head-actions>span\[data-state="ready"\]\{color:var\(--atlas-success\)\}/);
  assert.match(css, /\.registration-review-head-actions>span\[data-state="error"\]\{color:var\(--atlas-danger\)\}/);
  assert.match(css, /\.registration-review-thresholds button\.is-active\{[^}]*border-color:var\(--atlas-honor-metal\)[^}]*background:rgba\(192,174,136,\.08\)/);
  assert.match(css, /\.registration-review-table tbody tr:hover td\{background:var\(--atlas-material-wash-hover\)\}/);
});
