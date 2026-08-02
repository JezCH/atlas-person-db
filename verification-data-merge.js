(() => {
  "use strict";

  const nativeFetch = window.fetch.bind(window);
  let expectedPromise = null;
  let pendingPromise = null;

  async function loadMerged(basePath, supplementPath) {
    const [baseResponse, supplementResponse] = await Promise.all([
      nativeFetch(`${basePath}?v=${Date.now()}`, { cache: "no-store" }),
      nativeFetch(`${supplementPath}?v=${Date.now()}`, { cache: "no-store" })
    ]);
    if (!baseResponse.ok) throw new Error(`${basePath} lookup failed (${baseResponse.status})`);
    if (!supplementResponse.ok) throw new Error(`${supplementPath} lookup failed (${supplementResponse.status})`);
    const [base, supplement] = await Promise.all([baseResponse.json(), supplementResponse.json()]);
    return [...(Array.isArray(base) ? base : []), ...(Array.isArray(supplement) ? supplement : [])];
  }

  window.fetch = async function atlasMergedFetch(input, init) {
    const url = typeof input === "string" ? input : input?.url || "";

    if (/expected-persons\.json(?:\?|$)/.test(url)) {
      expectedPromise ||= loadMerged("./expected-persons.json", "./expected-persons-supplement.json");
      const data = await expectedPromise;
      return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (/pending-records\.json(?:\?|$)/.test(url)) {
      pendingPromise ||= loadMerged("./pending-records.json", "./pending-records-supplement.json");
      const data = await pendingPromise;
      return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    return nativeFetch(input, init);
  };
})();
