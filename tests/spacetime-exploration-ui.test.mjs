import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const viewUrl = new URL("../atlas-person-spacetime-view.js", import.meta.url);
const cssUrl = new URL("../atlas-person-spacetime-view.css", import.meta.url);

async function fixture(url) {
  return readFile(url, "utf8");
}

test("current spacetime surface loads P11 exploration in place and keeps one renderer", async () => {
  const view = await fixture(viewUrl);
  assert.doesNotThrow(() => new Function(view));
  assert.ok(view.includes("atlas-person-spacetime-exploration.js?v=20260826-p11"));
  assert.ok(view.includes("ATLAS_PERSON_SPACETIME_EXPLORATION"));
  assert.ok(view.includes("exploration.projectTrack(track, projection, contentWidth)"));
  assert.ok(view.includes("exploration.focusScrollTarget"));
  assert.ok(view.includes("exploration.panTarget"));
  assert.doesNotMatch(view, /spacetime-v2/);
});

test("search exposes explicit Person results, preserves IME composition, and Enter focuses the first matching Person", async () => {
  const view = await fixture(viewUrl);
  const css = await fixture(cssUrl);
  assert.ok(view.includes("renderSearchResults(searchItems, needle)"));
  assert.ok(view.includes("data-spacetime-search-result"));
  assert.ok(view.includes('id="spacetimeSearchResult-${escapeHtml(item.person_id)}"'));
  assert.ok(view.includes("if (event.isComposing) return;"));
  assert.ok(view.includes('event.key === "Enter"'));
  assert.ok(view.includes("selectPerson(mount, first.person_id, { focus: true })"));
  const inputHandler = view.indexOf('searchInput?.addEventListener("input"');
  const composingGuard = view.indexOf("if (event.isComposing) return;", inputHandler);
  const renderAfterInput = view.indexOf("renderInto(mount);", inputHandler);
  assert.ok(inputHandler >= 0 && composingGuard > inputHandler && composingGuard < renderAfterInput);
  const keyHandler = view.indexOf('searchInput?.addEventListener("keydown"');
  const keyGuard = view.indexOf("if (event.isComposing) return;", keyHandler);
  const enterBranch = view.indexOf('if (event.key === "Enter")', keyHandler);
  assert.ok(keyHandler >= 0 && keyGuard > keyHandler && keyGuard < enterBranch);
  assert.ok(css.includes(".spacetime-search-results{"));
  assert.ok(css.includes(".spacetime-search-result-list{"));
});

test("direct canvas selection preserves the clicked camera context while navigation still focuses explicitly", async () => {
  const view = await fixture(viewUrl);
  assert.ok(view.includes('target.dataset.spacetimePerson, { focus: false }'));
  assert.ok(view.includes("selectPerson(mount, first.person_id, { focus: true })"));
  assert.ok(view.includes("selectPerson(mount, selectedPersonId, { focus: true, detail: true })"));
});

test("selection feedback and status metrics expose their actual scopes", async () => {
  const view = await fixture(viewUrl);
  const css = await fixture(cssUrl);
  assert.ok(view.includes("const visibleTracks = projectedTracks.map((item) => item.track);"));
  assert.ok(view.includes("const primarySegmentCount = compiled.partitioned.tracks.reduce"));
  assert.ok(view.includes("const counterpartyCount = compiled.partitioned.tracks.reduce"));
  assert.ok(view.includes('class="spacetime-activity-glyph${selectedPersonId === track.person_id ? " is-selected" : ""}"'));
  assert.ok(css.includes(".spacetime-activity-glyph:hover,.spacetime-activity-glyph.is-selected{"));
  assert.ok(view.includes('${needle ? "검색" : "전체"} Person track'));
  assert.ok(view.includes("전체 주 위치 구간"));
  assert.ok(view.includes("전체 counterparty 제외"));
  assert.ok(view.includes("전체 위치 미확정"));
  assert.ok(view.includes("전체 연대 미확정"));
});

