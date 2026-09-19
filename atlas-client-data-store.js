(() => {
  "use strict";

  const personReader = window.ATLAS_PERSON_BROWSER_READER;
  if (!personReader) {
    console.error("ATLAS client data store requires ATLAS_PERSON_BROWSER_READER");
    return;
  }

  const SOURCES = Object.freeze({
    persons: Object.freeze({ key:"persons", label:"Person Runtime", url:personReader.ENDPOINT }),
    personDomains: Object.freeze({ key:"personDomains", label:"Person Domain", url:"/api/atlas-person-domain" }),
    spatialIndex: Object.freeze({ key:"spatialIndex", label:"Spatial Index", url:"./atlas-polity-spatial-index.json" }),
    nonTimeline: Object.freeze({ key:"nonTimeline", label:"Non-timeline Registry", url:"./non-timeline-persons.json" }),
    recentDelta: Object.freeze({ key:"recentDelta", label:"Recent Delta", url:"/api/atlas-read?__atlas_read_surface=recent-delta" })
  });

  const cache = new Map();
  const inFlight = new Map();
  const sourceState = new Map();

  function emit(key) {
    if (typeof window.CustomEvent !== "function") return;
    window.dispatchEvent(new CustomEvent("atlas-client-data-source-updated", {
      detail: { key, state: getSourceState(key) }
    }));
  }

  function setState(key, patch) {
    sourceState.set(key, Object.freeze({
      key,
      label: SOURCES[key]?.label || key,
      url: SOURCES[key]?.url || null,
      status: "idle",
      loaded_at: null,
      error: null,
      ...(sourceState.get(key) || {}),
      ...patch
    }));
    emit(key);
  }

  function getSourceState(key) {
    return sourceState.get(key) || Object.freeze({
      key,
      label: SOURCES[key]?.label || key,
      url: SOURCES[key]?.url || null,
      status: "idle",
      loaded_at: null,
      error: null
    });
  }

  function sourceStates() {
    return Object.freeze(Object.fromEntries(Object.keys(SOURCES).map((key) => [key, getSourceState(key)])));
  }

  async function shared(key, loader, { force = false } = {}) {
    if (!force && cache.has(key)) return cache.get(key);
    if (inFlight.has(key)) return inFlight.get(key);

    setState(key, { status:"loading", error:null });
    const promise = Promise.resolve()
      .then(loader)
      .then((value) => {
        cache.set(key, value);
        setState(key, { status:"ready", loaded_at:new Date().toISOString(), error:null });
        return value;
      })
      .catch((error) => {
        setState(key, { status:"error", error:String(error?.message || error), loaded_at:null });
        throw error;
      })
      .finally(() => {
        if (inFlight.get(key) === promise) inFlight.delete(key);
      });

    inFlight.set(key, promise);
    return promise;
  }

  async function getJson(url) {
    const response = await fetch(url, {
      method:"GET",
      credentials:"same-origin",
      cache:"no-store",
      headers:{ accept:"application/json" }
    });
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) throw new Error(`ATLAS_SOURCE_HTTP_${response.status}: ${url}`);
    return payload;
  }

  function loadPersons({ force = false } = {}) {
    return shared("persons", () => personReader.listPersons(), { force });
  }

  function normalizeDomainPayload(payload) {
    if (payload?.ok !== true || !Array.isArray(payload.rows)) throw new Error("INVALID_PERSON_DOMAIN_RESPONSE");
    const rows = payload.rows.map((row) => Object.freeze({
      person_id:String(row?.person_id || "").trim(),
      representative_domain:String(row?.representative_domain || "").trim() || null
    })).filter((row) => row.person_id);
    const byPersonId = {};
    for (const row of rows) {
      if (row.representative_domain) byPersonId[row.person_id] = row.representative_domain;
    }
    return Object.freeze({
      schema:payload.schema || null,
      source:payload.source || null,
      rows:Object.freeze(rows),
      by_person_id:Object.freeze(byPersonId)
    });
  }

  function loadPersonDomains({ force = false } = {}) {
    return shared("personDomains", async () => normalizeDomainPayload(await getJson(SOURCES.personDomains.url)), { force });
  }

  function patchPersonDomain(personId, representativeDomain) {
    const id = String(personId || "").trim();
    if (!id || !cache.has("personDomains")) return false;
    const current = cache.get("personDomains");
    const nextRows = current.rows.filter((row) => row.person_id !== id);
    const domain = String(representativeDomain || "").trim() || null;
    if (domain) nextRows.push(Object.freeze({ person_id:id, representative_domain:domain }));
    nextRows.sort((a, b) => a.person_id.localeCompare(b.person_id));
    const byPersonId = {};
    for (const row of nextRows) if (row.representative_domain) byPersonId[row.person_id] = row.representative_domain;
    cache.set("personDomains", Object.freeze({
      ...current,
      rows:Object.freeze(nextRows),
      by_person_id:Object.freeze(byPersonId)
    }));
    setState("personDomains", { status:"ready", loaded_at:new Date().toISOString(), error:null });
    return true;
  }

  function loadSpatialIndex({ force = false } = {}) {
    return shared("spatialIndex", async () => {
      const payload = await getJson(SOURCES.spatialIndex.url);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("INVALID_SPATIAL_INDEX_RESPONSE");
      if (payload.schema !== "atlas-polity-spatial-index/v2") throw new Error("INVALID_SPATIAL_INDEX_SCHEMA");
      if (!payload.polity_geography || typeof payload.polity_geography !== "object") throw new Error("INVALID_SPATIAL_INDEX_GEOGRAPHY");
      return payload;
    }, { force });
  }

  function loadNonTimelinePersons({ force = false } = {}) {
    return shared("nonTimeline", async () => {
      const payload = await getJson(SOURCES.nonTimeline.url);
      if (!Array.isArray(payload)) throw new Error("INVALID_NON_TIMELINE_RESPONSE");
      return Object.freeze(payload.slice());
    }, { force });
  }

  function normalizeRecentDeltaPayload(payload) {
    if (payload?.ok !== true || payload?.schema !== "atlas-recent-delta/v1" || !Array.isArray(payload.rows)) {
      throw new Error("INVALID_RECENT_DELTA_RESPONSE");
    }
    const rows = payload.rows.map((row) => Object.freeze({
      occurred_at:String(row?.occurred_at || "").trim(),
      kind:String(row?.kind || "").trim(),
      operation:String(row?.operation || "").trim(),
      person_id:row?.person_id == null ? null : String(row.person_id).trim() || null,
      display_name:row?.display_name == null ? null : String(row.display_name).trim() || null,
      change_count:Number(row?.change_count || 0)
    })).filter((row) => row.occurred_at && row.kind && row.operation && Number.isFinite(row.change_count));
    return Object.freeze({
      schema:payload.schema,
      source:payload.source || null,
      limit:Number(payload.limit || rows.length),
      rows:Object.freeze(rows),
      coverage:Object.freeze({ ...(payload.coverage || {}) })
    });
  }

  function loadRecentDelta({ force = false } = {}) {
    return shared("recentDelta", async () => normalizeRecentDeltaPayload(await getJson(SOURCES.recentDelta.url)), { force });
  }

  function invalidate(key) {
    if (key) {
      cache.delete(key);
      inFlight.delete(key);
      setState(key, { status:"idle", loaded_at:null, error:null });
      return;
    }
    for (const sourceKey of Object.keys(SOURCES)) {
      cache.delete(sourceKey);
      inFlight.delete(sourceKey);
      setState(sourceKey, { status:"idle", loaded_at:null, error:null });
    }
  }

  window.ATLAS_CLIENT_DATA_STORE = Object.freeze({
    SOURCES,
    loadPersons,
    loadPersonDomains,
    patchPersonDomain,
    loadSpatialIndex,
    loadNonTimelinePersons,
    loadRecentDelta,
    getSourceState,
    sourceStates,
    invalidate
  });
})();