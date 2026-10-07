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
  assert.match(css, /\.registration-review-thresholds button\.is-active\{[^}]*border-color:var\(--atlas-honor-metal\)[^}]*color:#e7dfcf/);
  assert.match(css, /\.registration-review-table tbody tr:hover td\{background:var\(--atlas-material-wash-hover\)\}/);
});


test("REVIEW-M2 uses the shared hover / active / selected luminance scale for thresholds", () => {
  const css = read("atlas-registration-review.css");

  assert.match(css, /REVIEW-M2 — Threshold interaction luminance/);
  assert.match(css, /\.registration-review-thresholds button\{[^}]*--registration-review-threshold-fill:#171b1f[^}]*background:var\(--registration-review-threshold-fill\)/);
  assert.match(css, /button:active:not\(\.is-active\)\{[^}]*var\(--atlas-material-wash-active\)[^}]*var\(--registration-review-threshold-fill\)/);
  assert.match(css, /button\.is-active\{[^}]*border-color:var\(--atlas-honor-metal\)[^}]*var\(--atlas-material-wash-selected\)[^}]*var\(--registration-review-threshold-fill\)/);
  assert.match(css, /@media\(hover:hover\)\{\.registration-review-thresholds button:hover:not\(\.is-active\)\{[^}]*var\(--atlas-material-wash-hover\)[^}]*var\(--registration-review-threshold-fill\)/);

  assert.doesNotMatch(css, /\.registration-review-thresholds button:hover\{background:#20262b/);
  assert.doesNotMatch(css, /\.registration-review-thresholds button\.is-active\{[^}]*background:rgba\(192,174,136,\.08\)/);
  assert.match(css, /\.registration-review-table tbody tr:hover td\{background:var\(--atlas-material-wash-hover\)\}/);
});


test("REVIEW-M3 gives Registration Review controls the shared focus language", () => {
  const css = read("atlas-registration-review.css");

  assert.match(css, /REVIEW-M3 — Registration Review focus language/);
  assert.match(css, /\.registration-review-thresholds button:focus-visible\{outline:1px solid var\(--atlas-focus-ring\);outline-offset:2px\}/);
  assert.match(css, /\.registration-review-queue-head input:focus\{[^}]*border-color:var\(--atlas-material-hairline-strong\)[^}]*outline:1px solid var\(--atlas-focus-ring\)[^}]*outline-offset:2px[^}]*box-shadow:none/);

  assert.match(css, /REVIEW-M2 — Threshold interaction luminance/);
  assert.match(css, /\.registration-review-table tbody tr:hover td\{background:var\(--atlas-material-wash-hover\)\}/);
  assert.doesNotMatch(css, /\.registration-review-thresholds button:focus-visible\{[^}]*rgba\(/);
  assert.doesNotMatch(css, /\.registration-review-queue-head input:focus\{[^}]*rgba\(/);
});
