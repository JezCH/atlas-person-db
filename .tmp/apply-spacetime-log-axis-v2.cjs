const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value); }
function replaceText(path, before, after) {
  const source = read(path);
  if (!source.includes(before)) throw new Error(`Missing text in ${path}: ${before.slice(0, 100)}`);
  if (source.indexOf(before) !== source.lastIndexOf(before)) throw new Error(`Expected unique text in ${path}`);
  write(path, source.replace(before, after));
}
function replaceRegex(path, pattern, after) {
  const source = read(path);
  const matches = source.match(pattern);
  if (!matches) throw new Error(`Missing regex in ${path}: ${pattern}`);
  write(path, source.replace(pattern, after));
}

const modelPath = 'atlas-person-spacetime-model.js';
const logFunctions = String.raw`  function createLogTimelineScale(startYear, endYear, height = 2800, softeningYears = 180) {
    const startOrdinal = historicalYearToOrdinal(startYear);
    const endOrdinal = historicalYearToOrdinal(endYear);
    if (startOrdinal == null || endOrdinal == null || startOrdinal >= endOrdinal) throw new Error("INVALID_TIMELINE_RANGE");
    const safeHeight = Number.isFinite(Number(height)) && Number(height) > 0 ? Number(height) : 2800;
    const softness = Number.isFinite(Number(softeningYears)) && Number(softeningYears) > 0 ? Number(softeningYears) : 180;
    const span = endOrdinal - startOrdinal;
    const denominator = Math.log1p(span / softness);

    function yForOrdinal(ordinal) {
      if (!Number.isFinite(Number(ordinal))) return null;
      const clamped = Math.min(endOrdinal, Math.max(startOrdinal, Number(ordinal)));
      const age = endOrdinal - clamped;
      return safeHeight * (1 - Math.log1p(age / softness) / denominator);
    }

    function yForYear(year) {
      const ordinal = historicalYearToOrdinal(year);
      return ordinal == null ? null : yForOrdinal(ordinal);
    }

    return Object.freeze({
      mode: "log_age",
      start_year: startYear,
      end_year: endYear,
      start_ordinal: startOrdinal,
      end_ordinal: endOrdinal,
      height: safeHeight,
      softening_years: softness,
      yForOrdinal,
      yForYear
    });
  }

  function adaptiveTickInterval(ageYears) {
    if (ageYears > 3500) return 1000;
    if (ageYears > 2200) return 500;
    if (ageYears > 1200) return 250;
    if (ageYears > 500) return 100;
    if (ageYears > 180) return 50;
    if (ageYears > 70) return 25;
    return 10;
  }

  function alignedHistoricalYear(year, interval) {
    if (!Number.isInteger(year) || year === 0) return false;
    return Math.abs(year) % interval === 0;
  }

  function buildAdaptiveTimeTicks(startYear, endYear, scale, minPixelGap = 24) {
    const startOrdinal = historicalYearToOrdinal(startYear);
    const endOrdinal = historicalYearToOrdinal(endYear);
    if (startOrdinal == null || endOrdinal == null || startOrdinal > endOrdinal || !scale?.yForYear) return Object.freeze([]);
    const candidates = new Map();
    const add = (year, intervalYears, terminal = false) => {
      if (!Number.isInteger(year) || year === 0) return;
      candidates.set(year, { year, interval_years: intervalYears, terminal });
    };
    add(startYear, adaptiveTickInterval(endOrdinal - startOrdinal), false);
    for (let ordinal = startOrdinal; ordinal <= endOrdinal; ordinal += 1) {
      const year = ordinalToHistoricalYear(ordinal);
      const age = endOrdinal - ordinal;
      const interval = adaptiveTickInterval(age);
      if (alignedHistoricalYear(year, interval)) add(year, interval, false);
    }
    add(endYear, 0, true);
    const sorted = [...candidates.values()].sort((left, right) => historicalYearToOrdinal(left.year) - historicalYearToOrdinal(right.year));
    const ticks = [];
    let lastY = Number.NEGATIVE_INFINITY;
    for (const candidate of sorted) {
      const y = scale.yForYear(candidate.year);
      if (!Number.isFinite(y)) continue;
      const isBoundary = candidate.year === startYear || candidate.year === endYear;
      if (!isBoundary && y - lastY < minPixelGap) continue;
      ticks.push(Object.freeze({ ...candidate, ordinal: historicalYearToOrdinal(candidate.year), label: yearLabel(candidate.year), y }));
      lastY = y;
    }
    return Object.freeze(ticks);
  }

`;
replaceText(modelPath, '  function buildCenturyTicks(startYear, endYear) {', logFunctions + '  function buildCenturyTicks(startYear, endYear) {');
replaceText(modelPath, '    buildCenturyTicks,\n    assignLanes', '    buildCenturyTicks,\n    createLogTimelineScale,\n    buildAdaptiveTimeTicks,\n    assignLanes');

