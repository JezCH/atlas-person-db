((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_DOMAIN_REGISTRY = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const DEFINITIONS = Object.freeze([
    Object.freeze({ code:"governance", label:"통치·정치" }),
    Object.freeze({ code:"military", label:"군사" }),
    Object.freeze({ code:"knowledge", label:"학문·과학·사상" }),
    Object.freeze({ code:"technology", label:"기술·공학·발명" }),
    Object.freeze({ code:"commerce", label:"상업·경제" }),
    Object.freeze({ code:"culture", label:"문화·예술" }),
    Object.freeze({ code:"religion", label:"종교·신앙" }),
    Object.freeze({ code:"exploration", label:"탐험·항해" })
  ]);
  const CODES = Object.freeze(DEFINITIONS.map((item) => item.code));
  const LABELS = Object.freeze(Object.fromEntries(DEFINITIONS.map((item) => [item.code, item.label])));

  return Object.freeze({ DEFINITIONS, CODES, LABELS });
});