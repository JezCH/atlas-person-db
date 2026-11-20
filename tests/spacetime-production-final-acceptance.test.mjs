import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("Production visual workflow auto-runs on main while retaining the exact-SHA manual closure gate", () => {
  const workflow = read(".github/workflows/atlas-spacetime-production-visual.yml");
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /expected_runtime_sha:/);
  assert.match(workflow, /required:\s*true/);
  assert.match(workflow, /ATLAS_EXPECTED_RUNTIME_SHA=\$EXPECTED_SHA/);
  assert.match(workflow, /Wait for exact-SHA Production parity/);
  assert.match(workflow, /for attempt in \$\(seq 1 12\)/);
  assert.match(workflow, /DEPLOYMENT_DISABLED_OR_PAYMENT_REQUIRED/);
  assert.match(workflow, /initial_status.*402/);
  assert.match(workflow, /verify-spacetime-production-exact-sha\.mjs/);
  assert.match(workflow, /verify-spacetime-production-visual\.mjs/);
  assert.match(workflow, /verify-spacetime-production-domain-colors\.mjs/);
  assert.match(workflow, /verify-ui-v10-production-visual\.mjs/);
});

test("exact-SHA verifier fails closed and byte-compares the current spacetime/domain assets", () => {
  const verifier = read("scripts/verify-spacetime-production-exact-sha.mjs");
  assert.match(verifier, /ATLAS_EXPECTED_RUNTIME_SHA_REQUIRED/);
  assert.match(verifier, /raw\.githubusercontent\.com/);
  assert.match(verifier, /productionBytes\.equals\(githubBytes\)/);
  for (const asset of [
    "index.html",
    "atlas-main-authority-nav.js",
    "atlas-ui-visual-foundation.css",
    "atlas-person-monumental-register.css",
    "atlas-person-chronicle-detail.css",
    "atlas-ui-mobile-v8.css",
    "atlas-ui-motion-material-v9.css",
    "atlas-person-spacetime-monumental-canvas.css",
    "atlas-person-spacetime-instrument-tools.css",
    "atlas-person-spacetime-mobile-v8.css",
    "atlas-domain-surface-owner.js",
    "atlas-person-domain-palette.css",
    "atlas-person-domain-ui.js",
    "atlas-person-spacetime-domain-colors.js",
    "atlas-person-spacetime-domain-colors.css",
    "atlas-person-spacetime-label-engine.js",
    "atlas-person-spacetime-control-state.js",
    "atlas-person-spacetime-time-projection.js",
    "atlas-person-spacetime-semantic-axis.js",
    "atlas-person-spacetime-lod.js",
    "atlas-person-spacetime-view.js",
    "atlas-person-spacetime-view.css",
    "atlas-person-spacetime-temporal-certainty.js"
  ]) assert.match(verifier, new RegExp(asset.replaceAll(".", "\\.")));
});

test("Production visual acceptance covers the compact desktop sidecar", () => {
  const verifier = read("scripts/verify-spacetime-production-visual.mjs");
  assert.match(verifier, /at500\.sidecarPosition === "sticky"/);
  assert.match(verifier, /at500\.inspectorPosition === "relative"/);
  assert.match(verifier, /at500\.sidecarRect\.height <= at500\.scrollHeight \+ 1/);
  assert.match(verifier, /at500\.minimapSurfaceRect\.height <= 114/);
  assert.match(verifier, /at500\.inspectorRect\.height <= 78/);
});

