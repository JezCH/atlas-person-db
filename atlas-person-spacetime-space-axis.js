((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_SPACE_AXIS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const DEFAULT_MIN_BASE_WORLD_WIDTH = 900;
  const DEFAULT_MAX_BASE_WORLD_WIDTH = 1275;
  const DEFAULT_AXIS_WIDTH = 140;
  const DEFAULT_WORLD_VIEWPORT_GUTTER = 2;

  const SPATIAL_HIERARCHY_POLICY = Object.freeze({
    taxonomy_basis: "atlas_internal_display_taxonomy",
    external_standard: null,
    width_basis: "equal_leaf_subregion",
    macro_width_basis: "sum_of_child_leaf_widths",
    horizontal_order_basis: "atlas_map_like_display_order",
    note: "This hierarchy is an ATLAS display taxonomy, not an attributed external geographic standard."
  });

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
    Object.freeze({ code: "east-asia", label: "동아시아", subregions: Object.freeze([
      Object.freeze({ code: "china", label: "중국권" }),
      Object.freeze({ code: "korean-peninsula", label: "한반도" }),
      Object.freeze({ code: "japan", label: "일본" }),
      Object.freeze({ code: "manchuria-mongolia", label: "만주·몽골권" })
    ]) }),
    Object.freeze({ code: "oceania", label: "오세아니아", subregions: Object.freeze([
      Object.freeze({ code: "australasia", label: "오스트랄라시아" }),
      Object.freeze({ code: "pacific-islands", label: "태평양 도서" })
    ]) })
  ]);

  function text(value) {
    return value == null ? "" : String(value).trim();
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
    const totalLeafCount = definitions.reduce((sum, macro) => sum + macro.subregions.length, 0);
    const leafWidth = 1 / totalLeafCount;
    const macroregions = [];
    const subregions = [];
    const byCode = new Map();
    let leafOffset = 0;
    definitions.forEach((macro, macroIndex) => {
      const macroLeafCount = macro.subregions.length;
      const min = leafOffset * leafWidth;
      const maxLeafOffset = leafOffset + macroLeafCount;
      const max = maxLeafOffset === totalLeafCount ? 1 : maxLeafOffset * leafWidth;
      const macroBand = Object.freeze({ kind: "macroregion", code: text(macro.code), label: text(macro.label), parent_code: null, min_space: min, max_space: max, center_space: (min + max) / 2, ordinal: macroIndex });
      macroregions.push(macroBand);
      byCode.set(macroBand.code, macroBand);
      macro.subregions.forEach((subregion, subIndex) => {
        const globalLeafIndex = leafOffset + subIndex;
        const childMin = globalLeafIndex * leafWidth;
        const childMax = globalLeafIndex === totalLeafCount - 1 ? 1 : (globalLeafIndex + 1) * leafWidth;
        const subBand = Object.freeze({ kind: "subregion", code: text(subregion.code), label: text(subregion.label), parent_code: macroBand.code, min_space: childMin, max_space: childMax, center_space: (childMin + childMax) / 2, ordinal: subIndex });
        subregions.push(subBand);
        byCode.set(subBand.code, subBand);
      });
      leafOffset = maxLeafOffset;
    });
    const bandForCode = (code) => byCode.get(text(code)) || null;
    const macroForCode = (code) => {
      const band = bandForCode(code);
      if (!band) return null;
      return band.kind === "macroregion" ? band : byCode.get(band.parent_code) || null;
    };
    return Object.freeze({ macroregions: Object.freeze(macroregions), subregions: Object.freeze(subregions), bandForCode, macroForCode });
  }

  function baseWorldWidthForViewport(viewportWidth, axisWidth = DEFAULT_AXIS_WIDTH, options = {}) {
    const viewport = Number(viewportWidth);
    const axis = Number(axisWidth);
    const minimum = Number(options.minWidth ?? DEFAULT_MIN_BASE_WORLD_WIDTH);
    const maximum = Number(options.maxWidth ?? DEFAULT_MAX_BASE_WORLD_WIDTH);
    const gutter = Number(options.gutter ?? DEFAULT_WORLD_VIEWPORT_GUTTER);
    if (!Number.isFinite(viewport) || viewport <= 0) throw new RangeError("viewportWidth must be > 0");
    if (!Number.isFinite(axis) || axis < 0) throw new RangeError("axisWidth must be >= 0");
    if (!Number.isFinite(minimum) || minimum <= 0) throw new RangeError("minWidth must be > 0");
    if (!Number.isFinite(maximum) || maximum < minimum) throw new RangeError("maxWidth must be >= minWidth");
    if (!Number.isFinite(gutter) || gutter < 0) throw new RangeError("gutter must be >= 0");
    const available = Math.max(1, Math.floor(viewport - axis - gutter));
    return Math.max(minimum, Math.min(maximum, available));
  }

  function stableRegionLayout(continuum, contentWidth) {
    const width = Number.isFinite(Number(contentWidth)) && Number(contentWidth) > 0 ? Number(contentWidth) : 900;
    return Object.freeze(continuum.macroregions.map((band) => Object.freeze({
      ...band,
      left: band.min_space * width,
      width: (band.max_space - band.min_space) * width,
      center_x: band.center_space * width
    })));
  }

  return Object.freeze({
    DEFAULT_MIN_BASE_WORLD_WIDTH,
    DEFAULT_MAX_BASE_WORLD_WIDTH,
    DEFAULT_AXIS_WIDTH,
    DEFAULT_WORLD_VIEWPORT_GUTTER,
    SPATIAL_HIERARCHY_POLICY,
    DEFAULT_SPATIAL_HIERARCHY,
    validateHierarchy,
    createSpatialContinuum,
    baseWorldWidthForViewport,
    stableRegionLayout
  });
});