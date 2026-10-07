import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("GLOBAL-M1 foundation owns one shared monumental material scale", () => {
  const foundation = read("atlas-ui-visual-foundation.css");
  for (const token of [
    "--atlas-material-hairline-soft: rgba(192, 174, 136, .075)",
    "--atlas-material-hairline: rgba(192, 174, 136, .10)",
    "--atlas-material-hairline-strong: rgba(208, 188, 145, .20)",
    "--atlas-material-rail: rgba(208, 188, 145, .50)",
    "--atlas-material-rail-soft: rgba(208, 188, 145, .40)",
    "--atlas-material-sheen-soft: rgba(239, 235, 226, .008)",
    "--atlas-material-sheen: rgba(239, 235, 226, .012)",
    "--atlas-material-sheen-strong: rgba(239, 235, 226, .018)",
    "--atlas-material-edge-dark: rgba(0, 0, 0, .16)",
    "--atlas-material-edge-dark-strong: rgba(0, 0, 0, .20)",
    "--atlas-material-glint: rgba(226, 211, 178, .72)"
  ]) assert.ok(foundation.includes(token), token);
});

test("GLOBAL-M1 Person Register and navigation consume the shared material scale", () => {
  const register = read("atlas-person-monumental-register.css");
  const nav = read("atlas-person-era-navigation.css");
  assert.match(register, /--atlas-register-sheen: var\(--atlas-material-sheen-strong\)/);
  assert.match(register, /--atlas-register-bronze-hairline: var\(--atlas-material-hairline\)/);
  assert.match(register, /--atlas-register-bronze-mid: var\(--atlas-material-hairline-strong\)/);
  assert.match(register, /--atlas-register-bronze-bright: var\(--atlas-material-glint\)/);
  assert.match(nav, /border-color:var\(--atlas-material-hairline\)/);
  assert.match(nav, /var\(--atlas-material-sheen\)/);
  assert.match(nav, /var\(--atlas-material-hairline-strong\)/);
});

test("GLOBAL-M1 Polity canonical and review cards share the same rail and hairline strengths", () => {
  const css = read("atlas-polity-review-workbench.css");
  const start = css.indexOf("UI POL-C1 — Polity plaque material");
  assert.ok(start >= 0);
  const material = css.slice(start);
  assert.match(material, /var\(--atlas-material-hairline\)/);
  assert.match(material, /var\(--atlas-material-hairline-soft\)/);
  assert.match(material, /inset 2px 0 0 var\(--atlas-material-rail\)/);
  assert.match(material, /var\(--atlas-material-sheen\)/);
  assert.match(material, /var\(--atlas-material-edge-dark\)/);
  assert.doesNotMatch(material, /inset 2px 0 0 rgba\(208,188,145,\.(?:52|58)\)/);
});

test("GLOBAL-M1 Dashboard uses the same material rail system without changing semantic domain color ownership", () => {
  const css = read("atlas-dashboard-monumental-v11.css");
  const start = css.indexOf("UI DASH-M1 — Museum ledger material");
  const end = css.indexOf("@media (max-width: 600px)", start);
  assert.ok(start >= 0 && end > start);
  const material = css.slice(start, end);
  assert.match(material, /var\(--atlas-material-hairline\)/);
  assert.match(material, /var\(--atlas-material-hairline-soft\)/);
  assert.match(material, /inset 2px 0 0 var\(--atlas-material-rail\)/);
  assert.match(material, /inset 2px 0 0 var\(--atlas-material-rail-soft\)/);
  assert.match(material, /var\(--atlas-material-sheen\)/);
  assert.doesNotMatch(material, /inset 2px 0 0 rgba\(208,188,145,\.(?:40|42|50)\)/);
  assert.doesNotMatch(material, /--atlas-person-domain-[a-z-]+\s*:/);
});


