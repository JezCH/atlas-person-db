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

  const aliases = Object.freeze({
    "Augustus": ["아우구스투스", "옥타비아누스", "가이우스 옥타비우스", "octavian", "gaius octavius"],
    "Gaius Octavius": ["아우구스투스", "옥타비아누스", "augustus", "octavian"],
    "Sejong the Great": ["세종", "세종대왕", "이도", "yi do"],
    "Queen Seondeok": ["선덕", "선덕여왕", "김덕만", "deokman"],
    "Emperor Gaozu of Han": ["유방", "한고조", "고조"],
    "Emperor Wu of Han": ["한무제", "유철", "liu che"],
    "K'inich Janaab' Pakal": ["파칼", "파칼 2세", "킨이치 하나브 파칼"],
    "Joan of Arc": ["잔 다르크", "잔다르크", "jeanne d'arc", "jeanne d arc"]
  });

  function recordText(record, basisLabels = {}) {
    const pieces = [
      record.person_name,
      record.display_person,
      ...(aliases[record.person_name] || []),
      record.politic_name,
      record.display_politic,
      record.role,
      basisLabels[record.period_basis],
      record.notes
    ];
    const normalized = normalize(pieces.filter(Boolean).join(" "));
    return { normalized, compact: normalized.replace(/\s+/g, "") };
  }

  function matches(record, query, basisLabels = {}) {
    if (!query) return true;
    const haystack = recordText(record, basisLabels);
    const compactQuery = compact(query);
    if (compactQuery && haystack.compact.includes(compactQuery)) return true;
    const queryTokens = tokens(query);
    return queryTokens.length > 0 && queryTokens.every((token) => haystack.normalized.includes(token));
  }

  window.ATLAS_SEARCH = Object.freeze({ normalize, compact, tokens, aliases, recordText, matches });
})();