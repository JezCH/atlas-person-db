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

  const navMaterial = nav.slice(nav.indexOf("ERA-M1 — Neutral Era navigation interaction luminance"), nav.indexOf("@media(max-width:900px)"));
  assert.match(navMaterial, /var\(--atlas-material-wash-hover\)/);
  assert.match(navMaterial, /var\(--atlas-material-wash-selected\)/);
  assert.match(navMaterial, /ERA-M2 — Semantic domain filter interaction luminance/);
  assert.doesNotMatch(navMaterial, /\.person-era-jump\.is-current[\s\S]*?var\(--atlas-material-wash-active\)/);
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
  assert.match(html, /atlas-ui-visual-foundation\.css\?v=20261007-controls-m2-luminance-v1/);

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

  const navActiveStart = motion.indexOf(".nav-item:active:not(:disabled),");
  const controlsActiveStart = motion.indexOf(".btn:not(.btn-primary):active:not(:disabled),", navActiveStart);
  assert.ok(navActiveStart >= 0 && controlsActiveStart > navActiveStart);
  const navActive = motion.slice(navActiveStart, controlsActiveStart);
  assert.match(navActive, /\.nav-item:active:not\(:disabled\),\n\.mobile-nav button:active:not\(:disabled\) \{\n  background-color: var\(--atlas-material-wash-active\);\n\}/);
  assert.doesNotMatch(navActive, /\.btn/);

  assert.doesNotMatch(foundation, /\.nav-item:hover:not\(:disabled\) \{[\s\S]*?rgba\(255, 255, 255, \.025\)/);
  assert.doesNotMatch(foundation, /\.nav-item\.active \{[\s\S]*?rgba\(192, 174, 136, \.09\)/);
  assert.doesNotMatch(foundation, /\.mobile-nav button\.active \{[\s\S]*?rgba\(192,174,136,\.09\)/);

  assert.match(html, /atlas-ui-visual-foundation\.css\?v=20261007-controls-m2-luminance-v1/);
  assert.match(html, /atlas-ui-motion-material-v9\.css\?v=20261007-controls-m2-luminance-v1/);
});


test("SHELL-M3 keeps late V9 shell material on shared GLOBAL-M1 tokens", () => {
  const motion = read("atlas-ui-motion-material-v9.css");
  const html = read("index.html");

  assert.match(motion, /SHELL-M3 — Late material ownership consolidation/);
  assert.match(motion, /\.sidebar,\n\.mobile-drawer \{\n  background-image:\n    linear-gradient\(180deg, var\(--atlas-material-sheen\), transparent 84px\);\n  box-shadow: inset -1px 0 0 var\(--atlas-material-sheen-strong\);\n\}/);
  assert.match(motion, /\.topbar,\n\.mobile-appbar \{\n  box-shadow: inset 0 -1px 0 var\(--atlas-material-sheen\);\n\}/);

  const spacetimeStart = motion.indexOf(".spacetime-sticky-inspector,");
  const controlsStart = motion.indexOf(".btn,", spacetimeStart);
  const spacetimeMaterial = motion.slice(spacetimeStart, controlsStart);
  assert.match(spacetimeMaterial, /linear-gradient\(180deg, rgba\(255,255,255,\.012\), transparent 84px\)/);

  assert.match(motion, /\.btn,[\s\S]*?var\(--atlas-material-edge-soft\)/);
  assert.match(motion, /\.btn:hover,[\s\S]*?var\(--atlas-material-edge\)/);
  assert.match(html, /atlas-ui-motion-material-v9\.css\?v=20261007-controls-m2-luminance-v1/);
});


test("CONTROLS-M1 keeps operational chrome quiet while sharing structural hairlines", () => {
  const foundation = read("atlas-ui-visual-foundation.css");
  const html = read("index.html");

  assert.match(foundation, /CONTROLS-M1 — Quiet operational material normalization/);
  assert.match(foundation, /input,\nselect,\ntextarea \{\n  border-color: var\(--atlas-material-hairline\);/);
  assert.match(foundation, /\.btn \{[\s\S]*?border-color: var\(--atlas-material-hairline\);/);
  assert.match(foundation, /\.mini-btn \{\n  border: 1px solid var\(--atlas-material-hairline-soft\);/);
  assert.match(foundation, /\.toast \{\n  border: 1px solid var\(--atlas-material-hairline\);/);
  assert.match(foundation, /\.sidebar-collapse-toggle \{\n  border-color: var\(--atlas-material-hairline-soft\);/);
  assert.match(foundation, /\.mobile-menu-button \{\n    border: 1px solid var\(--atlas-material-hairline-soft\);/);
  assert.match(foundation, /\.person-main-actions \.btn \{\n    border-color: var\(--atlas-material-hairline-soft\);/);

  const controlsM1 = foundation.indexOf("CONTROLS-M1 — Quiet operational material normalization");
  const controlsM2 = foundation.indexOf("CONTROLS-M2 — Operational interaction luminance", controlsM1);
  assert.ok(controlsM1 >= 0 && controlsM2 > controlsM1);
  assert.match(foundation, /input:focus,[\s\S]*?border-color: var\(--atlas-honor-metal\);/);
  assert.match(foundation, /\.btn-primary \{[\s\S]*?background: rgba\(192, 174, 136, \.08\)/);
  assert.match(foundation, /\.mini-btn\.danger \{[\s\S]*?rgba\(215, 114, 114, \.32\)/);

  assert.match(html, /atlas-ui-visual-foundation\.css\?v=20261007-controls-m2-luminance-v1/);
});


test("CONTROLS-M2 layers shared hover / active luminance above neutral graphite fills", () => {
  const foundation = read("atlas-ui-visual-foundation.css");
  const motion = read("atlas-ui-motion-material-v9.css");
  const html = read("index.html");

  assert.match(foundation, /CONTROLS-M2 — Operational interaction luminance/);
  assert.match(foundation, /\.btn \{[\s\S]*?--atlas-control-fill: #191e22;[\s\S]*?background: var\(--atlas-control-fill\)/);
  assert.match(foundation, /\.btn:not\(\.btn-primary\):hover \{[\s\S]*?var\(--atlas-material-wash-hover\)[\s\S]*?var\(--atlas-control-fill\)/);
  assert.match(foundation, /\.mini-btn \{[\s\S]*?--atlas-control-fill: #20252a;/);
  assert.match(foundation, /\.mini-btn:not\(\.danger\):hover \{[\s\S]*?var\(--atlas-material-wash-hover\)/);
  assert.match(foundation, /\.sidebar-collapse-toggle \{[\s\S]*?--atlas-control-fill: #151a1e;/);
  assert.match(foundation, /\.sidebar-collapse-toggle:hover \{[\s\S]*?var\(--atlas-material-wash-hover\)/);
  assert.match(foundation, /\.mobile-menu-button \{[\s\S]*?--atlas-control-fill: #191d21;/);
  assert.match(foundation, /\.person-main-actions \.btn \{[\s\S]*?--atlas-control-fill: #191d21;/);
  assert.match(foundation, /@media \(max-width: 760px\) and \(hover: hover\) \{[\s\S]*?\.mobile-menu-button:hover,[\s\S]*?\.person-main-actions \.btn:not\(\.btn-primary\):hover[\s\S]*?var\(--atlas-material-wash-hover\)/);

  assert.match(motion, /\.btn:not\(\.btn-primary\):active:not\(:disabled\),[\s\S]*?\.mini-btn:not\(\.danger\):active:not\(:disabled\),[\s\S]*?\.mobile-menu-button:active:not\(:disabled\),[\s\S]*?\.sidebar-collapse-toggle:active:not\(:disabled\)[\s\S]*?var\(--atlas-material-wash-active\)[\s\S]*?var\(--atlas-control-fill\)/);
  assert.match(motion, /\.spacetime-camera button:active:not\(:disabled\),[\s\S]*?background-color: rgba\(255,255,255,\.038\)/);

  assert.match(foundation, /\.btn-primary:hover \{[\s\S]*?background: rgba\(192, 174, 136, \.13\)/);
  assert.match(foundation, /\.mini-btn\.danger \{[\s\S]*?background: rgba\(215, 114, 114, \.06\)/);
  assert.doesNotMatch(motion, /\.btn-primary:active/);
  assert.doesNotMatch(motion, /\.mini-btn\.danger:active/);

  assert.match(html, /atlas-ui-visual-foundation\.css\?v=20261007-controls-m2-luminance-v1/);
  assert.match(html, /atlas-ui-motion-material-v9\.css\?v=20261007-controls-m2-luminance-v1/);
});