test("interactive segment controls expose distinct historical context in their accessible names", async () => {
  const view = await fixture(viewUrl);
  assert.ok(view.includes('aria-label="${escapeHtml(`${track.display_name} · ${polityLabel(segment.activity)} · ${periodLabel(segment.activity)}`)}"'));
  assert.ok(view.includes('aria-label="${escapeHtml(`${track.display_name} · ${polityLabel(segment.activity)} · ${periodLabel(segment.activity)} · ${placementBasisLabel(segment)}`)}"'));
});

test("active track changes clear stale selection even without a search filter", async () => {
  const view = await fixture(viewUrl);
  const cleanup = "if (selectedPersonId && !activePersonIds.has(selectedPersonId)) {";
  assert.ok(view.includes(cleanup));
  assert.ok(!view.includes("if (needle && selectedPersonId && !activePersonIds.has(selectedPersonId)) {"));
  assert.ok(view.includes("selectedPersonId = null;"));
  assert.ok(view.includes("pendingFocusPersonId = null;"));
  const cleanupIndex = view.indexOf(cleanup);
  assert.ok(cleanupIndex < view.indexOf("const navigationItems = exploration.orderItems(projectedTracks);"));
  assert.ok(cleanupIndex < view.indexOf("const selectedTrack = compiled.partitioned.tracks.find"));
});

test("Person selection preserves zoom by default and detail is an explicit action", async () => {
  const view = await fixture(viewUrl);
  assert.ok(view.includes("const FOCUS_DETAIL_TIME_ZOOM = 2.2;"));
  assert.ok(view.includes('if (selectedPersonId && options.detail) {'));
  assert.ok(view.includes('horizontalViewMode = "detail";'));
  assert.ok(view.includes("timeCameraZoom = Math.max(timeCameraZoom, FOCUS_DETAIL_TIME_ZOOM);"));
  assert.ok(view.includes('id="spacetimeDetailPerson"'));
  assert.ok(view.includes("selectPerson(mount, selectedPersonId, { focus: true, detail: true })"));
});

test("single active Person disables inert previous and next controls and keyboard cycling", async () => {
  const view = await fixture(viewUrl);
  const css = await fixture(cssUrl);
  assert.ok(view.includes("function renderSelection(track, navigationCount = 0)"));
  assert.ok(view.includes("const canCycle = Number(navigationCount) > 1;"));
  assert.ok(view.includes('const cycleDisabled = canCycle ? "" : \' disabled aria-disabled="true"\';'));
  assert.ok(view.includes('id="spacetimePrevPerson" type="button"${cycleDisabled}'));
  assert.ok(view.includes('id="spacetimeNextPerson" type="button"${cycleDisabled}'));
  assert.ok(view.includes("renderSelection(selectedTrack, navigationItems.length)"));
  assert.ok(css.includes(".spacetime-selection-actions button:disabled,.spacetime-selection-actions button:disabled:hover{"));
  const keydownIndex = view.indexOf('scroll.addEventListener("keydown"');
  const guardIndex = view.indexOf('if ((command === "previous-person" || command === "next-person") && navigationItems.length <= 1) return;', keydownIndex);
  const preventDefaultIndex = view.indexOf("event.preventDefault();", keydownIndex);
  assert.ok(keydownIndex >= 0 && guardIndex > keydownIndex && guardIndex < preventDefaultIndex);
});

test("selection panel provides previous, focus, detail, next and clear exploration actions", async () => {
  const view = await fixture(viewUrl);
  const css = await fixture(cssUrl);
  for (const id of ["spacetimePrevPerson", "spacetimeFocusPerson", "spacetimeDetailPerson", "spacetimeNextPerson", "spacetimeClearPerson"]) {
    assert.ok(view.includes(`id="${id}"`));
  }
  assert.ok(view.includes("exploration.adjacentPersonId(navigationItems, selectedPersonId, -1)"));
  assert.ok(view.includes("exploration.adjacentPersonId(navigationItems, selectedPersonId, 1)"));
  assert.ok(css.includes(".spacetime-selection-actions{"));
});

