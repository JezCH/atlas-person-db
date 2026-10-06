import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("SPACETIME-M1 chronology canvas consumes the shared monumental material system without geometry drift", () => {
  const css = read("atlas-person-spacetime-monumental-canvas.css");
  const start = css.indexOf("SPACETIME-M1 — Shared chronology material integration");
  const end = css.indexOf("@media (max-width: 760px)", start);
  assert.ok(start >= 0 && end > start);
  const material = css.slice(start, end);

  for (const token of [
    "--atlas-material-hairline",
    "--atlas-material-hairline-soft",
    "--atlas-material-hairline-strong",
    "--atlas-material-sheen",
    "--atlas-material-wash-hover",
    "--atlas-material-wash-active",
    "--atlas-material-wash-selected",
    "--atlas-material-rail",
    "--atlas-material-glint"
  ]) assert.ok(material.includes(`var(${token})`), token);

  assert.match(material, /\.spacetime-era-boundary \{/);
  assert.match(material, /\.spacetime-track-label\.is-selected/);
  assert.match(material, /\.spacetime-activity-glyph\.is-selected/);
  assert.match(material, /var\(--spacetime-person-domain-tint\)/);
  assert.match(material, /var\(--spacetime-selection-metal/);

  assert.doesNotMatch(material, /\n\s*(?:width|height|min-width|max-width|min-height|max-height|padding|margin|font-size|line-height|left|right|top|bottom|transform|grid-template-columns|grid-template-rows)\s*:/);
});

test("SPACETIME-M1 instrument tools consume the shared material system without changing control or panel geometry", () => {
  const css = read("atlas-person-spacetime-instrument-tools.css");
  const start = css.indexOf("SPACETIME-M1 — Shared instrument material integration");
  const end = css.indexOf("/* V8 owns responsive hierarchy", start);
  assert.ok(start >= 0 && end > start);
  const material = css.slice(start, end);

  for (const token of [
    "--atlas-material-hairline",
    "--atlas-material-hairline-soft",
    "--atlas-material-hairline-strong",
    "--atlas-material-sheen",
    "--atlas-material-sheen-soft",
    "--atlas-material-wash-hover",
    "--atlas-material-wash-active",
    "--atlas-material-wash-selected",
    "--atlas-material-rail",
    "--atlas-material-edge-dark"
  ]) assert.ok(material.includes(`var(${token})`), token);

  assert.match(material, /\.spacetime-toolbar \{/);
  assert.match(material, /\.spacetime-minimap-surface \{/);
  assert.match(material, /\.spacetime-sticky-inspector \{/);
  assert.match(material, /\.spacetime-inspector-activity\.is-selected/);
  assert.match(material, /\.spacetime-selection-evidence-row,/);
  assert.match(material, /\.spacetime-unresolved-grid > article/);

  assert.doesNotMatch(material, /\n\s*(?:width|height|min-width|max-width|min-height|max-height|padding|margin|font-size|line-height|left|right|top|bottom|transform|grid-template-columns|grid-template-rows)\s*:/);
});

test("SPACETIME-M1 does not move semantic domain ownership into the material layer", () => {
  const canvas = read("atlas-person-spacetime-monumental-canvas.css");
  const tools = read("atlas-person-spacetime-instrument-tools.css");
  const domain = read("atlas-person-spacetime-domain-colors.css");
  const canvasStart = canvas.indexOf("SPACETIME-M1 — Shared chronology material integration");
  const canvasEnd = canvas.indexOf("@media (max-width: 760px)", canvasStart);
  const material = canvas.slice(canvasStart, canvasEnd) + tools.slice(tools.indexOf("SPACETIME-M1 — Shared instrument material integration"));

  assert.doesNotMatch(material, /--atlas-person-domain-[a-z-]+\s*:/);
  assert.doesNotMatch(material, /data-representative-domain=/);
  assert.match(domain, /var\(--atlas-person-domain-governance/);
  assert.match(domain, /var\(--atlas-person-domain-military/);
});


test("SPACETIME-M2 keeps V8 mobile geometry while normalizing final instrument dividers", () => {
  const css = read("atlas-person-spacetime-mobile-v8.css");
  const start = css.indexOf("SPACETIME-M2 — Mobile instrument token parity");
  const end = css.indexOf("@media (prefers-reduced-motion: reduce)", start);
  assert.ok(start >= 0 && end > start);
  const material = css.slice(start, end);

  assert.match(material, /border-left-color: var\(--atlas-material-hairline-soft\)/);
  assert.match(material, /border-top-color: var\(--atlas-material-hairline-soft\)/);
  assert.doesNotMatch(material, /\n\s*(?:width|height|min-width|max-width|min-height|max-height|padding|margin|font-size|line-height|left|right|top|bottom|transform|grid-template-columns|grid-template-rows)\s*:/);
});
