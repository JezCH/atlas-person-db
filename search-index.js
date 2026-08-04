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

  function recordText(record, basisLabels = {}) {
    const pieces = [
      record.person_name,
      record.display_person,
      record.politic_name,
      record.display_politic,
      record.role,
      basisLabels[record.period_basis],
      record.period_basis,
      record.notes,
      record.activity_start,
      record.activity_end
    ];
    const normalized = normalize(pieces.filter((value) => value !== null && value !== undefined && String(value).trim() !== "").join(" "));
    return { normalized, compact: normalized.replace(/\s+/g, "") };
  }

  function matches(record, query, basisLabels = {}) {
    if (!String(query ?? "").trim()) return true;
    const haystack = recordText(record, basisLabels);
    const compactQuery = compact(query);
    if (compactQuery && haystack.compact.includes(compactQuery)) return true;
    const queryTokens = tokens(query);
    return queryTokens.length > 0 && queryTokens.every((token) => haystack.normalized.includes(token));
  }

  window.ATLAS_SEARCH = Object.freeze({ normalize, compact, tokens, recordText, matches });
})();