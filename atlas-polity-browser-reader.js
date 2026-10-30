(() => {
  "use strict";

  const ENDPOINT = "/api/atlas-polity-read";
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  async function getJson(url, fetchImpl = globalThis.fetch) {
    if (typeof fetchImpl !== "function") throw new Error("fetch implementation is required");
    const response = await fetchImpl(url, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { accept: "application/json" }
    });
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok || payload?.ok !== true) {
      const error = new Error(payload?.code || payload?.error || `POLITY_READ_FAILED_${response.status}`);
      error.status = response.status;
      error.code = payload?.code || null;
      throw error;
    }
    return payload;
  }

  function navigationCollections(payload) {
    const ids = new Set(payload.polities.map(polity => String(polity.id).toLowerCase()));
    const keys = new Set();
    return Object.freeze((Array.isArray(payload.navigation_collections) ? payload.navigation_collections : []).filter(row => {
      if (row?.kind !== "nonexclusive_navigation" || typeof row.key !== "string" || !row.key || keys.has(row.key) ||
          !Array.isArray(row.polity_ids) || !row.polity_ids.length ||
          new Set(row.polity_ids.map(id => String(id).toLowerCase())).size !== row.polity_ids.length ||
          row.polity_ids.some(id => typeof id !== "string" || !UUID_PATTERN.test(id) || !ids.has(id.toLowerCase()))) return false;
      keys.add(row.key); return true;
    }).map(row => Object.freeze({ key: row.key, kind: row.kind,
      label: String(row.label || row.key), description: String(row.description || ""),
      polity_ids: Object.freeze(row.polity_ids.map(id => id.toLowerCase())),
      evidence: row.evidence && /^https:\/\//.test(row.evidence.url || "") ? Object.freeze({
        url: String(row.evidence.url), label: String(row.evidence.label || "근거"),
        source_snapshot: String(row.evidence.source_snapshot || ""),
        source_ids: Object.freeze((Array.isArray(row.evidence.source_ids) ? row.evidence.source_ids : []).filter(id => typeof id === "string" && UUID_PATTERN.test(id))) }) : null
    })));
  }

  async function listPolities({ fetchImpl = globalThis.fetch } = {}) {
    const payload = await getJson(ENDPOINT, fetchImpl);
    if (payload.mode !== "list" || !Array.isArray(payload.polities)) throw new Error("INVALID_POLITY_LIST_RESPONSE");
    return Object.freeze({
      schema: payload.schema,
      source: payload.source,
      summary: payload.summary || null,
      navigation_collections: navigationCollections(payload),
      polities: Object.freeze(payload.polities.slice())
    });
  }

  async function readPolity(polityId, { fetchImpl = globalThis.fetch } = {}) {
    const id = String(polityId || "").trim();
    if (!UUID_PATTERN.test(id)) {
      const error = new Error("INVALID_POLITY_ID");
      error.code = "INVALID_POLITY_ID";
      throw error;
    }
    const payload = await getJson(`${ENDPOINT}?polity_id=${encodeURIComponent(id)}`, fetchImpl);
    if (payload.mode !== "detail" || !payload.polity) throw new Error("INVALID_POLITY_DETAIL_RESPONSE");
    return Object.freeze({ schema: payload.schema, source: payload.source, polity: payload.polity });
  }

  window.ATLAS_POLITY_BROWSER_READER = Object.freeze({
    ENDPOINT,
    UUID_PATTERN,
    listPolities,
    readPolity
  });
})();
