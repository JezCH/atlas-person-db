(() => {
  "use strict";

  const nativeFetch = window.fetch.bind(window);
  let expectedPromise = null;
  let pendingPromise = null;

  async function loadMerged(paths) {
    const responses = await Promise.all(paths.map((path) => nativeFetch(`${path}?v=${Date.now()}`, { cache: "no-store" })));
    responses.forEach((response, index) => {
      if (!response.ok) throw new Error(`${paths[index]} lookup failed (${response.status})`);
    });
    const datasets = await Promise.all(responses.map((response) => response.json()));
    return datasets.flatMap((data) => Array.isArray(data) ? data : []);
  }

  window.fetch = async function atlasMergedFetch(input, init) {
    const url = typeof input === "string" ? input : input?.url || "";

    if (/expected-persons\.json(?:\?|$)/.test(url)) {
      expectedPromise ||= loadMerged([
        "./expected-persons.json",
        "./expected-persons-supplement.json",
        "./expected-persons-supplement-2.json"
      ]);
      const data = await expectedPromise;
      return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (/pending-records\.json(?:\?|$)/.test(url)) {
      pendingPromise ||= loadMerged([
        "./pending-records.json",
        "./pending-records-supplement.json",
        "./pending-records-supplement-2.json"
      ]);
      const data = await pendingPromise;
      return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    return nativeFetch(input, init);
  };
})();
