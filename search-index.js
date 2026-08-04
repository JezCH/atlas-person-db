(() => {
  "use strict";

  const normalize = (value) => String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`´]/g, "'")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleLowerCase("ko-KR");

  const compact = (value) => normalize(value).replace(/\s+/g, "");
  const tokens = (value) => normalize(value).split(/\s+/).filter(Boolean);

  function localeMap(type) {
    return window.ATLAS_LOCALES?.ko?.[type] || {};
  }

  function collectSearchValues(record, basisLabels = {}) {
    const personRaw = record?.person_name || "";
    const polityRaw = record?.politic_name || "";
    const personDisplay = localeMap("persons")[personRaw] || personRaw;
    const polityDisplay = localeMap("polities")[polityRaw] || polityRaw;

    return [
      personRaw,
      personDisplay,
      polityRaw,
      polityDisplay,
      record?.role,
      basisLabels[record?.period_basis],
      record?.period_basis,
      record?.notes,
      record?.activity_start,
      record?.activity_end
    ].filter((value) => value !== null && value !== undefined && String(value).trim() !== "");
  }

  function recordText(record, basisLabels = {}) {
    const normalized = normalize(collectSearchValues(record, basisLabels).join(" "));
    return {
      normalized,
      compact: normalized.replace(/\s+/g, "")
    };
  }

  function matches(record, query, basisLabels = {}) {
    if (!String(query ?? "").trim()) return true;

    const haystack = recordText(record, basisLabels);
    const compactQuery = compact(query);
    if (compactQuery && haystack.compact.includes(compactQuery)) return true;

    const queryTokens = tokens(query);
    return queryTokens.length > 0 && queryTokens.every((token) => haystack.normalized.includes(token));
  }

  window.ATLAS_SEARCH = Object.freeze({
    normalize,
    compact,
    tokens,
    collectSearchValues,
    recordText,
    matches
  });
})();
