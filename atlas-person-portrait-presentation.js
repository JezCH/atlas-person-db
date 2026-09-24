((root, factory) => {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_PORTRAIT_PRESENTATION = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), (root) => {
  "use strict";
  const domainRegistry = root?.ATLAS_PERSON_DOMAIN_REGISTRY;
  const ASSET_ROOT = "./portrait-assets";
  const DOMAIN_CODES = new Set(domainRegistry?.CODES || []);
  function presentationFor(person, representativeDomain) {
    const domainCode = String(representativeDomain || "").trim();
    const hasDomain = DOMAIN_CODES.has(domainCode);
    return Object.freeze({
      domain_code:hasDomain ? domainCode : null,
      domain_label:hasDomain ? String(domainRegistry?.LABELS?.[domainCode] || domainCode) : "분야 미지정",
      background_url:hasDomain ? `${ASSET_ROOT}/backgrounds/${domainCode}.png` : null
    });
  }
  return Object.freeze({ ASSET_ROOT, presentationFor });
});