test("GLOBAL-M2 interaction luminance uses one hover / active / selected wash scale", () => {
  const foundation = read("atlas-ui-visual-foundation.css");
  const register = read("atlas-person-monumental-register.css");
  const nav = read("atlas-person-era-navigation.css");
  const polity = read("atlas-polity-review-workbench.css");
  const dashboard = read("atlas-dashboard-monumental-v11.css");

  assert.ok(foundation.includes("--atlas-material-wash-hover: rgba(192, 174, 136, .026)"));
  assert.ok(foundation.includes("--atlas-material-wash-active: rgba(192, 174, 136, .040)"));
  assert.ok(foundation.includes("--atlas-material-wash-selected: rgba(192, 174, 136, .050)"));

  const registerMaterial = register.slice(register.indexOf("UI REG-M1 — Memorial material finish"), register.indexOf("/* Mobile becomes"));
  assert.match(registerMaterial, /var\(--atlas-material-wash-hover\)/);
  assert.match(registerMaterial, /var\(--atlas-material-wash-selected\)/);
  assert.doesNotMatch(registerMaterial, /rgba\(192, 174, 136, \.(?:022|050)\)/);

  const navMaterial = nav.slice(nav.indexOf("UI REG-M2 — Museum instrument chrome"), nav.indexOf("@media(max-width:900px)"));
  assert.match(navMaterial, /var\(--atlas-material-wash-active\)/);
  assert.doesNotMatch(navMaterial, /rgba\(208,188,145,\.026\)/);

  const polityMaterial = polity.slice(polity.indexOf("UI POL-C1 — Polity plaque material"));
  assert.match(polityMaterial, /var\(--atlas-material-wash-active\)/);
  assert.doesNotMatch(polityMaterial, /rgba\(192,174,136,\.(?:035|040)\)/);

  const dashboardMaterial = dashboard.slice(dashboard.indexOf("UI DASH-M1 — Museum ledger material"), dashboard.indexOf("@media (max-width: 600px)"));
  assert.match(dashboardMaterial, /var\(--atlas-material-wash-hover\)/);
  assert.doesNotMatch(dashboardMaterial, /rgba\(192,174,136,\.(?:026|030)\)/);
});