test("map keyboard navigation supports panning, Person cycling, focus, zoom and selection clearing", async () => {
  const view = await fixture(viewUrl);
  assert.ok(view.includes('scroll.addEventListener("keydown"'));
  assert.ok(view.includes("exploration.keyboardCommand(event)"));
  assert.ok(view.includes('command === "previous-person" || command === "next-person"'));
  assert.ok(view.includes('command === "focus-selected"'));
  assert.ok(view.includes('command === "zoom-in" || command === "zoom-out"'));
  assert.ok(view.includes('command === "clear-selection"'));
  assert.ok(view.includes('command.startsWith("page-") ? 0.8 : 0.22'));
  assert.ok(view.includes("Shift+↑/↓ 이전/다음 인물"));
});


test("spacetime activation refreshes Person data instead of reusing a stale resolved load promise", async () => {
  const view = await fixture(viewUrl);
  const activateIndex = view.indexOf("async function activate()");
  const refreshIndex = view.indexOf("loadPromise = null;", activateIndex);
  const ensureDataIndex = view.indexOf("await ensureData();", activateIndex);
  assert.ok(activateIndex >= 0);
  assert.ok(refreshIndex > activateIndex && refreshIndex < ensureDataIndex);
});


test("spacetime rerenders preserve keyboard focus for stable controls and the viewport", async () => {
  const view = await fixture(viewUrl);
  assert.match(view, /function captureRenderFocus\(mount\)/);
  assert.match(view, /document\.activeElement/);
  assert.match(view, /active\.classList\?\.contains\?\.\("spacetime-scroll"\)/);
  assert.match(view, /function restoreRenderFocus\(mount, snapshot\)/);
  assert.match(view, /target\.focus\(\{ preventScroll: true \}\)/);
  assert.ok(view.includes('id="spacetimeSearchResult-${escapeHtml(item.person_id)}"'));
  const renderIndex = view.indexOf("function renderInto(mount)");
  const captureIndex = view.indexOf("const renderFocus = captureRenderFocus(mount);", renderIndex);
  const innerHtmlIndex = view.indexOf("mount.innerHTML =", renderIndex);
  const restoreIndex = view.indexOf("restoreRenderFocus(mount, renderFocus);", renderIndex);
  assert.ok(renderIndex >= 0 && captureIndex > renderIndex && captureIndex < innerHtmlIndex);
  assert.ok(restoreIndex > innerHtmlIndex, "focus must be restored only after the replacement DOM is bound");
});


test("stale reactivation fetches cannot overwrite newer spacetime data", async () => {
  const view = await fixture(viewUrl);
  assert.ok(view.includes("let dataLoadGeneration = 0;"));
  const ensureIndex = view.indexOf("async function ensureData()");
  const captureIndex = view.indexOf("const generation = dataLoadGeneration;", ensureIndex);
  const staleGuardIndex = view.indexOf("if (generation !== dataLoadGeneration) return false;", ensureIndex);
  const personsWriteIndex = view.indexOf("persons = personResult.persons || [];", ensureIndex);
  assert.ok(ensureIndex >= 0 && captureIndex > ensureIndex);
  assert.ok(staleGuardIndex > captureIndex && staleGuardIndex < personsWriteIndex);

  const activateIndex = view.indexOf("async function activate()");
  const invalidateIndex = view.indexOf("dataLoadGeneration += 1;", activateIndex);
  const clearPromiseIndex = view.indexOf("loadPromise = null;", activateIndex);
  const ensureDataIndex = view.indexOf("await ensureData();", activateIndex);
  assert.ok(invalidateIndex > activateIndex && invalidateIndex < clearPromiseIndex);
  assert.ok(clearPromiseIndex < ensureDataIndex);
  assert.ok(view.includes("if (generation === dataLoadGeneration) loadPromise = null;"));
});
