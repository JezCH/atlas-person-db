import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("UI V10 keeps Person operational surfaces dark on desktop", () => {
  const status = read("status-summary.js");
  const era = read("atlas-person-era-navigation.css");

  assert.match(status, /\.registration-summary\{[^\n]*background:#15191c/);
  assert.match(status, /\.registration-summary-link\{[^\n]*background:#171c20/);
  assert.match(status, /\.registration-summary-link:hover\{[^\n]*background:#1b2024/);

  assert.match(era, /\.person-era-navigator\{[^\n]*background:rgba\(18,21,24,\.96\)/);
  assert.match(era, /\.person-era-search\{[^\n]*background:#111518/);
  assert.match(era, /\.person-era-jump\{[^\n]*background:#15191c/);
  assert.match(era, /\.person-domain-filter\{[^\n]*background:#15191c/);
  assert.match(era, /\.person-domain-filter\.is-active\{[^\n]*background:#1a1f22/);
});

test("UI V10 cache-busts the final dark-surface assets", () => {
  const html = read("index.html");
  assert.match(html, /atlas-person-era-navigation\.css\?v=20261004-ui-v10-dark-surfaces-v1/);
  assert.match(html, /status-summary\.js\?v=20261004-ui-v10-dark-surfaces-v1/);
});

test("UI V10 Production verifier rejects bright Person regressions", () => {
  const verifier = read("scripts/verify-ui-v10-production-visual.mjs");
  assert.match(verifier, /registrationSurface/);
  assert.match(verifier, /rgb\(21, 25, 28\)/);
  assert.match(verifier, /eraNavigatorSurface/);
  assert.match(verifier, /rgba\(18, 21, 24, 0\.96\)/);
  assert.match(verifier, /eraSearchSurface/);
  assert.match(verifier, /rgb\(17, 21, 24\)/);
  assert.match(verifier, /regressed to a bright surface/);
});

test("UI V10 exact-SHA parity and workflow include the corrected Person surfaces", () => {
  const exact = read("scripts/verify-spacetime-production-exact-sha.mjs");
  const workflow = read(".github/workflows/atlas-spacetime-production-visual.yml");
  for (const asset of ["status-summary.js", "atlas-person-era-navigation.css"]) {
    assert.ok(exact.includes(`"${asset}"`), `exact-SHA verifier missing ${asset}`);
    assert.ok(workflow.includes(`- "${asset}"`), `visual workflow path filter missing ${asset}`);
  }
});

test("UI V10 does not alter the mobile hierarchy layer", () => {
  const html = read("index.html");
  const era = html.indexOf("atlas-person-era-navigation.css?v=20261004-ui-v10-dark-surfaces-v1");
  const mobile = html.indexOf("atlas-ui-mobile-v8.css?v=20261004-ui-p4-mobile-compact-v1");
  const motion = html.indexOf("atlas-ui-motion-material-v9.css?v=20261007-controls-m2-luminance-v1");
  assert.ok(era >= 0);
  assert.ok(mobile > era);
  assert.ok(motion > mobile);
});
