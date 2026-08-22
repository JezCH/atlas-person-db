(() => {
  "use strict";

  const DEFAULT_CARD_HEIGHT = 24;
  const DEFAULT_GAP = 3;
  const DEFAULT_GUTTER = 4;
  const DEFAULT_MIN_CARD_WIDTH = 48;
  const DEFAULT_MAX_COLUMNS = 3;
  const DEFAULT_SEARCH_RINGS = 8;

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  function candidateOffsets(step, rings) {
    const values = [0];
    for (let index = 1; index <= rings; index += 1) {
      values.push(-index * step, index * step);
    }
    return values;
  }

  function overlaps(top, bottom, intervals, gap) {
    return intervals.some((interval) => top < interval.bottom + gap && bottom > interval.top - gap);
  }

  function rectangleOverlaps(a, b, gap = 0) {
    return (
      a.left < b.left + b.width + gap &&
      a.left + a.width > b.left - gap &&
      a.top < b.top + b.height + gap &&
      a.top + a.height > b.top - gap
    );
  }

  function chooseColumnCount(regionWidth, options = {}) {
    const gutter = number(options.gutter, DEFAULT_GUTTER);
    const minCardWidth = number(options.minCardWidth, DEFAULT_MIN_CARD_WIDTH);
    const maxColumns = Math.max(1, Math.floor(number(options.maxColumns, DEFAULT_MAX_COLUMNS)));
    const usable = Math.max(minCardWidth, number(regionWidth) - gutter * 2);
    const byWidth = Math.max(1, Math.floor((usable + gutter) / (minCardWidth + gutter)));
    return Math.max(1, Math.min(maxColumns, byWidth));
  }

  function fallbackCandidates(occupied, anchorY, cardHeight, canvasHeight, gap) {
    const positions = [anchorY, 0, Math.max(0, canvasHeight - cardHeight)];
    for (const interval of occupied) {
      positions.push(interval.bottom + gap, interval.top - cardHeight - gap);
    }
    return [...new Set(positions.map((value) => clamp(value, 0, canvasHeight - cardHeight)))];
  }

  function packRegionLabels(items, options = {}) {
    const regionLeft = number(options.regionLeft);
    const regionWidth = Math.max(DEFAULT_MIN_CARD_WIDTH, number(options.regionWidth, DEFAULT_MIN_CARD_WIDTH));
    const canvasHeight = Math.max(DEFAULT_CARD_HEIGHT, number(options.canvasHeight, 4200));
    const cardHeight = Math.max(1, number(options.cardHeight, DEFAULT_CARD_HEIGHT));
    const gap = Math.max(0, number(options.gap, DEFAULT_GAP));
    const gutter = Math.max(0, number(options.gutter, DEFAULT_GUTTER));
    const columns = Math.max(1, Math.floor(number(options.columns, chooseColumnCount(regionWidth, options))));
    const searchRings = Math.max(1, Math.floor(number(options.searchRings, DEFAULT_SEARCH_RINGS)));
    const usableWidth = Math.max(DEFAULT_MIN_CARD_WIDTH, regionWidth - gutter * 2);
    const columnWidth = Math.max(
      DEFAULT_MIN_CARD_WIDTH,
      (usableWidth - gutter * Math.max(0, columns - 1)) / columns
    );
    const verticalStep = Math.max(cardHeight + gap, number(options.verticalStep, cardHeight + gap));
    const offsets = candidateOffsets(verticalStep, searchRings);
    const occupied = Array.from({ length: columns }, () => []);
    const sorted = [...(items || [])].sort((a, b) => {
      const y = number(a.anchorY) - number(b.anchorY);
      if (y !== 0) return y;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
    const results = [];

    for (const item of sorted) {
      const anchorY = clamp(number(item.anchorY), 0, canvasHeight - cardHeight);
      const anchorX = number(item.anchorX, regionLeft + gutter);
      let best = null;

      for (const offset of offsets) {
        for (let column = 0; column < columns; column += 1) {
          const top = clamp(anchorY + offset, 0, canvasHeight - cardHeight);
          const bottom = top + cardHeight;
          if (overlaps(top, bottom, occupied[column], gap)) continue;
          const left = regionLeft + gutter + column * (columnWidth + gutter);
          const centerX = left + columnWidth / 2;
          const score = Math.abs(top - anchorY) + Math.abs(centerX - anchorX) * 0.08;
          if (!best || score < best.score) best = { top, left, column, score };
        }
        if (best && Math.abs(best.top - anchorY) <= Math.abs(offset)) break;
      }

      if (!best) {
        for (let column = 0; column < columns; column += 1) {
          const left = regionLeft + gutter + column * (columnWidth + gutter);
          const centerX = left + columnWidth / 2;
          for (const top of fallbackCandidates(occupied[column], anchorY, cardHeight, canvasHeight, gap)) {
            const bottom = top + cardHeight;
            if (overlaps(top, bottom, occupied[column], gap)) continue;
            const score = Math.abs(top - anchorY) + Math.abs(centerX - anchorX) * 0.08;
            if (!best || score < best.score) best = { top, left, column, score };
          }
        }
      }

      if (!best) {
        let column = 0;
        for (let index = 1; index < columns; index += 1) {
          if (occupied[index].length < occupied[column].length) column = index;
        }
        const last = occupied[column][occupied[column].length - 1];
        const top = clamp(last ? last.bottom + gap : anchorY, 0, canvasHeight - cardHeight);
        best = {
          top,
          left: regionLeft + gutter + column * (columnWidth + gutter),
          column,
          score: Number.POSITIVE_INFINITY
        };
      }

      const placement = {
        id: item.id,
        anchorX,
        anchorY,
        left: best.left,
        top: best.top,
        width: columnWidth,
        height: cardHeight,
        column: best.column
      };
      occupied[best.column].push({ top: placement.top, bottom: placement.top + cardHeight });
      occupied[best.column].sort((a, b) => a.top - b.top);
      results.push(placement);
    }

    return results;
  }

  function parseStyleNumber(element, property) {
    if (!element) return 0;
    return number(element.style?.[property], number(getComputedStyle(element)[property]));
  }

  function makeConnectorLayer(canvas) {
    canvas.querySelector(".spacetime-label-connector-layer")?.remove();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("spacetime-label-connector-layer");
    svg.setAttribute("width", String(canvas.clientWidth || parseStyleNumber(canvas, "width")));
    svg.setAttribute("height", String(canvas.clientHeight || parseStyleNumber(canvas, "height")));
    svg.setAttribute("aria-hidden", "true");
    canvas.prepend(svg);
    return svg;
  }

  function addConnector(layer, anchorX, anchorY, placement) {
    const targetX = anchorX <= placement.left
      ? placement.left
      : placement.left + placement.width;
    const targetY = placement.top + placement.height / 2;
    if (Math.abs(targetY - anchorY) < 5 && Math.abs(targetX - anchorX) < 12) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(anchorX));
    line.setAttribute("y1", String(anchorY));
    line.setAttribute("x2", String(targetX));
    line.setAttribute("y2", String(targetY));
    layer.appendChild(line);
  }

  function injectStyles() {
    if (document.getElementById("atlasSpacetimeLabelPackingStyles")) return;
    const style = document.createElement("style");
    style.id = "atlasSpacetimeLabelPackingStyles";
    style.textContent = `
      .spacetime-label-connector-layer{position:absolute;inset:0;z-index:5;pointer-events:none;overflow:visible}
      .spacetime-label-connector-layer line{stroke:#9aa9bd;stroke-width:1;opacity:.58;vector-effect:non-scaling-stroke}
      .spacetime-frame.is-overview .spacetime-person-card.is-overview[data-label-packed="true"]{z-index:8}
      .spacetime-frame.is-overview .spacetime-person-card.is-overview.is-label-shifted{background:rgba(255,255,255,.9)}
      .spacetime-frame.is-overview .spacetime-person-anchor{z-index:4}
    `;
    document.head.appendChild(style);
  }

  function regionDescriptors(frame) {
    return [...frame.querySelectorAll(".spacetime-region-head > div")].map((element) => ({
      left: parseStyleNumber(element, "left"),
      width: parseStyleNumber(element, "width")
    })).filter((region) => region.width > 0);
  }

  function findRegion(regions, anchorX) {
    return regions.find((region, index) => (
      anchorX >= region.left &&
      (anchorX < region.left + region.width || index === regions.length - 1)
    )) || regions[regions.length - 1] || null;
  }

  function repackFrame(frame) {
    if (!frame?.classList?.contains("is-overview")) return false;
    if (frame.dataset.atlasLabelPacked === "1") return false;
    const canvas = frame.querySelector(".spacetime-canvas");
    if (!canvas) return false;
    const cards = [...canvas.querySelectorAll(".spacetime-person-card.is-overview")];
    if (!cards.length) {
      frame.dataset.atlasLabelPacked = "1";
      return true;
    }

    const regions = regionDescriptors(frame);
    if (!regions.length) return false;
    const canvasHeight = canvas.clientHeight || parseStyleNumber(canvas, "height");
    const groups = new Map(regions.map((region, index) => [index, { region, items: [] }]));

    for (const card of cards) {
      const anchor = card.previousElementSibling?.classList?.contains("spacetime-person-anchor")
        ? card.previousElementSibling
        : null;
      if (!anchor) continue;
      const anchorX = parseStyleNumber(anchor, "left");
      const anchorY = parseStyleNumber(anchor, "top");
      const region = findRegion(regions, anchorX);
      const regionIndex = regions.indexOf(region);
      if (regionIndex < 0) continue;
      groups.get(regionIndex).items.push({
        id: card.dataset.spacetimeKey || String(groups.get(regionIndex).items.length),
        anchorX,
        anchorY,
        card,
        anchor
      });
    }

    const connectorLayer = makeConnectorLayer(canvas);
    for (const { region, items } of groups.values()) {
      if (!items.length) continue;
      const placements = packRegionLabels(items, {
        regionLeft: region.left,
        regionWidth: region.width,
        canvasHeight,
        cardHeight: DEFAULT_CARD_HEIGHT,
        gap: DEFAULT_GAP,
        gutter: DEFAULT_GUTTER,
        maxColumns: DEFAULT_MAX_COLUMNS
      });
      const placementById = new Map(placements.map((placement) => [String(placement.id), placement]));

      for (const item of items) {
        const placement = placementById.get(String(item.id));
        if (!placement) continue;
        item.card.style.left = `${placement.left}px`;
        item.card.style.top = `${placement.top}px`;
        item.card.style.width = `${placement.width}px`;
        item.card.dataset.labelPacked = "true";
        item.card.dataset.labelOriginTop = String(item.anchorY);
        item.card.classList.toggle(
          "is-label-shifted",
          Math.abs(placement.top - item.anchorY) >= 5 || Math.abs(placement.left - item.anchorX) >= 12
        );
        addConnector(
          connectorLayer,
          item.anchorX + Math.max(1, parseStyleNumber(item.anchor, "width") / 2),
          item.anchorY + 2,
          placement
        );
      }
    }

    frame.dataset.atlasLabelPacked = "1";
    return true;
  }

  function repackAll() {
    let packed = 0;
    for (const frame of document.querySelectorAll(".spacetime-frame.is-overview")) {
      if (repackFrame(frame)) packed += 1;
    }
    return packed;
  }

  function install() {
    injectStyles();
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        repackAll();
      });
    };

    const observer = new MutationObserver(() => schedule());
    observer.observe(document.body, { childList: true, subtree: true });

    for (const eventName of ["input", "change", "click"]) {
      document.addEventListener(eventName, (event) => {
        if (event.target?.closest?.("#personSpacetimeMount")) schedule();
      }, true);
    }
    window.addEventListener("resize", () => {
      requestAnimationFrame(() => requestAnimationFrame(schedule));
    });

    schedule();
    return Object.freeze({ observer, schedule });
  }

  const api = Object.freeze({
    chooseColumnCount,
    packRegionLabels,
    rectangleOverlaps,
    repackFrame,
    repackAll,
    install
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined" && window.document) {
    window.ATLAS_PERSON_SPACETIME_LABEL_PACKING = api;
    install();
  }
})();
