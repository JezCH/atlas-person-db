(() => {
  "use strict";

  const ALLOWED = new Set(["legacy-only", "shadow-validate"]);

  function resolveMode(value, warn = console.warn) {
    const requested = String(value || "legacy-only").trim();
    if (ALLOWED.has(requested)) return requested;
    if (requested && typeof warn === "function") {
      warn(`ATLAS write mode '${requested}' is not authorized; falling back to legacy-only.`);
    }
    return "legacy-only";
  }

  const api = Object.freeze({
    allowedModes: Object.freeze(["legacy-only", "shadow-validate"]),
    resolveMode
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_WRITE_MODE = api;
})();
