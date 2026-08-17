const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value); }
function replaceOnce(path, before, after) {
  const source = read(path);
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing expected block in ${path}: ${before.slice(0, 80)}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Expected unique block in ${path}`);
  write(path, source.slice(0, first) + after + source.slice(first + before.length));
}

const modelPath = 'atlas-person-spacetime-model.js';
replaceOnce(modelPath,
'  const PLACEMENT_BASES = new Set(["polity_geography", "capital"]);\n  const SPATIAL_INDEX_SCHEMA = "atlas-polity-spatial-index/v1";',
'  const PLACEMENT_BASES = new Set(["polity_geography", "capital", "authority_center"]);\n  const AUTHORITY_CENTER_TYPES = new Set(["imperial_court_core", "royal_court", "political_center"]);\n  const SPATIAL_INDEX_SCHEMA = "atlas-polity-spatial-index/v1";');

replaceOnce(modelPath,
'  function validateSpatialIndex(value) {',
`  function validateAuthorityCenterPeriod(period, polityId, index) {
    const regionCode = text(period?.region_code);
    const startYear = period?.start_year == null ? null : Number(period.start_year);
    const endYear = period?.end_year == null ? null : Number(period.end_year);
    const errors = [];
    if (!REGION_CODES.has(regionCode)) errors.push(\`invalid region_code: \${regionCode || "(empty)"}\`);
    if (!text(period?.center_name)) errors.push("center_name is required");
    const centerType = text(period?.center_type);
    if (!AUTHORITY_CENTER_TYPES.has(centerType)) errors.push(\`invalid center_type: \${centerType || "(empty)"}\`);
    if (startYear != null && (!Number.isInteger(startYear) || startYear === 0)) errors.push("start_year must be a historical integer year or null");
    if (endYear != null && (!Number.isInteger(endYear) || endYear === 0)) errors.push("end_year must be a historical integer year or null");
    if (startYear != null && endYear != null && normalizeInterval(startYear, endYear)?.reversed_input) errors.push("start_year must not be after end_year");
    const sourceRefs = Array.isArray(period?.source_refs) ? period.source_refs.map(text).filter(Boolean) : [];
    if (!sourceRefs.length) errors.push("source_refs must contain at least one reviewed source reference");
    const confidence = text(period?.confidence);
    if (!ALLOWED_CONFIDENCE.has(confidence)) errors.push(\`invalid confidence: \${confidence || "(empty)"}\`);
    return errors.map((message) => \`authority_center_records[\${index}] polity \${polityId}: \${message}\`);
  }

  function validateSpatialIndex(value) {`);

replaceOnce(modelPath,
'    if (!Array.isArray(value.capital_records)) errors.push("capital_records must be an array");\n    if (value.review_queue != null && !Array.isArray(value.review_queue)) errors.push("review_queue must be an array when present");',
'    if (!Array.isArray(value.capital_records)) errors.push("capital_records must be an array");\n    if (value.authority_center_records != null && !Array.isArray(value.authority_center_records)) errors.push("authority_center_records must be an array when present");\n    if (value.review_queue != null && !Array.isArray(value.review_queue)) errors.push("review_queue must be an array when present");');

replaceOnce(modelPath,
'    const reviewSeen = new Set();',
`    for (const [index, record] of (Array.isArray(value.authority_center_records) ? value.authority_center_records : []).entries()) {
      const polityId = text(record?.polity_id);
      if (!polityId) errors.push(\`authority_center_records[\${index}]: polity_id is required\`);
      if (resolved.has(polityId)) errors.push(\`authority_center_records[\${index}]: polity_id \${polityId} is already resolved\`);
      if (polityId) resolved.add(polityId);
      if (!Array.isArray(record?.authority_periods) || !record.authority_periods.length) {
        errors.push(\`authority_center_records[\${index}] polity \${polityId}: authority_periods must be a non-empty array\`);
      } else {
        for (const period of record.authority_periods) errors.push(...validateAuthorityCenterPeriod(period, polityId, index));
      }
    }

    const reviewSeen = new Set();`);

replaceOnce(modelPath,
`    for (const record of index.capital_records || []) {
      lookup.set(text(record.polity_id), Object.freeze({ placement_basis: "capital", capital_periods: record.capital_periods.slice() }));
    }
    return lookup;`,
`    for (const record of index.capital_records || []) {
      lookup.set(text(record.polity_id), Object.freeze({ placement_basis: "capital", capital_periods: record.capital_periods.slice() }));
    }
    for (const record of index.authority_center_records || []) {
      lookup.set(text(record.polity_id), Object.freeze({ placement_basis: "authority_center", authority_periods: record.authority_periods.slice() }));
    }
    return lookup;`);

replaceOnce(modelPath,
`    const activityStart = interval.start_ordinal;
    const activityEnd = interval.end_ordinal;
    const segments = [];
    for (const period of record.capital_periods || []) {
      const { startOrdinal, endOrdinal } = periodOrdinals(period);
      const overlapStart = Math.max(activityStart, startOrdinal);
      const overlapEnd = Math.min(activityEnd, endOrdinal);
      if (overlapStart > overlapEnd) continue;
      segments.push(Object.freeze({
        activity_id: activityId,
        polity_id: polityId,
        region_code: text(period.region_code),
        placement_basis: "capital",
        location_label: text(period.capital_name),
        capital_name: text(period.capital_name),
        capital_place_id: text(period.capital_place_id) || null,
        confidence: text(period.confidence),
        source_refs: Object.freeze((period.source_refs || []).map(text).filter(Boolean)),
        start_year: ordinalToHistoricalYear(overlapStart),
        end_year: ordinalToHistoricalYear(overlapEnd),
        partial_activity_interval: false
      }));
    }
    if (!segments.length) {
      return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "capital_period_no_overlap", segments: Object.freeze([]) });
    }
    return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "placed", segments: Object.freeze(segments) });`,
`    const activityStart = interval.start_ordinal;
    const activityEnd = interval.end_ordinal;
    const isAuthorityCenter = record.placement_basis === "authority_center";
    const periods = isAuthorityCenter ? (record.authority_periods || []) : (record.capital_periods || []);
    const segments = [];
    for (const period of periods) {
      const { startOrdinal, endOrdinal } = periodOrdinals(period);
      const overlapStart = Math.max(activityStart, startOrdinal);
      const overlapEnd = Math.min(activityEnd, endOrdinal);
      if (overlapStart > overlapEnd) continue;
      const locationName = isAuthorityCenter ? text(period.center_name) : text(period.capital_name);
      segments.push(Object.freeze({
        activity_id: activityId,
        polity_id: polityId,
        region_code: text(period.region_code),
        placement_basis: isAuthorityCenter ? "authority_center" : "capital",
        location_label: locationName,
        capital_name: isAuthorityCenter ? null : locationName,
        capital_place_id: isAuthorityCenter ? null : (text(period.capital_place_id) || null),
        authority_center_name: isAuthorityCenter ? locationName : null,
        authority_center_type: isAuthorityCenter ? text(period.center_type) : null,
        confidence: text(period.confidence),
        source_refs: Object.freeze((period.source_refs || []).map(text).filter(Boolean)),
        start_year: ordinalToHistoricalYear(overlapStart),
        end_year: ordinalToHistoricalYear(overlapEnd),
        partial_activity_interval: false
      }));
    }
    if (!segments.length) {
      const status = isAuthorityCenter ? "authority_center_period_no_overlap" : "capital_period_no_overlap";
      return Object.freeze({ activity_id: activityId, polity_id: polityId, status, segments: Object.freeze([]) });
    }
    return Object.freeze({ activity_id: activityId, polity_id: polityId, status: "placed", segments: Object.freeze(segments) });`);

const viewPath = 'atlas-person-spacetime-view.js';
replaceOnce(viewPath,
`  function placementBasisLabel(segment) {
    if (segment?.placement_basis === "capital") return \`수도: \${segment.location_label || segment.capital_name || "미상"}\`;
    return "검토된 정치체 권역";
  }`,
`  function placementBasisLabel(segment) {
    if (segment?.placement_basis === "capital") return \`수도: \${segment.location_label || segment.capital_name || "미상"}\`;
    if (segment?.placement_basis === "authority_center") return \`왕정·정치 중심: \${segment.location_label || segment.authority_center_name || "미상"}\`;
    return "검토된 정치체 권역";
  }`);
replaceOnce(viewPath,
'      spatial_unresolved: "검토된 정치체 권역·수도 기준 없음",\n      capital_period_no_overlap: "활동기간과 검토된 수도 기간이 겹치지 않음",',
'      spatial_unresolved: "검토된 정치체 권역·수도·왕정 중심 기준 없음",\n      capital_period_no_overlap: "활동기간과 검토된 수도 기간이 겹치지 않음",\n      authority_center_period_no_overlap: "활동기간과 검토된 왕정·정치 중심 기간이 겹치지 않음",');
replaceOnce(viewPath,
'    const capitalCount = Array.isArray(spatialIndex?.capital_records) ? spatialIndex.capital_records.length : 0;\n    const reviewCount = Array.isArray(spatialIndex?.review_queue) ? spatialIndex.review_queue.length : 0;',
'    const capitalCount = Array.isArray(spatialIndex?.capital_records) ? spatialIndex.capital_records.length : 0;\n    const authorityCount = Array.isArray(spatialIndex?.authority_center_records) ? spatialIndex.authority_center_records.length : 0;\n    const reviewCount = Array.isArray(spatialIndex?.review_queue) ? spatialIndex.review_queue.length : 0;');
replaceOnce(viewPath,
'      <div class="spacetime-toolbar-copy"><p class="eyebrow">PERSON SPACETIME ATLAS</p><h2>시공간 인물도</h2><p>세로는 역사 시간, 가로는 검토된 정치체 권역입니다. 정치체의 위치가 광역적으로 애매한 경우에만 해당 활동 시기의 수도를 기준으로 판정합니다.</p></div>',
'      <div class="spacetime-toolbar-copy"><p class="eyebrow">PERSON SPACETIME ATLAS</p><h2>시공간 인물도</h2><p>세로는 역사 시간, 가로는 검토된 정치체 권역입니다. 광역 위치가 애매하면 당시 수도를 사용하고, 고정 수도가 성립하지 않는 유목·순회 왕정에 한해서만 검토된 왕정·정치 중심을 보조 기준으로 사용합니다.</p></div>');
replaceOnce(viewPath,
'      <span><b>${entries.length}</b> Activity</span><span><b>${placedCount}</b> 배치 구간</span><span><b>${placement.unresolvedPosition.length}</b> 위치 미확정</span><span><b>${placement.unresolvedChronology.length}</b> 연대 미확정</span><span><b>${directCount}</b> 정치체 권역</span><span><b>${capitalCount}</b> 수도 판정 Polity</span><span><b>${reviewCount}</b> 기준 검토 대기</span>',
'      <span><b>${entries.length}</b> Activity</span><span><b>${placedCount}</b> 배치 구간</span><span><b>${placement.unresolvedPosition.length}</b> 위치 미확정</span><span><b>${placement.unresolvedChronology.length}</b> 연대 미확정</span><span><b>${directCount}</b> 정치체 권역</span><span><b>${capitalCount}</b> 수도 판정 Polity</span><span><b>${authorityCount}</b> 왕정 중심 Polity</span><span><b>${reviewCount}</b> 기준 검토 대기</span>');
replaceOnce(viewPath,
'    ${(reviewCount || placement.unresolvedPosition.length) ? `<section class="spacetime-integrity-note card"><strong>근거 없는 위치는 자동 추정하지 않습니다.</strong><p>명확한 정치체는 검토된 광역 권역을 사용하고, 다지역 정치체는 검토된 당시 수도를 사용합니다. 아직 기준이 없는 정치체와 최신 신규 UUID는 아래 ‘위치 미확정’에 남아 공간 인덱스 검토 대상으로 보존됩니다.</p></section>` : ""}',
'    ${(reviewCount || placement.unresolvedPosition.length) ? `<section class="spacetime-integrity-note card"><strong>근거 없는 위치는 자동 추정하지 않습니다.</strong><p>명확한 정치체는 검토된 광역 권역, 다지역 정치체는 검토된 당시 수도를 사용합니다. 고정 수도가 없다고 확인된 경우에만 사료로 검토된 왕정·정치 중심을 사용하며, 그마저 특정할 수 없으면 ‘위치 미확정’으로 보존합니다.</p></section>` : ""}');
replaceOnce(viewPath,
'      <article class="card"><div class="spacetime-unresolved-head"><div><p class="eyebrow">PLACEMENT REVIEW</p><h3>위치 미확정</h3></div><strong>${placement.unresolvedPosition.length}</strong></div><p>검토된 정치체 권역 또는 필요한 당시 수도 기준이 없어 가로 위치를 확정하지 않은 Activity입니다.</p>${unresolvedRows(placement.unresolvedPosition)}</article>',
'      <article class="card"><div class="spacetime-unresolved-head"><div><p class="eyebrow">PLACEMENT REVIEW</p><h3>위치 미확정</h3></div><strong>${placement.unresolvedPosition.length}</strong></div><p>검토된 정치체 권역·당시 수도·필요한 왕정 중심 중 어느 기준도 확정할 수 없어 가로 위치를 만들지 않은 Activity입니다.</p>${unresolvedRows(placement.unresolvedPosition)}</article>');

const indexPath = 'atlas-polity-spatial-index.json';
const index = JSON.parse(read(indexPath));
index.generated_at = '2026-08-18T09:00:00+09:00';
index.policy = index.policy || {};
index.policy.no_fixed_capital_fallback = 'If a polity is explicitly documented as lacking a fixed capital, a reviewed contemporaneous royal/political authority center may be used; otherwise keep placement unresolved.';
index.authority_center_records = [{
  polity_id: 'd54c540c-f3fb-5d05-9dc0-26af4ee9815a',
  authority_periods: [
    {
      start_year: 1206,
      end_year: 1259,
      center_name: 'Mongolian imperial court core (Avarga–Karakorum)',
      center_type: 'imperial_court_core',
      region_code: 'central-asia',
      confidence: 'well_established',
      source_refs: [
        'UNESCO World Heritage Centre: Archaeological Site at Khuduu Aral and Surrounding Cultural Landscape',
        'Cambridge Antiquity: Mapping Karakorum, the capital of the Mongol Empire',
        'Cambridge Modern Asian Studies: The cosmopolitanism of Karakorum, capital of the Mongol empire in Mongolia'
      ]
    },
    {
      start_year: 1260,
      end_year: 1271,
      center_name: 'Kublai court in North China (Shangdu–Dadu)',
      center_type: 'imperial_court_core',
      region_code: 'east-asia',
      confidence: 'well_established',
      source_refs: [
        'Cambridge History of the Mongol Empire: Mongolia in the Mongol Empire',
        'UNESCO World Heritage Centre: Site of Xanadu',
        'Metropolitan Museum of Art: China, 1000–1400 A.D. chronology'
      ]
    }
  ]
}];
index.review_queue = (index.review_queue || []).filter((row) => row.polity_id !== 'd54c540c-f3fb-5d05-9dc0-26af4ee9815a');
write(indexPath, JSON.stringify(index, null, 2) + '\n');

const testPath = 'tests/person-spacetime-spatial-index-coverage.test.mjs';
replaceOnce(testPath,
'  assert.equal(index.capital_records.length, 10);\n  assert.equal(index.review_queue.length, 3);',
'  assert.equal(index.capital_records.length, 10);\n  assert.equal(index.authority_center_records.length, 1);\n  assert.equal(index.review_queue.length, 2);');
replaceOnce(testPath,
'  const refs = index.capital_records.flatMap((record) => record.capital_periods.flatMap((period) => period.source_refs || []));',
'  const refs = [\n    ...index.capital_records.flatMap((record) => record.capital_periods.flatMap((period) => period.source_refs || [])),\n    ...index.authority_center_records.flatMap((record) => record.authority_periods.flatMap((period) => period.source_refs || []))\n  ];');
replaceOnce(testPath,
`test("polities without a defensible single capital chronology remain unresolved instead of being guessed", () => {
  const lookup = model.createSpatialLookup(index);
  for (const polityId of [IDS.seleucid, IDS.mongol]) {
    assert.equal(lookup.has(polityId), false);
    const placement = model.resolveActivityPlacement(activity(polityId, 100, 101, polityId), lookup);
    assert.equal(placement.status, "spatial_unresolved");
  }
});`,
`test("Mongol activities use reviewed authority-center regions without pretending a fixed capital", () => {
  const lookup = model.createSpatialLookup(index);
  const cases = [
    ["genghis", 1206, 1227, "central-asia", "Mongolian imperial court core (Avarga–Karakorum)"],
    ["borte", 1206, 1230, "central-asia", "Mongolian imperial court core (Avarga–Karakorum)"],
    ["ogedei", 1229, 1241, "central-asia", "Mongolian imperial court core (Avarga–Karakorum)"],
    ["kublai", 1260, 1271, "east-asia", "Kublai court in North China (Shangdu–Dadu)"]
  ];
  for (const [id, start, end, region, center] of cases) {
    const placement = model.resolveActivityPlacement(activity(IDS.mongol, start, end, id), lookup);
    assert.equal(placement.status, "placed");
    assert.equal(placement.segments.length, 1);
    assert.equal(placement.segments[0].placement_basis, "authority_center");
    assert.equal(placement.segments[0].authority_center_type, "imperial_court_core");
    assert.equal(placement.segments[0].region_code, region);
    assert.equal(placement.segments[0].authority_center_name, center);
    contiguous(placement.segments, start, end);
  }
});

test("Seleucid activities remain unresolved because the peripatetic court had no fixed capital", () => {
  const lookup = model.createSpatialLookup(index);
  assert.equal(lookup.has(IDS.seleucid), false);
  const placement = model.resolveActivityPlacement(activity(IDS.seleucid, -305, -281, "seleucus"), lookup);
  assert.equal(placement.status, "spatial_unresolved");
});`);

console.log('Authority-center spatial contract staged successfully.');
