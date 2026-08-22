((root, factory) => {
  "use strict";
  const cameraApi = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-camera-v2.js")
    : root?.ATLAS_PERSON_SPACETIME_CAMERA_V2;
  const api = factory(cameraApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_SPACE_AXIS_V2 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (cameraApi) => {
  "use strict";

  if (!cameraApi) throw new Error("ATLAS_PERSON_SPACETIME_CAMERA_V2 is required");

  const SPACE_WORLD_BOUNDS = Object.freeze({ minTime: 0, maxTime: 1, minSpace: 0, maxSpace: 1 });
  const DEFAULT_SUBREGION_FADE_START_ZOOM = 1.4;
  const DEFAULT_SUBREGION_FADE_FULL_ZOOM = 3;
  const EPSILON = 1e-9;

  const DEFAULT_SPATIAL_HIERARCHY = Object.freeze([
    Object.freeze({ code: "americas", label: "아메리카", subregions: Object.freeze([
      Object.freeze({ code: "north-america", label: "북아메리카" }),
      Object.freeze({ code: "mesoamerica-caribbean", label: "메소아메리카·카리브" }),
      Object.freeze({ code: "south-america", label: "남아메리카" })
    ]) }),
    Object.freeze({ code: "europe", label: "유럽", subregions: Object.freeze([
      Object.freeze({ code: "britain-ireland", label: "영국·아일랜드" }),
      Object.freeze({ code: "western-europe", label: "서유럽" }),
      Object.freeze({ code: "iberia", label: "이베리아" }),
      Object.freeze({ code: "central-europe", label: "중부유럽" }),
      Object.freeze({ code: "italy", label: "이탈리아" }),
      Object.freeze({ code: "northern-europe", label: "북유럽" }),
      Object.freeze({ code: "balkans", label: "발칸" }),
      Object.freeze({ code: "eastern-europe-russia", label: "동유럽·러시아" })
    ]) }),
    Object.freeze({ code: "africa", label: "아프리카", subregions: Object.freeze([
      Object.freeze({ code: "north-africa-nile", label: "북아프리카·나일" }),
      Object.freeze({ code: "west-africa", label: "서아프리카" }),
      Object.freeze({ code: "central-africa", label: "중앙아프리카" }),
      Object.freeze({ code: "east-africa-horn", label: "동아프리카·아프리카의 뿔" }),
      Object.freeze({ code: "southern-africa", label: "남아프리카" })
    ]) }),
    Object.freeze({ code: "west-asia", label: "서아시아", subregions: Object.freeze([
      Object.freeze({ code: "anatolia-caucasus", label: "아나톨리아·캅카스" }),
      Object.freeze({ code: "levant-mesopotamia", label: "레반트·메소포타미아" }),
      Object.freeze({ code: "arabia", label: "아라비아" }),
      Object.freeze({ code: "iranian-plateau", label: "이란고원" })
    ]) }),
    Object.freeze({ code: "south-asia", label: "남아시아", subregions: Object.freeze([
      Object.freeze({ code: "northwest-south-asia", label: "북서부" }),
      Object.freeze({ code: "north-india-ganges", label: "북인도·갠지스" }),
      Object.freeze({ code: "deccan-south-india", label: "데칸·남인도" })
    ]) }),
    Object.freeze({ code: "central-asia", label: "중앙아시아", subregions: Object.freeze([
      Object.freeze({ code: "western-central-asia", label: "서부 중앙아시아" }),
      Object.freeze({ code: "eastern-central-asia-steppe", label: "동부 중앙아시아·스텝" })
    ]) }),
    Object.freeze({ code: "southeast-asia", label: "동남아시아", subregions: Object.freeze([
      Object.freeze({ code: "mainland-southeast-asia", label: "대륙부 동남아시아" }),
      Object.freeze({ code: "maritime-southeast-asia", label: "해양부 동남아시아" })
    ]) }),
    Object.freeze({ code: "oceania", label: "오세아니아", subregions: Object.freeze([
      Object.freeze({ code: "australasia", label: "오스트랄라시아" }),
      Object.freeze({ code: "pacific-islands", label: "태평양 도서" })
    ]) }),
    Object.freeze({ code: "east-asia", label: "동아시아", subregions: Object.freeze([
      Object.freeze({ code: "china", label: "중국권" }),
      Object.freeze({ code: "korean-peninsula", label: "한반도" }),
      Object.freeze({ code: "japan", label: "일본" }),
      Object.freeze({ code: "manchuria-mongolia", label: "만주·몽골권" })
    ]) })
  ]);

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function finite(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite`);
    return number;
  }

  function positive(value, label) {
    const number = finite(value, label);
    if (number <= 0) throw new RangeError(`${label} must be > 0`);
    return number;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep01(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function validateHierarchy(definitions) {
    const errors = [];
    if (!Array.isArray(definitions) || !definitions.length) return Object.freeze({ valid: false, errors: Object.freeze(["spatial hierarchy must be a non-empty array"]) });
    const codes = new Set();
    for (const [macroIndex, macro] of definitions.entries()) {
      const macroCode = text(macro?.code);
      if (!macroCode) errors.push(`macroregion[${macroIndex}] code is required`);
      if (codes.has(macroCode)) errors.push(`duplicate spatial code: ${macroCode}`);
      if (macroCode) codes.add(macroCode);
      if (!text(macro?.label)) errors.push(`macroregion ${macroCode || macroIndex} label is required`);
      if (!Array.isArray(macro?.subregions) || !macro.subregions.length) {
        errors.push(`macroregion ${macroCode || macroIndex} requires at least one subregion`);
        continue;
      }
      for (const [subIndex, subregion] of macro.subregions.entries()) {
        const subCode = text(subregion?.code);
        if (!subCode) errors.push(`macroregion ${macroCode || macroIndex} subregion[${subIndex}] code is required`);
        if (codes.has(subCode)) errors.push(`duplicate spatial code: ${subCode}`);
        if (subCode) codes.add(subCode);
        if (!text(subregion?.label)) errors.push(`subregion ${subCode || subIndex} label is required`);
      }
    }
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
  }

  function createSpatialContinuum(definitions = DEFAULT_SPATIAL_HIERARCHY) {
    const validation = validateHierarchy(definitions);
    if (!validation.valid) {
      const error = new Error(`INVALID_SPATIAL_HIERARCHY: ${validation.errors.join(" | ")}`);
      error.code = "INVALID_SPATIAL_HIERARCHY";
      error.details = validation.errors;
      throw error;
    }

    const macroWidth = 1 / definitions.length;
    const macroregions = [];
    const subregions = [];
    const byCode = new Map();

    definitions.forEach((macro, macroIndex) => {
      const min = macroIndex * macroWidth;
      const max = macroIndex === definitions.length - 1 ? 1 : (macroIndex + 1) * macroWidth;
      const macroBand = Object.freeze({
        kind: "macroregion",
        code: text(macro.code),
        label: text(macro.label),
        parent_code: null,
        min_space: min,
        max_space: max,
        center_space: (min + max) / 2,
        ordinal: macroIndex
      });
      macroregions.push(macroBand);
      byCode.set(macroBand.code, macroBand);

      const childWidth = (max - min) / macro.subregions.length;
      macro.subregions.forEach((subregion, subIndex) => {
        const childMin = min + subIndex * childWidth;
        const childMax = subIndex === macro.subregions.length - 1 ? max : min + (subIndex + 1) * childWidth;
        const subBand = Object.freeze({
          kind: "subregion",
          code: text(subregion.code),
          label: text(subregion.label),
          parent_code: macroBand.code,
          min_space: childMin,
          max_space: childMax,
          center_space: (childMin + childMax) / 2,
          ordinal: subIndex
        });
        subregions.push(subBand);
        byCode.set(subBand.code, subBand);
      });
    });

    function bandForCode(code) {
      return byCode.get(text(code)) || null;
    }

    function macroForCode(code) {
      const band = bandForCode(code);
      if (!band) return null;
      return band.kind === "macroregion" ? band : byCode.get(band.parent_code) || null;
    }

    return Object.freeze({
      macroregions: Object.freeze(macroregions),
      subregions: Object.freeze(subregions),
      bandForCode,
      macroForCode
    });
  }

  function semanticSpatialLabelState(zoomSpace, options = {}) {
    const zoom = positive(zoomSpace, "zoomSpace");
    const start = positive(options.subregionFadeStartZoom ?? DEFAULT_SUBREGION_FADE_START_ZOOM, "subregionFadeStartZoom");
    const full = positive(options.subregionFadeFullZoom ?? DEFAULT_SUBREGION_FADE_FULL_ZOOM, "subregionFadeFullZoom");
    if (!(full > start)) throw new RangeError("subregionFadeFullZoom must be greater than subregionFadeStartZoom");
    let subregionOpacity = 0;
    if (zoom >= full) subregionOpacity = 1;
    else if (zoom > start) {
      const t = (Math.log(zoom) - Math.log(start)) / (Math.log(full) - Math.log(start));
      subregionOpacity = smoothstep01(t);
    }
    return Object.freeze({
      macroregion_label_opacity: 1 - subregionOpacity,
      subregion_label_opacity: subregionOpacity,
      macroregion_band_opacity: 1
    });
  }

  function positionForPlacement(continuum, placement) {
    if (!continuum?.bandForCode) throw new TypeError("spatial continuum is required");
    const macroCode = text(placement?.macroregion_code);
    const subregionCode = text(placement?.subregion_code);
    const macro = macroCode ? continuum.bandForCode(macroCode) : null;
    const subregion = subregionCode ? continuum.bandForCode(subregionCode) : null;

    if (macro && macro.kind !== "macroregion") throw new Error(`INVALID_MACROREGION_CODE: ${macroCode}`);
    if (subregion && subregion.kind !== "subregion") throw new Error(`INVALID_SUBREGION_CODE: ${subregionCode}`);
    if (subregion && macro && subregion.parent_code !== macro.code) throw new Error(`SUBREGION_MACROREGION_MISMATCH: ${subregion.code} is not inside ${macro.code}`);
    if (subregion) {
      const parent = continuum.macroForCode(subregion.code);
      return Object.freeze({
        space: subregion.center_space,
        precision: "subregion",
        macroregion_code: parent.code,
        subregion_code: subregion.code
      });
    }
    if (macro) {
      return Object.freeze({
        space: macro.center_space,
        precision: "macroregion",
        macroregion_code: macro.code,
        subregion_code: null
      });
    }
    return null;
  }

  function visibleSpatialBands(continuum, cameraInput, viewportInput, options = {}) {
    if (!continuum?.macroregions || !continuum?.subregions) throw new TypeError("spatial continuum is required");
    const viewport = cameraApi.normalizeViewport(viewportInput);
    const camera = cameraApi.createCamera(SPACE_WORLD_BOUNDS, { ...options, ...(cameraInput || {}) });
    const visible = cameraApi.visibleWorld(camera, SPACE_WORLD_BOUNDS);
    const labelState = semanticSpatialLabelState(camera.zoomSpace, options);

    function intersects(band) {
      return band.max_space > visible.minSpace + EPSILON && band.min_space < visible.maxSpace - EPSILON;
    }

    function screenBand(band, labelOpacity) {
      const left = ((band.min_space - visible.minSpace) / (visible.maxSpace - visible.minSpace)) * viewport.width;
      const right = ((band.max_space - visible.minSpace) / (visible.maxSpace - visible.minSpace)) * viewport.width;
      return Object.freeze({ ...band, screen_left: left, screen_right: right, screen_width: right - left, label_opacity: labelOpacity });
    }

    return Object.freeze({
      camera,
      label_state: labelState,
      macroregions: Object.freeze(continuum.macroregions.filter(intersects).map((band) => screenBand(band, labelState.macroregion_label_opacity))),
      subregions: Object.freeze(continuum.subregions.filter(intersects).map((band) => screenBand(band, labelState.subregion_label_opacity)))
    });
  }

  function fitSpatialBand(cameraInput, continuum, code, options = {}) {
    const band = continuum?.bandForCode?.(code);
    if (!band) throw new Error(`UNKNOWN_SPATIAL_BAND: ${text(code) || "(empty)"}`);
    const current = cameraApi.createCamera(SPACE_WORLD_BOUNDS, { ...options, ...(cameraInput || {}) });
    const padding = Math.max(1, positive(options.padding ?? 1, "padding"));
    const span = Math.min(1, (band.max_space - band.min_space) * padding);
    return cameraApi.createCamera(SPACE_WORLD_BOUNDS, {
      ...options,
      ...current,
      centerSpace: band.center_space,
      zoomSpace: 1 / span
    });
  }

  return Object.freeze({
    SPACE_WORLD_BOUNDS,
    DEFAULT_SUBREGION_FADE_START_ZOOM,
    DEFAULT_SUBREGION_FADE_FULL_ZOOM,
    DEFAULT_SPATIAL_HIERARCHY,
    validateHierarchy,
    createSpatialContinuum,
    semanticSpatialLabelState,
    positionForPlacement,
    visibleSpatialBands,
    fitSpatialBand
  });
});