((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_DOMAIN_REGISTRY = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";
  const DEFINITIONS = Object.freeze([
    Object.freeze({ code:"governance", label:"정치·통치", label_ko:"정치·통치" }),
    Object.freeze({ code:"military", label:"군사", label_ko:"군사" }),
    Object.freeze({ code:"science", label:"과학", label_ko:"과학" }),
    Object.freeze({ code:"technology", label:"공학·기술", label_ko:"공학·기술" }),
    Object.freeze({ code:"commerce", label:"경제·상업", label_ko:"경제·상업" }),
    Object.freeze({ code:"culture", label:"인문·예술", label_ko:"인문·예술" }),
    Object.freeze({ code:"religion", label:"종교", label_ko:"종교" }),
    Object.freeze({ code:"exploration", label:"탐험", label_ko:"탐험" })
  ]);
  const CODES = Object.freeze(DEFINITIONS.map((item) => item.code));
  const LABELS = Object.freeze(Object.fromEntries(DEFINITIONS.map((item) => [item.code, item.label_ko])));
  return Object.freeze({ schema:"atlas-person-domain-registry/v2", DEFINITIONS, CODES, LABELS });
});
