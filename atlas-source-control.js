(() => {
  "use strict";

  const VALID_SOURCES = Object.freeze(["legacy", "v2-shadow"]);
  const VALID_SET = new Set(VALID_SOURCES);

  function resolveConfiguredSource(config) {
    const source = String(config?.DATA_SOURCE ?? "legacy").trim();
    if (!VALID_SET.has(source)) {
      return Object.freeze({
        requested: source,
        effective: "legacy",
        valid: false,
        diagnostic: "invalid configured source; using legacy"
      });
    }
    return Object.freeze({ requested: source, effective: source, valid: true, diagnostic: null });
  }

  const state = resolveConfiguredSource(window.ATLAS_CONFIG || {});
  window.ATLAS_DATA_SOURCE = state.effective;
  window.AtlasSourceControl = Object.freeze({
    VALID_SOURCES,
    resolveConfiguredSource,
    getState: () => state
  });
})();