const viewPath = 'atlas-person-spacetime-view.js';
replaceText(viewPath, '  const DEFAULT_CENTURY_HEIGHT = 36;', '  const DEFAULT_TIMELINE_HEIGHT = 2800;\n  const LOG_SOFTENING_YEARS = 180;');
replaceText(viewPath, '  let centuryHeight = DEFAULT_CENTURY_HEIGHT;', '  let timelineHeightSetting = DEFAULT_TIMELINE_HEIGHT;');
replaceRegex(viewPath, /  function ordinalDistance[\s\S]*?  function buildPlacement\(entries, lookup, timeline, pxPerYear\) \{/, String.raw`  function buildEraBands(range, scale) {
    const rangeStart = model.historicalYearToOrdinal(range.start_year);
    const rangeEnd = model.historicalYearToOrdinal(range.end_year);
    return ERA_DEFINITIONS.map((era) => {
      const eraStart = era.start_year == null ? rangeStart : model.historicalYearToOrdinal(era.start_year);
      const eraEnd = era.end_year == null ? rangeEnd : model.historicalYearToOrdinal(era.end_year);
      if (eraStart == null || eraEnd == null) return null;
      const start = Math.max(rangeStart, eraStart);
      const end = Math.min(rangeEnd, eraEnd);
      if (start > end) return null;
      const top = scale.yForOrdinal(start);
      const bottom = end >= rangeEnd ? scale.height : scale.yForOrdinal(end + 1);
      return { ...era, top, height: Math.max(1, bottom - top) };
    }).filter(Boolean);
  }

  function buildPlacement(entries, lookup, scale) {`);
replaceText(viewPath,
  '        const top = yForYear(segment.start_year, timeline.start_year, pxPerYear);\n        const bottom = yForYear(segment.end_year, timeline.start_year, pxPerYear);',
  '        const top = scale.yForYear(segment.start_year);\n        const bottom = scale.yForYear(segment.end_year);');
replaceRegex(viewPath,
  /    const timeline = model\.deriveTimelineRange\(allEntries\.map\(\(entry\) => entry\.activity\), new Date\(\)\.getFullYear\(\)\);\n    const pxPerYear = centuryHeight \/ 100;\n    const timelineHeight = Math\.max\(800, yForYear\(timeline\.end_year, timeline\.start_year, pxPerYear\) \+ 2\);\n    const lookup = model\.createSpatialLookup\(spatialIndex\);\n    const placement = buildPlacement\(entries, lookup, timeline, pxPerYear\);\n    const ticks = model\.buildCenturyTicks\(timeline\.start_year, timeline\.end_year\);\n    const eras = buildEraBands\(timeline, pxPerYear\);/,
  '    const timeline = model.deriveTimelineRange(allEntries.map((entry) => entry.activity), new Date().getFullYear());\n    const timelineScale = model.createLogTimelineScale(timeline.start_year, timeline.end_year, timelineHeightSetting, LOG_SOFTENING_YEARS);\n    const timelineHeight = timelineScale.height;\n    const lookup = model.createSpatialLookup(spatialIndex);\n    const placement = buildPlacement(entries, lookup, timelineScale);\n    const ticks = model.buildAdaptiveTimeTicks(timeline.start_year, timeline.end_year, timelineScale);\n    const eras = buildEraBands(timeline, timelineScale);');
replaceText(viewPath,
  '세로는 역사 시간, 가로는 검토된 정치체 권역입니다. 광역 위치가 애매하면 당시 수도를 사용하고, 고정 수도가 성립하지 않는 유목·순회 왕정에 한해서만 검토된 왕정·정치 중심을 보조 기준으로 사용합니다.',
  '세로축은 현재에 가까울수록 연도 간격이 넓어지는 로그 시간축입니다. 고대는 압축하고 근현대는 세분화해 인물 밀집을 완화합니다. 가로 위치는 검토된 정치체 권역·당시 수도·필요한 왕정 중심 기준을 사용합니다.');
replaceRegex(viewPath,
  /<label>100년 높이<select id="spacetimeScale">[\s\S]*?<\/select><\/label>/,
  '<label>시간축 밀도<select id="spacetimeScale"><option value="2200"${timelineHeightSetting === 2200 ? " selected" : ""}>압축</option><option value="2800"${timelineHeightSetting === 2800 ? " selected" : ""}>기본</option><option value="3600"${timelineHeightSetting === 3600 ? " selected" : ""}>확대</option></select></label>');
replaceText(viewPath,
  '${yForYear(tick.year, timeline.start_year, pxPerYear)}',
  '${tick.y}');
replaceRegex(viewPath,
  /    mount\.querySelector\("#spacetimeScale"\)\?\.addEventListener\("change", \(event\) => \{\n      centuryHeight = Number\(event\.target\.value\) \|\| DEFAULT_CENTURY_HEIGHT;\n      renderInto\(mount\);\n    \}\);/,
  '    mount.querySelector("#spacetimeScale")?.addEventListener("change", (event) => {\n      timelineHeightSetting = Number(event.target.value) || DEFAULT_TIMELINE_HEIGHT;\n      renderInto(mount);\n    });');

const testPath = 'tests/person-spacetime-model.test.mjs';
const testSource = read(testPath);
if (testSource.includes('logarithmic timeline gives recent centuries more vertical space')) throw new Error('log-axis tests already present');
write(testPath, testSource + String.raw`

test("logarithmic timeline gives recent centuries more vertical space", () => {
  const scale = model.createLogTimelineScale(-3000, 2026, 2800, 180);
  assert.equal(scale.yForYear(-3000), 0);
  assert.ok(Math.abs(scale.yForYear(2026) - 2800) < 1e-9);
  const ancientCentury = scale.yForYear(-1900) - scale.yForYear(-2000);
  const modernCentury = scale.yForYear(2000) - scale.yForYear(1900);
  assert.ok(modernCentury > ancientCentury * 4, ` + '`' + `expected modern century to be much wider: ancient=${ancientCentury}, modern=${modernCentury}` + '`' + `);
});

test("adaptive log ticks become finer toward the present and never emit year zero", () => {
  const scale = model.createLogTimelineScale(-3000, 2026, 2800, 180);
  const ticks = model.buildAdaptiveTimeTicks(-3000, 2026, scale);
  assert.equal(ticks.some((tick) => tick.year === 0), false);
  assert.equal(ticks[0].year, -3000);
  assert.equal(ticks.at(-1).year, 2026);
  const ancient = ticks.filter((tick) => tick.year >= -3000 && tick.year <= -1000).map((tick) => tick.interval_years).filter(Boolean);
  const recent = ticks.filter((tick) => tick.year >= 1950).map((tick) => tick.interval_years).filter(Boolean);
  assert.ok(Math.min(...ancient) >= 250);
  assert.ok(Math.min(...recent) <= 25);
  for (let index = 1; index < ticks.length; index += 1) assert.ok(ticks[index].y > ticks[index - 1].y);
});
`);

console.log('Spacetime logarithmic axis staged successfully.');
