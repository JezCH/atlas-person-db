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


test("REVIEW-M4 uses one five-card registration row and prevents YouTube signal horizontal overflow on mobile", () => {
  const css = read("atlas-registration-review.css");
  const js = read("atlas-registration-review.js");

  assert.match(css, /REVIEW-M4 — Registration Review density and responsive signal table/);
  assert.match(css, /\.registration-review-stats\{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(css, /registration-review-stats-compact/);
  assert.match(css, /\.registration-review-signal-wrap\{[^}]*width:min\(100%,980px\)[^}]*overflow:hidden/);
  assert.match(css, /\.registration-review-signal-table\{[^}]*min-width:0[^}]*table-layout:fixed/);
  assert.match(css, /@media\(max-width:600px\)\{[\s\S]*\.registration-review-signal-table tbody tr\{[^}]*grid-template-columns:38px minmax\(0,1fr\) 46px 42px/);
  assert.match(css, /\.registration-review-signal-table colgroup,[\s\S]*\.registration-review-signal-table thead\{display:none\}/);

  assert.match(js, /statCard\(number\(pending\),"등록대기열","현재 미등록 후보"\)/);
  assert.doesNotMatch(js, /registration-review-queue-summary/);
  assert.match(js, /registration-review-table registration-review-signal-table/);
  assert.match(js, /data-label="채널"/);
  assert.match(js, /data-label="영상"/);
});


test("REVIEW-M5 preserves every registration-review field across responsive breakpoints", () => {
  const css = read("atlas-registration-review.css");
  const js = read("atlas-registration-review.js");

  assert.match(css, /REVIEW-M5 — Responsive information invariant/);
  assert.match(css, /@media\(max-width:1100px\)\{[\s\S]*\.registration-review-stats\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
  assert.match(css, /@media\(max-width:700px\)\{[\s\S]*\.registration-review-stats\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(css, /@media\(max-width:420px\)\{[\s\S]*\.registration-review-stats\{grid-template-columns:1fr\}/);

  assert.match(css, /\.registration-review-signal-table thead tr,[\s\S]*grid-template-columns:56px minmax\(260px,460px\) 120px 90px/);
  assert.match(css, /\.registration-review-queue-table td\{[\s\S]*grid-template-columns:minmax\(82px,30%\) minmax\(0,1fr\)/);
  assert.doesNotMatch(css, /\.registration-review-queue-table td\{[^}]*display:none/);

  for (const label of ["이름","대표 분야","우선순위","검토 상태","출처","갱신"]) {
    assert.match(js, new RegExp(`data-label="${label}"`));
  }
  assert.match(js, /registration-review-table-wrap registration-review-queue-wrap/);
});


test("REVIEW-M6 removes the duplicate local page header without losing refresh/status controls", () => {
  const css = read("atlas-registration-review.css");
  const js = read("atlas-registration-review.js");

  assert.match(css, /REVIEW-M6 — Remove duplicated local page heading while preserving live controls/);
  assert.match(css, /\.registration-review-overview-head\{align-items:center\}/);
  assert.match(css, /@media\(max-width:600px\)\{[\s\S]*\.registration-review-overview-head\{align-items:flex-start;flex-direction:column\}/);

  assert.doesNotMatch(js, /<header class="registration-review-head">/);
  assert.doesNotMatch(js, /<h2>등록검토<\/h2>/);
  assert.match(js, /registration-review-section-head registration-review-overview-head/);
  assert.match(js, /id="registrationReviewStatus"/);
  assert.match(js, /id="registrationReviewRefresh"/);
});


test("REVIEW-M7 keeps the YouTube cumulative controls",()=>{
  const css=read("atlas-registration-review.css");
  const js=read("atlas-registration-review.js");
  for(const id of ["youtubeSignalThresholds","youtubeSignalTelemetry","youtubeSignalVisibleCount"])
    assert.ok(js.includes(id));
  assert.ok(js.includes("snapshot.channel_count"));
  assert.ok(js.includes("snapshot.video_count"));
  assert.match(css,/REVIEW-M7/);
});

test("REVIEW-M8 visualizes YouTube signal strength with bars while preserving all numeric fields", () => {
  const css = read("atlas-registration-review.css");
  const js = read("atlas-registration-review.js");

  assert.match(css, /REVIEW-M8 — Ranked YouTube signal bars/);
  assert.match(css, /\.registration-review-signal-table tbody\{[\s\S]*display:grid[\s\S]*gap:7px/);
  assert.match(css, /\.registration-review-signal-bar\{[\s\S]*grid-column:2 \/ 5[\s\S]*background:#0f1215/);
  assert.match(css, /\.registration-review-signal-bar span\{[\s\S]*width:var\(--signal-strength,0%\)[\s\S]*background:var\(--atlas-honor-metal\)/);
  assert.match(css, /@media\(max-width:600px\)\{[\s\S]*\.registration-review-signal-bar\{[\s\S]*grid-column:2 \/ 5/);

  assert.match(js, /const maxChannels=Math\.max\(1,\.\.\.signalRows\.map/);
  assert.match(js, /const strength=Math\.min\(100,\(channels\/maxChannels\)\*100\)/);
  assert.match(js, /class="registration-review-signal-row" style="--signal-strength:/);
  assert.match(js, /class="registration-review-signal-bar" aria-hidden="true"/);

  assert.match(js, /data-label="순위"/);
  assert.match(js, /data-label="인물"/);
  assert.match(js, /data-label="채널"/);
  assert.match(js, /data-label="영상"/);
});


test("REVIEW-M9 uses one exact cumulative channel ranking and a non-overlapping toolbar",()=>{
 const js=read("atlas-registration-review.js");
 const css=read("atlas-registration-review.css");
 assert.ok(js.includes("Channel ID 기반 누적 데이터"));
 assert.ok(js.includes("source_state?.next_batch"));
 assert.ok(!js.includes("cross_segment_bounds"));
 assert.ok(!js.includes("channel_count_upper_bound"));
 assert.ok(css.includes(".registration-review-signal-toolbar{display:grid"));
 assert.ok(css.includes("white-space:normal;overflow-wrap:anywhere"));
});
