(() => {
  "use strict";

  const nativeFetch = window.fetch.bind(window);
  let expectedPromise = null;
  let pendingPromise = null;

  const keyOf = (row) => [row.person_name, row.politic_name, Number(row.activity_start), Number(row.activity_end)].join("|");
  const obsoleteKeys = new Set([
    "Dido|Carthage|-814|-814",
    "Isabella I|Crown of Castile|1474|1504",
    "Jesus|Roman Judaea|27|30",
    "Gautama Buddha|Shakya|-445|-400",
    "Muhammad|Medina|610|632",
    "Toyotomi Hideyoshi|Japan|1582|1598",
    "Benjamin Franklin|United States|1757|1790",
    "Edward Teach|Republic of Pirates|1716|1718",
    "Tecumseh|Shawnee|1805|1813",
    "Haile Selassie I|Ethiopian Empire|1930|1974",
    "Peter I|Russian Empire|1682|1725",
    "Kublai Khan|Yuan Dynasty|1260|1294"
  ]);

  async function loadMerged(paths) {
    const responses = await Promise.all(paths.map((path) => nativeFetch(`${path}?v=${Date.now()}`, { cache: "no-store" })));
    responses.forEach((response, index) => {
      if (!response.ok) throw new Error(`${paths[index]} lookup failed (${response.status})`);
    });
    const datasets = await Promise.all(responses.map((response) => response.json()));
    return datasets.flatMap((data) => Array.isArray(data) ? data : []);
  }

  async function loadPending() {
    const rows = await loadMerged([
      "./pending-records.json",
      "./pending-records-supplement.json",
      "./pending-records-supplement-2.json",
      "./pending-records-supplement-3.json",
      "./pending-records-supplement-4.json",
      "./pending-records-corrections.json"
    ]);
    const byKey = new Map();
    for (const row of rows) {
      const key = keyOf(row);
      if (!obsoleteKeys.has(key)) byKey.set(key, row);
    }
    return [...byKey.values()];
  }

  window.fetch = async function atlasMergedFetch(input, init) {
    const url = typeof input === "string" ? input : input?.url || "";

    if (/expected-persons\.json(?:\?|$)/.test(url)) {
      expectedPromise ||= (async () => {
        const [expectedRows, pendingRows] = await Promise.all([
          loadMerged([
            "./expected-persons.json",
            "./expected-persons-supplement.json",
            "./expected-persons-supplement-2.json"
          ]),
          loadPending()
        ]);
        const names = new Set();
        for (const item of expectedRows) names.add(typeof item === "string" ? item : item.person_name);
        for (const row of pendingRows) names.add(row.person_name);
        names.delete("Dido");
        names.delete("Isabella I");
        return [...names].filter(Boolean);
      })();
      const data = await expectedPromise;
      return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (/pending-records\.json(?:\?|$)/.test(url)) {
      pendingPromise ||= loadPending();
      const data = await pendingPromise;
      return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    return nativeFetch(input, init);
  };
})();
