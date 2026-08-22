((root, factory) => {
  "use strict";
  const cameraApi = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-camera-v2.js")
    : root?.ATLAS_PERSON_SPACETIME_CAMERA_V2;
  const timeApi = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-time-scale-v2.js")
    : root?.ATLAS_PERSON_SPACETIME_TIME_SCALE_V2;
  const lodApi = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-lod-v2.js")
    : root?.ATLAS_PERSON_SPACETIME_LOD_V2;
  const api = factory(cameraApi, timeApi, lodApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_DENSITY_V2 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (cameraApi, timeApi, lodApi) => {
  "use strict";

  if (!cameraApi) throw new Error("ATLAS_PERSON_SPACETIME_CAMERA_V2 is required");
  if (!timeApi) throw new Error("ATLAS_PERSON_SPACETIME_TIME_SCALE_V2 is required");
  if (!lodApi) throw new Error("ATLAS_PERSON_SPACETIME_LOD_V2 is required");

  const DEFAULT_CELL_WIDTH = 36;
  const DEFAULT_CELL_HEIGHT = 28;
  const LEGEND_LABEL = "ATLAS 등록 인물 밀도";
  const DATA_BASIS = "unique_registered_person_activity_density";
  const EPSILON = 1e-9;

  function positive(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) throw new RangeError(`${label} must be > 0`);
    return number;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function cellKey(column, row) {
    return `${column}:${row}`;
  }

  function buildDensityField(partitionedTracks, semanticTimeScale, cameraInput, viewportInput, options = {}) {
    const viewport = cameraApi.normalizeViewport(viewportInput);
    const camera = cameraApi.createCamera(timeApi.TIME_WORLD_BOUNDS, { ...options, ...(cameraInput || {}) });
    const timeProjection = timeApi.createTimeProjection(semanticTimeScale, camera, viewport, options);
    const cellWidth = positive(options.cellWidth ?? DEFAULT_CELL_WIDTH, "cellWidth");
    const cellHeight = positive(options.cellHeight ?? DEFAULT_CELL_HEIGHT, "cellHeight");
    const columns = Math.max(1, Math.ceil(viewport.width / cellWidth));
    const rows = Math.max(1, Math.ceil(viewport.height / cellHeight));
    const cells = new Map();
    const coveredPeople = new Set();

    function ensureCell(column, row) {
      const key = cellKey(column, row);
      let record = cells.get(key);
      if (!record) {
        record = { column, row, people: new Set() };
        cells.set(key, record);
      }
      return record;
    }

    for (const track of Array.isArray(partitionedTracks?.tracks) ? partitionedTracks.tracks : []) {
      const personId = String(track?.person_id ?? track?.track_id ?? "");
      if (!personId) continue;
      let personCovered = false;
      for (const segment of Array.isArray(track?.primary_segments) ? track.primary_segments : []) {
        const projected = lodApi.projectSegment(segment, timeProjection, camera, viewport);
        if (!projected?.visible) continue;
        if (projected.screen_x < -EPSILON || projected.screen_x > viewport.width + EPSILON) continue;
        const x = clamp(projected.screen_x, 0, Math.max(0, viewport.width - EPSILON));
        const column = clamp(Math.floor(x / cellWidth), 0, columns - 1);
        const top = clamp(projected.screen_top, 0, viewport.height);
        const bottom = clamp(projected.screen_bottom, 0, viewport.height);
        const firstRow = clamp(Math.floor(top / cellHeight), 0, rows - 1);
        const effectiveBottom = Math.max(top, bottom - EPSILON);
        const lastRow = clamp(Math.floor(effectiveBottom / cellHeight), 0, rows - 1);
        for (let row = firstRow; row <= lastRow; row += 1) {
          ensureCell(column, row).people.add(personId);
          personCovered = true;
        }
      }
      if (personCovered) coveredPeople.add(personId);
    }

    const raw = [...cells.values()]
      .map((record) => ({ ...record, count: record.people.size }))
      .filter((record) => record.count > 0);
    const maxCount = raw.length ? Math.max(...raw.map((record) => record.count)) : 0;
    const denominator = maxCount > 0 ? Math.log1p(maxCount) : 1;
    const output = raw
      .sort((left, right) => left.row - right.row || left.column - right.column)
      .map((record) => {
        const left = record.column * cellWidth;
        const top = record.row * cellHeight;
        const right = Math.min(viewport.width, left + cellWidth);
        const bottom = Math.min(viewport.height, top + cellHeight);
        return Object.freeze({
          column: record.column,
          row: record.row,
          left,
          top,
          right,
          bottom,
          width: right - left,
          height: bottom - top,
          center_x: (left + right) / 2,
          center_y: (top + bottom) / 2,
          count: record.count,
          intensity: maxCount > 0 ? Math.log1p(record.count) / denominator : 0,
          person_ids: Object.freeze([...record.people].sort())
        });
      });

    return Object.freeze({
      camera,
      viewport,
      cell_width: cellWidth,
      cell_height: cellHeight,
      column_count: columns,
      row_count: rows,
      cells: Object.freeze(output),
      max_count: maxCount,
      covered_person_count: coveredPeople.size,
      legend_label: LEGEND_LABEL,
      data_basis: DATA_BASIS,
      interpretation_note: "화면의 밀도는 ATLAS에 등록되어 현재 시공간 구간에 배치된 고유 인물 수를 나타내며 실제 역사 인구·권력·중요도를 뜻하지 않습니다."
    });
  }

  return Object.freeze({
    DEFAULT_CELL_WIDTH,
    DEFAULT_CELL_HEIGHT,
    LEGEND_LABEL,
    DATA_BASIS,
    cellKey,
    buildDensityField
  });
});