test("GLOBAL-M3 inscription typography is globally owned and limited to identity headings", () => {
  const foundation = read("atlas-ui-visual-foundation.css");
  const register = read("atlas-person-monumental-register.css");
  const polity = read("atlas-polity-review-workbench.css");
  const dashboard = read("atlas-dashboard-monumental-v11.css");

  assert.match(foundation, /--atlas-font-inscription:[\s\S]*"Noto Serif KR"[\s\S]*Georgia,[\s\S]*serif;/);
  assert.match(foundation, /--atlas-font-display: var\(--atlas-font-inscription\)/);
  assert.match(register, /--atlas-font-display: var\(--atlas-font-inscription\)/);
  assert.match(dashboard, /font-family: var\(--atlas-font-display/);

  const start = polity.indexOf("GLOBAL-M3 — Inscription typography");
  assert.ok(start >= 0);
  const typography = polity.slice(start);
  assert.match(typography, /\.polity-browser-title strong,/);
  assert.match(typography, /\.polity-review-card-head h3,/);
  assert.match(typography, /\.polity-dossier-section-head h4/);
  assert.match(typography, /font-family:var\(--atlas-font-inscription\)/);
  assert.match(typography, /font-weight:620/);
  assert.doesNotMatch(typography, /font-size\s*:/);
  assert.doesNotMatch(typography, /line-height\s*:/);
  assert.doesNotMatch(typography, /padding\s*:/);
  assert.doesNotMatch(typography, /margin\s*:/);
});


test("SHELL-M1 global shell consumes shared structural material tokens without interaction drift", () => {
  const foundation = read("atlas-ui-visual-foundation.css");
  const html = read("index.html");

  assert.match(foundation, /SHELL-M1 — Structural material normalization/);
  assert.match(foundation, /\.sidebar \{[\s\S]*?border-right: 1px solid var\(--atlas-material-hairline-soft\)/);
  assert.match(foundation, /\.brand \{[\s\S]*?border-bottom: 1px solid var\(--atlas-material-hairline-soft\)/);
  assert.match(foundation, /\.brand-mark \{[\s\S]*?border-left: 1px solid var\(--atlas-material-rail-soft\)[\s\S]*?border-right: 1px solid var\(--atlas-material-hairline-strong\)/);
  assert.match(foundation, /\.sidebar-foot \{[\s\S]*?border-top: 1px solid var\(--atlas-material-hairline-soft\)/);
  assert.match(foundation, /\.main-area \{[\s\S]*?linear-gradient\(180deg, var\(--atlas-material-sheen\), transparent 14rem\)/);
  assert.match(foundation, /\.topbar \{[\s\S]*?border-bottom: 1px solid var\(--atlas-material-hairline\)/);
  assert.match(foundation, /\.mobile-appbar \{[\s\S]*?border-bottom: 1px solid var\(--atlas-material-hairline-soft\)/);
  assert.match(foundation, /\.mobile-drawer \{[\s\S]*?border-right: 1px solid var\(--atlas-material-hairline\)/);
  assert.match(foundation, /\.mobile-brand \{[\s\S]*?border-bottom: 1px solid var\(--atlas-material-hairline-soft\)/);
  assert.match(foundation, /\.mobile-brand-mark \{[\s\S]*?border-left: 1px solid var\(--atlas-material-rail-soft\)[\s\S]*?border-right: 1px solid var\(--atlas-material-hairline-strong\)/);
  assert.match(html, /atlas-ui-visual-foundation\.css\?v=20261007-shell-m2-luminance-v1/);

  const shellStart = foundation.indexOf("SHELL-M1 — Structural material normalization");
  const shellEnd = foundation.indexOf("SHELL-M2 — Navigation interaction luminance", shellStart);
  const shell = foundation.slice(shellStart, shellEnd);
  assert.doesNotMatch(shell, /\.nav-item:hover:not\(:disabled\)[\s\S]*?var\(--atlas-material-wash-hover\)/);
  assert.doesNotMatch(shell, /\.nav-item\.active[\s\S]*?var\(--atlas-material-wash-(?:active|selected)\)/);
});


test("SHELL-M2 navigation uses the shared hover / active / selected luminance scale", () => {
  const foundation = read("atlas-ui-visual-foundation.css");
  const motion = read("atlas-ui-motion-material-v9.css");
  const html = read("index.html");

  assert.match(foundation, /SHELL-M2 — Navigation interaction luminance/);
  assert.match(foundation, /\.nav-item:hover:not\(:disabled\) \{[\s\S]*?background: var\(--atlas-material-wash-hover\)/);
  assert.match(foundation, /\.nav-item\.active \{[\s\S]*?var\(--atlas-material-wash-selected\)/);
  assert.match(foundation, /\.mobile-nav button\.active \{[\s\S]*?var\(--atlas-material-wash-selected\)/);
  assert.match(foundation, /@media \(max-width: 760px\) and \(hover: hover\) \{[\s\S]*?\.mobile-nav button:hover:not\(:disabled\)[\s\S]*?var\(--atlas-material-wash-hover\)/);

  assert.match(motion, /\.nav-item:active:not\(:disabled\),\n\.mobile-nav button:active:not\(:disabled\) \{\n  background-color: var\(--atlas-material-wash-active\);\n\}/);
  assert.match(motion, /\.btn:active:not\(:disabled\),[\s\S]*?background-color: rgba\(255,255,255,\.038\)/);

  assert.doesNotMatch(foundation, /\.nav-item:hover:not\(:disabled\) \{[\s\S]*?rgba\(255, 255, 255, \.025\)/);
  assert.doesNotMatch(foundation, /\.nav-item\.active \{[\s\S]*?rgba\(192, 174, 136, \.09\)/);
  assert.doesNotMatch(foundation, /\.mobile-nav button\.active \{[\s\S]*?rgba\(192,174,136,\.09\)/);

  assert.match(html, /atlas-ui-visual-foundation\.css\?v=20261007-shell-m2-luminance-v1/);
  assert.match(html, /atlas-ui-motion-material-v9\.css\?v=20261007-shell-m2-luminance-v1/);
});
