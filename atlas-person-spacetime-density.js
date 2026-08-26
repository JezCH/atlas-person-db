((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_DENSITY = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const DEFAULT_CELL_WIDTH = 36;
  const DEFAULT_CELL_HEIGHT = 28;
  const LEGEND_LABEL = "ATLAS 등록 인물 밀도";
  const DATA_BASIS = "unique_registered_person_activity_density";
  const SPATIAL_BASIS = "reviewed_activity_spatial_extent";
  const EPSILON = 1e-9;

  function positive(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) throw new RangeError(`${label} must be > 0`);
    return number;
  }

  function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function cellKey(column, row) {
    return `${column}:${row}`;
  }

  function normalizeRect(rectInput, canvas) {
    const left = clamp(finite(rectInput?.left) ?? 0, 0, canvas.width);
    const top = clamp(finite(rectInput?.top) ?? 0, 0, canvas.height);
    const right = clamp(finite(rectInput?.right) ?? canvas.width, left, canvas.width);
    const bottom = clamp(finite(rectInput?.bottom) ?? canvas.height, top, canvas.height);
    return Object.freeze({ left, top, right, bottom, width: right - left, height: bottom - top });
  }

  function segmentGeometry(segment, projection, canvas) {
    const startOrdinal = finite(segment?.start_ordinal);
    const endOrdinal = finite(segment?.end_ordinal);
    const anchor = finite(segment?.x_anchor);
    const minSpace = finite(segment?.x_min) ?? anchor;
    const maxSpace = finite(segment?.x_max) ?? anchor;
    if (startOrdinal == null || endOrdinal == null || minSpace == null || maxSpace == null || !projection?.yForOrdinal) return null;

    const yStart = finite(projection.yForOrdinal(startOrdinal));
    const yEnd = finite(projection.yForOrdinal(endOrdinal));
    if (yStart == null || yEnd == null) return null;

    const left = clamp(Math.min(minSpace, maxSpace) * canvas.width, 0, canvas.width);
    const right = clamp(Math.max(minSpace, maxSpace) * canvas.width, 0, canvas.width);
    const top = clamp(Math.min(yStart, yEnd), 0, canvas.height);
    const bottom = clamp(Math.max(yStart, yEnd), 0, canvas.height);
    return Object.freeze({ left, right, top, bottom });
  }

  function buildDensityField(partitionedTracks, projection, canvasInput, options = {}) {
    const canvas = Object.freeze({
      width: positive(canvasInput?.width, "canvas.width"),
      height: positive(canvasInput?.height, "canvas.height")
    });
    const cellWidth = positive(options.cellWidth ?? DEFAULT_CELL_WIDTH, "cellWidth");
    const cellHeight = positive(options.cellHeight ?? DEFAULT_CELL_HEIGHT, "cellHeight");
    const columns = Math.max(1, Math.ceil(canvas.width / cellWidth));
    const rows = Math.max(1, Math.ceil(canvas.height / cellHeight));
    const visibleRect = normalizeRect(options.visibleRect, canvas);
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
        const geometry = segmentGeometry(segment, projection, canvas);
        if (!geometry) continue;
        if (geometry.right < visibleRect.left - EPSILON || geometry.left > visibleRect.right + EPSILON || geometry.bottom < visibleRect.top - EPSILON || geometry.top > visibleRect.bottom + EPSILON) continue;

        const clippedLeft = clamp(Math.max(geometry.left, visibleRect.left), 0, canvas.width);
        const clippedRight = clamp(Math.min(geometry.right, visibleRect.right), 0, canvas.width);
        const clippedTop = clamp(Math.max(geometry.top, visibleRect.top), 0, canvas.height);
        const clippedBottom = clamp(Math.min(geometry.bottom, visibleRect.bottom), 0, canvas.height);

        const effectiveLeft = Math.min(clippedLeft, Math.max(0, canvas.width - EPSILON));
        const effectiveRight = Math.max(effectiveLeft, clippedRight - EPSILON);
        const effectiveTop = Math.min(clippedTop, Math.max(0, canvas.height - EPSILON));
        const effectiveBottom = Math.max(effectiveTop, clippedBottom - EPSILON);
        const firstColumn = clamp(Math.floor(effectiveLeft / cellWidth), 0, columns - 1);
        const lastColumn = clamp(Math.floor(effectiveRight / cellWidth), 0, columns - 1);
        const firstRow = clamp(Math.floor(effectiveTop / cellHeight), 0, rows - 1);
        const lastRow = clamp(Math.floor(effectiveBottom / cellHeight), 0, rows - 1);

        for (let row = firstRow; row <= lastRow; row += 1) {
          for (let column = firstColumn; column <= lastColumn; column += 1) {
            ensureCell(column, row).people.add(personId);
            personCovered = true;
          }
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
        const right = Math.min(canvas.width, left + cellWidth);
        const bottom = Math.min(canvas.height, top + cellHeight);
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
      canvas,
      visible_rect: visibleRect,
      cell_width: cellWidth,
      cell_height: cellHeight,
      column_count: columns,
      row_count: rows,
      cells: Object.freeze(output),
      max_count: maxCount,
      covered_person_count: coveredPeople.size,
      legend_label: LEGEND_LABEL,
      data_basis: DATA_BASIS,
      spatial_basis: SPATIAL_BASIS,
      interpretation_note: "화면의 밀도는 ATLAS에 등록되어 현재 검토된 Activity 공간 범위와 시간 구간에 배치된 고유 인물 수입니다. 실제 역사 인구·지정학적 권력·편집상 중요도를 뜻하지 않습니다."
    });
  }

  return Object.freeze({
    DEFAULT_CELL_WIDTH,
    DEFAULT_CELL_HEIGHT,
    LEGEND_LABEL,
    DATA_BASIS,
    SPATIAL_BASIS,
    cellKey,
    normalizeRect,
    segmentGeometry,
    buildDensityField
  });
});
