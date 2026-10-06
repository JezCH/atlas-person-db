import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("UI V11 loads Dashboard Monumental presentation after the canonical Dashboard CSS", () => {
  const nav = read("atlas-main-authority-nav.js");
  const base = nav.indexOf('appendStylesheetOnce("./atlas-dashboard.css?v=20261001-canonical-nontimeline-v1")');
  const v11 = nav.indexOf('appendStylesheetOnce("./atlas-dashboard-monumental-v11.css?v=20261004-dashboard-v11-r2")');
  assert.ok(base >= 0);
  assert.ok(v11 > base);
});

test("UI V11 removes bright SaaS card material from Dashboard hero, KPI, panels, and loading state", () => {
  const css = read("atlas-dashboard-monumental-v11.css");
  assert.match(css, /\.dashboard-control-center \.card \{/);
  assert.match(css, /var\(--dashboard-surface\)/);
  assert.match(css, /\.dashboard-hero \{/);
  assert.match(css, /border-left: 2px solid rgba\(192,174,136,\.68\)/);
  assert.match(css, /\.dashboard-kpi \{/);
  assert.match(css, /#171b1e !important/);
  assert.match(css, /\.dashboard-panel,/);
  assert.match(css, /\.dashboard-loading-grid span \{/);
  assert.match(css, /linear-gradient\(90deg,#15191c 0%,#1d2226 48%,#15191c 100%\)/);
  assert.doesNotMatch(css, /background:\s*#fff\b/i);
  assert.doesNotMatch(css, /background:\s*white\b/i);
  assert.match(css, /\.dashboard-namuwiki-legend-item \{[\s\S]*background: #15191c/);
  assert.match(css, /\.dashboard-polity-toolbar > div \{[\s\S]*background: #121619/);
});

test("UI V11 preserves semantic domain signals and uses the global honor metal for neutral selection", () => {
  const css = read("atlas-dashboard-monumental-v11.css");
  assert.match(css, /--dashboard-metal: var\(--atlas-honor-metal/);
  assert.match(css, /--dashboard-metal-strong: var\(--atlas-honor-metal-strong/);
  assert.match(css, /\.dashboard-domain-swatch/);
  assert.doesNotMatch(css, /--atlas-person-domain-governance:\s*#/);
  assert.doesNotMatch(css, /--atlas-person-domain-military:\s*#/);
});

test("DASH-M1 adds museum ledger material without changing Dashboard geometry", () => {
  const css = read("atlas-dashboard-monumental-v11.css");
  const start = css.indexOf("UI DASH-M1 — Museum ledger material");
  const end = css.indexOf("@media (max-width: 600px)", start);
  assert.ok(start >= 0 && end > start);
  const material = css.slice(start, end);

  assert.match(material, /\.dashboard-control-center \.card/);
  assert.match(material, /\.dashboard-kpi \{/);
  assert.match(material, /\.dashboard-panel,/);
  assert.match(material, /\.dashboard-issue-grid button,/);
  assert.match(material, /\.dashboard-polity-toolbar > div/);
  assert.match(material, /inset 2px 0 0 var\(--atlas-material-rail\)/);

  assert.doesNotMatch(material, /\n\s*grid-template-columns\s*:/);
  assert.doesNotMatch(material, /\n\s*padding\s*:/);
  assert.doesNotMatch(material, /\n\s*font-size\s*:/);
  assert.doesNotMatch(material, /\n\s*line-height\s*:/);
  assert.doesNotMatch(material, /\n\s*width\s*:/);
  assert.doesNotMatch(material, /\n\s*height\s*:/);
});

test("DASH-M2 removes the final desktop completeness pill without changing table geometry", () => {
  const css = read("atlas-dashboard-monumental-v11.css");
  const start = css.indexOf("UI DASH-M2 — Completeness action finish");
  const end = css.indexOf("@media (max-width: 600px)", start);
  assert.ok(start >= 0 && end > start);
  const material = css.slice(start, end);

  assert.match(material, /\.dashboard-completeness td button \{/);
  assert.match(material, /border-radius: 3px/);
  assert.match(material, /inset 2px 0 0 var\(--atlas-material-rail-soft\)/);

  assert.doesNotMatch(material, /border-radius:\s*999px/);
  assert.doesNotMatch(material, /\n\s*grid-template-columns\s*:/);
  assert.doesNotMatch(material, /\n\s*padding\s*:/);
  assert.doesNotMatch(material, /\n\s*font-size\s*:/);
  assert.doesNotMatch(material, /\n\s*line-height\s*:/);
  assert.doesNotMatch(material, /\n\s*width\s*:/);
  assert.doesNotMatch(material, /\n\s*height\s*:/);
});

test("UI V11 keeps mobile Dashboard compact and reduced-motion safe", () => {
  const css = read("atlas-dashboard-monumental-v11.css");
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /\.dashboard-kpi \{[\s\S]*min-height: 94px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.dashboard-loading-grid span \{[\s\S]*animation: none/);
});

test("UI V11 Production acceptance locks the new presentation asset and dark computed styles", () => {
  const verifier = read("scripts/verify-dashboard-production-acceptance.mjs");
  const workflow = read(".github/workflows/atlas-dashboard-production-acceptance.yml");
  assert.match(verifier, /"atlas-dashboard-monumental-v11\.css"/);
  assert.match(verifier, /v11_loaded/);
  assert.match(verifier, /Dashboard hero regressed to a bright surface/);
  assert.match(verifier, /Dashboard KPI regressed to a bright surface/);
  assert.match(verifier, /Dashboard panel regressed to a bright surface/);
  assert.match(workflow, /atlas-dashboard-monumental-v11\.css/);
});
