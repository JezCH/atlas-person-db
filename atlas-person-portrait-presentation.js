((root, factory) => {
  "use strict";
  const api = factory(root?.ATLAS_PERSON_ERA_MODEL, root?.ATLAS_PERSON_DOMAIN_REGISTRY);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_PORTRAIT_PRESENTATION = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), (root) => {
  "use strict";

  const eraModel = root?.ATLAS_PERSON_ERA_MODEL;
  const domainRegistry = root?.ATLAS_PERSON_DOMAIN_REGISTRY;
  const ASSET_ROOT = "./portrait-assets";
  const ERA_FRAME_FILES = Object.freeze({
    "early-civilization":"early-civilization.png",
    "ancient":"ancient.png",
    "classical":"classical.png",
    "early-medieval":"early-medieval.png",
    "late-medieval":"late-medieval.png",
    "early-modern":"early-modern.png",
    "industrial-imperial":"industrial.png",
    "world-wars":"world-wars.png",
    "cold-war":"cold-war.png",
    "information":"information.png"
  });

  const DOMAIN_CODES = new Set(domainRegistry?.CODES || []);

  function presentationFor(person, representativeDomain) {
    const year = Number.isInteger(person?.first_activity_year) ? person.first_activity_year : null;
    const era = eraModel?.eraForYear ? eraModel.eraForYear(year) : null;
    const eraCode = String(era?.code || "unknown");
    const domainCode = String(representativeDomain || "").trim();
    const frameFile = ERA_FRAME_FILES[eraCode] || null;
    const hasDomain = DOMAIN_CODES.has(domainCode);
    return Object.freeze({
      era_code:eraCode,
      era_label:String(era?.label || "시대 미상"),
      domain_code:hasDomain ? domainCode : null,
      domain_label:hasDomain ? String(domainRegistry?.LABELS?.[domainCode] || domainCode) : "분야 미지정",
      frame_url:frameFile ? `${ASSET_ROOT}/frames/${frameFile}` : null,
      background_url:hasDomain ? `${ASSET_ROOT}/backgrounds/${domainCode}.png` : null
    });
  }

  return Object.freeze({ ASSET_ROOT, ERA_FRAME_FILES, presentationFor });
});