test("Production visual acceptance covers the compact 390px mobile presentation camera", () => {
  const verifier = read("scripts/verify-spacetime-production-visual.mjs");
  assert.match(verifier, /MOBILE_VIEWPORT = Object\.freeze\(\{ width: 390, height: 844/);
  assert.match(verifier, /Page\.navigate", \{ url: "about:blank" \}/);
  assert.match(verifier, /Page\.navigate", \{ url: PRODUCTION_URL \}/);
  assert.match(verifier, /mobile\.presentation === "mobile"/);
  assert.match(verifier, /mobile\.bodyScrollWidth <= mobile\.viewport\.width \+ 1/);
  assert.match(verifier, /Math\.abs\(mobile\.cornerWidth - 80\)/);
  assert.match(verifier, /mobile\.canvasWidth >= 1500 && mobile\.canvasWidth <= 1600/);
  assert.match(verifier, /mobile\.scrollClientHeight >= 398 && mobile\.scrollClientHeight <= 470/);
  assert.match(verifier, /mobile\.minimapSurfaceRect\.height <= 94/);
  assert.match(verifier, /mobile\.emptyInspectorRect\.height <= 72/);
  assert.match(verifier, /mobile\.cameraRect\.height <= 40 && mobile\.searchRect\.height <= 40/);
  assert.match(verifier, /mobile\.cameraRect\.top >= mobile\.searchRect\.bottom \+ 2/);
  assert.match(verifier, /Math\.abs\(mobile\.macroOpacity - at500\.macroOpacity\) < 0\.001/);
  assert.match(verifier, /mobile\.subregionOpacity === 0/);
  assert.match(verifier, /V8 hierarchy contract/);
  assert.match(verifier, /Emulation\.setEmulatedMedia/);
  assert.match(verifier, /prefers-reduced-motion/);
  assert.match(verifier, /mobile\.statusSummaryVisible && !mobile\.statusMoreOpen/);
  assert.match(verifier, /spacetime-mobile-390\.png/);
});

test("Production visual acceptance requires every viewport Person name at 500 and 1500 percent", () => {
  const verifier = read("scripts/verify-spacetime-production-visual.mjs");
  assert.match(verifier, /defaultAcceptanceZoom === "500%"/);
  assert.match(verifier, /spacetimeCameraZoomReset'\)\?\.click/);
  assert.match(verifier, /spacetimeClearPerson'\)\?\.click/);
  assert.match(verifier, /spacetimeInspector\.is-empty/);
  assert.match(verifier, /at500\.inspectorEmpty/);
  assert.match(verifier, /at500\.deferredLabelCount === 0/);
  assert.match(verifier, /at500\.domLabelCount === at500\.domPersonCount/);
  assert.match(verifier, /at500\.missingVisibleLabelPersonIds\.length === 0/);
  assert.match(verifier, /at500\.extraVisibleLabelPersonIds\.length === 0/);
  assert.match(verifier, /const clientLeft=Number\(scroll\.clientLeft\)\|\|0/);
  assert.match(verifier, /const clientTop=Number\(scroll\.clientTop\)\|\|0/);
  assert.match(verifier, /right:sr\.left\+clientLeft\+Number\(scroll\.clientWidth\|\|0\)/);
  assert.match(verifier, /bottom:sr\.top\+clientTop\+Number\(scroll\.clientHeight\|\|0\)/);
  assert.doesNotMatch(verifier, /right:sr\.right,bottom:sr\.bottom/);
  assert.match(verifier, /minimumAcceptance\.zoomOutDisabled/);
  assert.match(verifier, /minimumAcceptance\.minimumPercent >= 50/);
  assert.match(verifier, /Math\.abs\(minimumAcceptance\.worldWidth - minimumAcceptance\.usableWidth\) <= 2/);
  assert.match(verifier, /at1500\.deferredLabelCount === 0/);
  assert.match(verifier, /at1500\.domLabelCount === at1500\.domPersonCount/);
  assert.match(verifier, /at1500\.missingVisibleLabelPersonIds\.length === 0/);
  assert.match(verifier, /at1500\.extraVisibleLabelPersonIds\.length === 0/);
  assert.match(verifier, /spacetime-1500\.png/);
  assert.match(verifier, /at1500\.zoom === "1500%"/);
  assert.match(verifier, /reviewedDisplayPlaceCount/);
  assert.match(verifier, /semantic\.buildReviewedPlaceGeometry/);
  assert.match(verifier, /at500\.placeSourceCount === at500\.reviewedDisplayPlaceCount/);
  assert.match(verifier, /at1500\.placeSourceCount === at1500\.reviewedDisplayPlaceCount/);
  assert.match(verifier, /at1500\.placeGlobalOverlap\.count === 0/);
  assert.match(verifier, /globalPlaceOverlapCode/);
  assert.doesNotMatch(verifier, /EXPECTED_REVIEWED_PLACE_COUNT/);
  assert.doesNotMatch(verifier, /bandContainment\.label_violation_count === 0/);
  assert.match(verifier, /bandContainment\.rail_violation_count === 0/);
});

test("V10 real-Chrome acceptance captures Person Main and Detail on desktop and 390px mobile", () => {
  const verifier = read("scripts/verify-ui-v10-production-visual.mjs");
  assert.match(verifier, /DESKTOP = Object\.freeze\(\{ width:1600, height:1000/);
  assert.match(verifier, /MOBILE = Object\.freeze\(\{ width:390, height:844/);
  assert.match(verifier, /prefers-reduced-motion/);
  assert.match(verifier, /mainPortraitCount===0/);
  assert.match(verifier, /portraitCount===1/);
  assert.match(verifier, /sectionCount>=4/);
  assert.match(verifier, /authoringPresent/);
  assert.match(verifier, /bodyScrollWidth<=391/);
  assert.match(verifier, /portraitRect\?\.width>=220&&mobileDetail\.portraitRect\?\.width<=260/);
  for (const screenshot of [
    "person-main-1600x1000.png",
    "person-detail-1600x1000.png",
    "person-main-390x844.png",
    "person-detail-390x844.png"
  ]) assert.match(verifier, new RegExp(screenshot.replaceAll(".", "\\.")));
});

test("real-Chrome domain acceptance preserves Person/Activity semantic separation", () => {
  const verifier = read("scripts/verify-spacetime-production-domain-colors.mjs");
  assert.match(verifier, /VIEWPORT = Object\.freeze\(\{ width: 1600, height: 1000/);
  assert.match(verifier, /Emulation\.setDeviceMetricsOverride", VIEWPORT/);
  assert.match(verifier, /Page\.navigate", \{ url: "about:blank" \}/);
  assert.match(verifier, /Page\.navigate", \{ url: PRODUCTION_URL \}/);
  assert.match(verifier, /data-spacetime-search-result/);
  assert.match(verifier, /spacetimeClearPerson/);
  assert.match(verifier, /decorateSpacetime\(document, window\.ATLAS_PERSON_DOMAIN_UI\)/);
  assert.match(verifier, /spacetime-track-label\[data-representative-domain\]/);
  assert.match(verifier, /spacetime-track-rail\[data-representative-domain\]/);
  assert.match(verifier, /canonical_domains\.length === 8/);
  assert.match(verifier, /decorated_label_count > 0/);
  assert.match(verifier, /decorated_rail_count > 0/);
  assert.match(verifier, /canonical_mismatches\.length === 0/);
  assert.match(verifier, /label_rail_mismatches\.length === 0/);
  assert.match(verifier, /activity_glyph_domain_attr_count === 0/);
  assert.match(verifier, /style_mismatches\.length === 0/);
  assert.match(verifier, /governance:'--atlas-person-domain-governance-surface'/);
  assert.match(verifier, /technology:'--atlas-person-domain-technology-surface'/);
  assert.match(verifier, /religion:'--atlas-person-domain-religion-edge'/);
  assert.match(verifier, /military:'--atlas-person-domain-military'/);
  assert.match(verifier, /science:'--atlas-person-domain-science'/);
  assert.match(verifier, /commerce:'--atlas-person-domain-commerce'/);
  assert.match(verifier, /culture:'--atlas-person-domain-culture'/);
  assert.match(verifier, /exploration:'--atlas-person-domain-exploration'/);
});

test("V10 closure lets canonical domain color outrank the V6 neutral fallback without important", () => {
  const css = read("atlas-person-spacetime-domain-colors.css");
  const frameScope = '.spacetime-frame[data-spacetime-visual="chronology-v6"]';
  for (const domain of ["governance","military","science","technology","commerce","culture","religion","exploration"]) {
    assert.ok(css.includes(`${frameScope} .spacetime-track-label[data-representative-domain="${domain}"]`));
    assert.ok(css.includes(`${frameScope} .spacetime-track-rail[data-representative-domain="${domain}"]`));
  }
  assert.doesNotMatch(css, /!important/);
});

test("V10 closure keeps unresolved review panels in the dark instrument material system", () => {
  const css = read("atlas-person-spacetime-instrument-tools.css");
  assert.match(css, /UNRESOLVED REVIEW/);
  assert.match(css, /\.spacetime-unresolved-grid > article \{/);
  assert.match(css, /background: var\(--spacetime-tools-raised\)/);
  assert.match(css, /border: 1px solid var\(--spacetime-tools-line\)/);
  assert.match(css, /\.spacetime-unresolved-head > strong \{/);
  assert.match(css, /color: var\(--spacetime-tools-metal-strong\)/);
  assert.match(css, /\.spacetime-unresolved-row small \{/);
  assert.match(css, /color: var\(--spacetime-tools-warning\)/);
});

test("final acceptance documentation keeps established stable-world invariants", () => {
  const doc = read("docs/spacetime-current-renderer-final-acceptance.md");
  assert.match(doc, /viewport-fit/);
  assert.match(doc, /50%/);
  assert.match(doc, /500%/);
  assert.match(doc, /1500%/);
  assert.match(doc, /0\.748/);
  assert.match(doc, /no local region\/time compression/);
  assert.match(doc, /Missing, unknown, future, or unclassified values remain neutral/);
  assert.match(doc, /leftover_artifacts: \[\]/);
});

test("the selected Person label and its connector share selection state", () => {
  const view = read("atlas-person-spacetime-view.js");
  const css = read("atlas-person-spacetime-monumental-canvas.css");
  assert.ok(view.includes('spacetime-label-connector${personSelected ? " is-selected" : ""}" aria-hidden="true"'));
  assert.ok(view.includes('spacetime-track-label${personSelected ? " is-selected" : ""}'));
  assert.match(css, /\.spacetime-label-connector\.is-selected\s*\{[^}]*--spacetime-selection-metal-strong/);
});

test("changing the selected Person moves the connector accent without moving either line", () => {
  const source = read("atlas-person-spacetime-view.js");
  const start = source.indexOf("  function renderLabels(");
  const end = source.indexOf("  function restoreCameraViewport(", start);
  assert.ok(start >= 0 && end > start);
  const context = vm.createContext({ escapeHtml: String, selectedPersonId: "one" });
  vm.runInContext(source.slice(start, end), context);
  const tracks = ["one", "two"].map(person_id => ({ track: { person_id, display_name: person_id } }));
  const labels = { placed: tracks.map(({ track }, i) => ({
    person_id: track.person_id, region_left: 100 + i * 50,
    connector: { x1: 5, x2: 22, y1: 35, length: 17 },
    label_x: 122 + i * 50, label_y: 30, width: 50
  })) };
  const render = () => context.renderLabels(tracks, labels, { labels: 0.7 }, "");
  const lines = (html) => Array.from(html.matchAll(/<i class="spacetime-label-connector( is-selected)?" aria-hidden="true" style="([^"]+)"/g),
    ([, selected, style]) => [Boolean(selected), style]);
  assert.deepEqual(lines(render()), [[true, "left:105px;top:35px;width:17px"], [false, "left:155px;top:35px;width:17px"]]);
  context.selectedPersonId = "two";
  assert.deepEqual(lines(render()), [[false, "left:105px;top:35px;width:17px"], [true, "left:155px;top:35px;width:17px"]]);
});


test("borrowed full-width Person name stays centered on its historical rail, while home-fit labels retain their preferred side", () => {
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(read("atlas-person-spacetime-label-engine.js"), sandbox);
  const engine = sandbox.module.exports;
  const options = {
    labelHeight:22, charWidth:9.4, cjkCharWidth:14, labelChromeWidth:13,
    labelWidthSafety:6, maxHorizontalShift:600, borrowHorizontalSpace:true,
    preserveFullTextWidth:true
  };
  const wide = engine.packLabels([{
    person_id:"wide", text:"알렉산더 대왕", anchor_x:200, anchor_y:44,
    min_left:180, max_right:220, forced:false
  }], {width:600,height:150}, options);
  assert.equal(wide.deferred.length, 0);
  assert.equal(wide.placed.length, 1);
  assert.ok(wide.placed[0].width > 40);
  assert.ok(Math.abs(wide.placed[0].label_x + wide.placed[0].width / 2 - 200) < 0.01,
    "a borrowed label must span around the owning rail, not start entirely in the next leaf");
  const short = engine.packLabels([{
    person_id:"short", text:"A", anchor_x:300, anchor_y:44,
    min_left:280, max_right:350, forced:false
  }], {width:600,height:150}, options);
  assert.equal(short.deferred.length, 0);
  assert.equal(short.placed.length, 1);
  assert.ok(short.placed[0].label_x >= 280 && short.placed[0].rect.right <= 350);
  assert.ok(short.placed[0].label_x > 300, "home-fit labels still start to the right of their rail");
});

test("cross-band marker marks only labels exceeding their actual source band and follows selection without moving X/Y", () => {
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(read("atlas-person-spacetime-label-engine.js"), sandbox);
  const engine = sandbox.module.exports;
  const view = read("atlas-person-spacetime-view.js");
  const packStart = view.indexOf("  function packTrackLabels(");
  const packEnd = view.indexOf("  function reasonLabel(", packStart);
  const renderStart = view.indexOf("  function renderLabels(");
  const renderEnd = view.indexOf("  function restoreCameraViewport(", renderStart);
  assert.ok(packStart > 0 && packEnd > packStart && renderStart > 0 && renderEnd > renderStart);
  const context = vm.createContext({
    runtime: () => ({labelEngine:engine}), selectedPersonId:"wide",
    PERSON_NAME_LABEL_PACK_HEIGHT:22, text:(v) => String(v || "").trim(), escapeHtml:String
  });
  vm.runInContext(view.slice(packStart, packEnd), context);
  vm.runInContext(view.slice(renderStart, renderEnd), context);
  const tracks = [
    {track:{person_id:"wide",track_id:"w",display_name:"알렉산더 대왕"},
      x:200, y:44, label_zone_left:180, label_zone_right:220, presentation_band_code:"western-europe"},
    {track:{person_id:"short",track_id:"s",display_name:"A"},
      x:300, y:96, label_zone_left:280, label_zone_right:350, presentation_band_code:"western-europe"}
  ];
  const pack = context.packTrackLabels(tracks, 150, 600, false);
  assert.equal(pack.deferred.length, 0);
  assert.equal(pack.placed.length, 2);
  const wide = pack.placed.find(label => label.person_id === "wide");
  const short = pack.placed.find(label => label.person_id === "short");
  assert.equal(wide.borrowed_from_home_band, true);
  assert.equal(short.borrowed_from_home_band, false);
  assert.equal(wide.anchor_x, 200);
  assert.equal(wide.anchor_y, 44);
  const html = context.renderLabels(tracks, pack, {labels:1}, "");
  assert.match(html, /class="spacetime-label-home-anchor is-selected" aria-hidden="true" style="left:200px;top:55px"/);
  assert.match(html, /data-spacetime-person="wide"[^>]+data-spacetime-label-borrowed="true"/);
  assert.match(html, /data-spacetime-person="short"[^>]+data-spacetime-label-borrowed="false"/);
  assert.equal((html.match(/class="spacetime-label-home-anchor/g) || []).length, 1);
  context.selectedPersonId = "short";
  const changed = context.renderLabels(tracks, pack, {labels:1}, "");
  assert.match(changed, /class="spacetime-label-home-anchor" aria-hidden="true" style="left:200px;top:55px"/);
  assert.doesNotMatch(changed, /class="spacetime-label-home-anchor is-selected"/);
  const css = read("atlas-person-spacetime-monumental-canvas.css");
  assert.match(css, /\.spacetime-label-home-anchor\s*\{[^}]*pointer-events: none/);
  assert.match(css, /\.spacetime-label-home-anchor\.is-selected\s*\{/);
  const loader = read("atlas-main-authority-nav.js");
  assert.match(loader, /homeband=20261121-centered-rail-origin-v1/);
  assert.match(view, /spacetime-label-engine\.js\?v=.*homeband=20261121-centered-rail-origin-v1/);
});

test("real-Chrome audit checks every borrowed name's home marker against its own Person rail", () => {
  const script = read("scripts/verify-spacetime-production-visual.mjs");
  const markerSource = 'const labelAssociationCode = `';
  const first = script.indexOf(markerSource);
  const last = script.indexOf('`;', first + markerSource.length);
  assert.ok(first >= 0 && last > first);
  const probe = vm.runInNewContext("(" + script.slice(first + markerSource.length, last) + ")");
  assert.equal(typeof probe, "function");

  const element = (id, coords, borrowed) => ({
    dataset: borrowed === undefined
      ? {spacetimePerson:id}
      : {spacetimePerson:id,spacetimeLabelBorrowed:borrowed ? "true" : "false"},
    getBoundingClientRect: () => coords
  });
  const longLabel = element("long", {left:150,top:200,right:260,bottom:222}, true);
  const shortLabel = element("short", {left:302,top:240,right:341,bottom:262}, false);
  const marker = element("long", {left:197.5,top:219.5,right:202.5,bottom:224.5});
  const longRail = element("long", {left:198,top:180,right:202,bottom:260});
  const shortRail = element("short", {left:298,top:230,right:302,bottom:300});

  const accepted = probe([longLabel,shortLabel], [marker], [longRail,shortRail]);
  assert.equal(accepted.label_count, 2);
  assert.equal(accepted.borrowed_count, 1);
  assert.equal(accepted.marker_count, 1);
  assert.equal(accepted.violation_count, 0);

  const displaced = element("long", {left:224,top:219.5,right:229,bottom:224.5});
  const wrong = probe([longLabel,shortLabel], [displaced], [longRail,shortRail]);
  assert.ok(wrong.violations.some(v => v.reason === "home_marker_not_on_person_rail"));
  const missing = probe([longLabel,shortLabel], [], [longRail,shortRail]);
  assert.ok(missing.violations.some(v => v.reason === "borrowed_name_missing_home_marker"));
  const orphan = probe([longLabel,shortLabel], [marker,element("short", {left:298,top:259,right:303,bottom:264})], [longRail,shortRail]);
  assert.ok(orphan.violations.some(v => v.reason === "orphan_home_marker"));

  assert.match(script, /at500\.labelAssociation\.violation_count === 0/);
  assert.match(script, /at1500\.labelAssociation\.violation_count === 0/);
  const view = read("atlas-person-spacetime-view.js");
  assert.match(view, /data-spacetime-person="\$\{escapeHtml\(item\.track\.person_id\)\}"><\/i>/);
});
