import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const css = read("atlas-ui-phase3-ornaments.css");
const html = read("index.html");
const ornament = read("assets/ui-ornaments/atlas-corner-filigree.svg");

test("desktop-only A glyph cancels the inherited four-pixel brand-label offset", () => {
  const match = css.match(/@media \(min-width:761px\)\s*\{\s*\.workspace-shell\.atlas-ornament-v3 \.sidebar \.brand \.brand-mark\.atlas-o-shell-signet > span\s*\{([^}]+)\}/);
  assert.ok(match, "desktop signet override should target only the A glyph");
  assert.match(match[1], /margin-top:\s*0\s*;/);
  assert.match(match[1], /letter-spacing:\s*normal\s*;/);
  assert.doesNotMatch(match[1], /transform:|top:|position:|margin-left:/);
  assert.match(read("atlas-ui-visual-foundation.css"), /\.brand span\s*\{\s*margin-top: 4px;/);
  assert.match(css, /\.atlas-ornament-v3 \.atlas-o-shell-signet \{[^}]*display:grid;place-items:center;/);
  assert.match(html, /class="brand-mark atlas-o-shell-signet" data-atlas-o-decor/);
  assert.match(html, /class="mobile-brand-mark atlas-o-shell-signet" data-atlas-o-decor/);
});

test("dashboard corner ornament follows the hero border, not a 12px inset", () => {
  assert.match(css, /\.dashboard-frontispiece::before\s*\{[\s\S]*?top:-3px;right:-3px;left:auto;bottom:auto;[\s\S]*?width:54px;height:54px/);
  assert.match(css, /@media \(max-width:600px\)[\s\S]*?\.dashboard-frontispiece::before\s*\{\s*[\s\S]*?width:30px;height:30px;top:-1\.5px;right:-1\.5px/);
  assert.match(css, /background:url\("\.\/assets\/ui-ornaments\/atlas-corner-filigree\.svg"\)/);
  assert.match(css, /transform:scaleX\(-1\)/);
  assert.match(css, /pointer-events:none/);
  assert.match(ornament, /viewBox="0 0 230 230"/);
  // SVG starts its first corner line at 11/230 of each dimension.
  assert.ok(Math.abs(54 * 11 / 230 - 3) < 0.5, "desktop edge aligned to < 0.5px");
  assert.ok(Math.abs(30 * 11 / 230 - 1.5) < 0.5, "mobile edge aligned to < 0.5px");
  assert.match(html, /atlas-ui-phase3-ornaments\.css\?v=20261010-vis3-05r-mixed-v1-signet-corner-v2/);
});
