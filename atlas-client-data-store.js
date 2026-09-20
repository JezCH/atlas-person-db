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
    recentDelta: Object.freeze({ key:"recentDelta", label:"Recent Delta", url:"/api/atlas-read?__atlas_read_surface=recent-delta" }),
    systemIdentity: Object.freeze({ key:"systemIdentity", label:"Runtime Identity", url:"/api/atlas-read?__atlas_read_surface=runtime-identity" }),
    runtimePublication: Object.freeze({ key:"runtimePublication", label:"Runtime Publication", url:"/api/atlas-read?__atlas_read_surface=runtime-publication" }),
    runtimeExclusions: Object.freeze({ key:"runtimeExclusions", label:"Runtime Exclusions", url:"/api/atlas-read?__atlas_read_surface=runtime-exclusions" })
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

  function normalizeSystemIdentityPayload(payload) {
    if (payload?.ok !== true || payload?.schema !== "atlas-runtime-identity/v1" || !payload.identity || typeof payload.identity !== "object") {
      throw new Error("INVALID_RUNTIME_IDENTITY_RESPONSE");
    }
    const identity=payload.identity;
    return Object.freeze({
      schema:payload.schema,
      source:payload.source || null,
      identity:Object.freeze({
        provider:identity.provider == null ? null : String(identity.provider).trim() || null,
        environment:identity.environment == null ? null : String(identity.environment).trim() || null,
        git_commit_sha:identity.git_commit_sha == null ? null : String(identity.git_commit_sha).trim() || null,
        git_commit_ref:identity.git_commit_ref == null ? null : String(identity.git_commit_ref).trim() || null,
        region:identity.region == null ? null : String(identity.region).trim() || null
      })
    });
  }

  function loadSystemIdentity({ force = false } = {}) {
    return shared("systemIdentity", async () => normalizeSystemIdentityPayload(await getJson(SOURCES.systemIdentity.url)), { force });
  }

  function normalizeRuntimeActivationCompile(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_RUNTIME_ACTIVATION_COMPILE");
    const normalized=Object.freeze({
      compiler_version:String(value.compiler_version || "").trim() || null,
      input_row_count:Number(value.input_row_count),
      output_row_count:Number(value.output_row_count),
      excluded_row_count:Number(value.excluded_row_count),
      exclusion_summary:Object.freeze({ ...(value.exclusion_summary || {}) }),
      compiled_at:value.compiled_at == null ? null : String(value.compiled_at).trim() || null
    });
    const counts=[normalized.input_row_count,normalized.output_row_count,normalized.excluded_row_count];
    if (counts.some((count)=>!Number.isInteger(count) || count < 0)) throw new Error("INVALID_RUNTIME_ACTIVATION_COMPILE_COUNTS");
    if (normalized.input_row_count !== normalized.output_row_count + normalized.excluded_row_count) {
      throw new Error("INVALID_RUNTIME_ACTIVATION_COMPILE_BALANCE");
    }
    for (const count of Object.values(normalized.exclusion_summary)) {
      if (!Number.isInteger(Number(count)) || Number(count) < 0) throw new Error("INVALID_RUNTIME_ACTIVATION_EXCLUSION_SUMMARY");
    }
    return normalized;
  }

  function normalizeRuntimeActivationRecord(value) {
    if (value == null) return null;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_RUNTIME_ACTIVATION_RECORD");
    const activationKind=String(value.activation_kind || "").trim();
    if (!["baseline_observed","compile_commit"].includes(activationKind)) throw new Error("INVALID_RUNTIME_ACTIVATION_KIND");
    const rowCount=Number(value.row_count);
    if (!Number.isInteger(rowCount) || rowCount < 0) throw new Error("INVALID_RUNTIME_ACTIVATION_ROW_COUNT");
    const compile=normalizeRuntimeActivationCompile(value.compile);
    if (rowCount !== compile.output_row_count) throw new Error("INVALID_RUNTIME_ACTIVATION_OUTPUT_MATCH");
    const normalized=Object.freeze({
      id:String(value.id || "").trim(),
      activation_kind:activationKind,
      compile_key:String(value.compile_key || "").trim(),
      runtime_sha:value.runtime_sha == null ? null : String(value.runtime_sha).trim() || null,
      authoring_sha:value.authoring_sha == null ? null : String(value.authoring_sha).trim() || null,
      row_count:rowCount,
      activated_at:value.activated_at == null ? null : String(value.activated_at).trim() || null,
      compile
    });
    if (!normalized.id || !normalized.compile_key) throw new Error("INVALID_RUNTIME_ACTIVATION_IDENTITY");
    if (activationKind === "compile_commit") {
      if (!/^[0-9a-f]{40}$/i.test(normalized.runtime_sha || "") || !/^[0-9a-f]{40}$/i.test(normalized.authoring_sha || "")) {
        throw new Error("INVALID_RUNTIME_ACTIVATION_SHA");
      }
    }
    if (activationKind === "baseline_observed" && (normalized.runtime_sha || normalized.authoring_sha)) {
      throw new Error("INVALID_RUNTIME_ACTIVATION_BASELINE_SHA");
    }
    return normalized;
  }

  function normalizeRuntimeActivationHistory(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return Object.freeze({
        available:false,
        reason:"RUNTIME_ACTIVATION_HISTORY_NOT_EXPOSED",
        projection_name:null,
        latest_recorded:null,
        previous_recorded:null,
        latest_matches_projection:null,
        delta_from_previous:null
      });
    }
    const available=value.available === true;
    const latest=available ? normalizeRuntimeActivationRecord(value.latest_recorded) : null;
    const previous=available ? normalizeRuntimeActivationRecord(value.previous_recorded) : null;
    const delta=value.delta_from_previous;
    let normalizedDelta=null;
    if (available && previous) {
      if (!delta || typeof delta !== "object" || Array.isArray(delta)) throw new Error("INVALID_RUNTIME_ACTIVATION_DELTA");
      const runtimeDelta=Number(delta.runtime_activity_count);
      const excludedDelta=Number(delta.excluded_activity_count);
      if (!Number.isInteger(runtimeDelta) || !Number.isInteger(excludedDelta)) throw new Error("INVALID_RUNTIME_ACTIVATION_DELTA_COUNTS");
      const exclusionSummary=Object.freeze(Object.fromEntries(Object.entries(delta.exclusion_summary || {}).map(([code,count])=>{
        const numeric=Number(count);
        if (!Number.isInteger(numeric)) throw new Error("INVALID_RUNTIME_ACTIVATION_DELTA_REASON_COUNT");
        return [String(code),numeric];
      })));
      normalizedDelta=Object.freeze({
        runtime_activity_count:runtimeDelta,
        excluded_activity_count:excludedDelta,
        compile_key_changed:delta.compile_key_changed === true,
        exclusion_summary:exclusionSummary
      });
    }
    return Object.freeze({
      available,
      reason:available ? null : String(value.reason || "RUNTIME_ACTIVATION_HISTORY_UNAVAILABLE"),
      projection_name:value.projection_name == null ? null : String(value.projection_name).trim() || null,
      latest_recorded:latest,
      previous_recorded:previous,
      latest_matches_projection:available ? value.latest_matches_projection === true : null,
      delta_from_previous:normalizedDelta
    });
  }

  function normalizeRuntimePublicationPayload(payload) {
    if (payload?.ok !== true || payload?.schema !== "atlas-runtime-publication/v1") {
      throw new Error("INVALID_RUNTIME_PUBLICATION_RESPONSE");
    }
    const latest = payload.active_compile;
    const latestCompile = latest && typeof latest === "object" ? Object.freeze({
      compiler_version:String(latest.compiler_version || "").trim() || null,
      input_row_count:Number(latest.input_row_count),
      output_row_count:Number(latest.output_row_count),
      excluded_row_count:Number(latest.excluded_row_count),
      exclusion_summary:Object.freeze({ ...(latest.exclusion_summary || {}) }),
      compiled_at:latest.compiled_at == null ? null : String(latest.compiled_at).trim() || null
    }) : null;
    if (latestCompile) {
      const counts=[latestCompile.input_row_count,latestCompile.output_row_count,latestCompile.excluded_row_count];
      if (counts.some((value) => !Number.isInteger(value) || value < 0)) throw new Error("INVALID_RUNTIME_PUBLICATION_COUNTS");
      if (latestCompile.input_row_count !== latestCompile.output_row_count + latestCompile.excluded_row_count) {
        throw new Error("INVALID_RUNTIME_PUBLICATION_BALANCE");
      }
    }
    const authoringCount=Number(payload.current_authoring_activity_count);
    const runtimeCount=Number(payload.current_runtime_activity_count);
    if (!Number.isInteger(authoringCount) || authoringCount < 0 || !Number.isInteger(runtimeCount) || runtimeCount < 0) {
      throw new Error("INVALID_RUNTIME_PUBLICATION_CURRENT_COUNTS");
    }
    return Object.freeze({
      schema:payload.schema,
      source:payload.source || null,
      current_authoring_activity_count:authoringCount,
      current_runtime_activity_count:runtimeCount,
      active_compile:latestCompile,
      authoring_delta_since_compile:payload.authoring_delta_since_compile == null ? null : Number(payload.authoring_delta_since_compile),
      projection_matches_active_compile:payload.projection_matches_active_compile == null ? null : payload.projection_matches_active_compile === true,
      activation_history:normalizeRuntimeActivationHistory(payload.activation_history)
    });
  }

  function loadRuntimePublication({ force = false } = {}) {
    return shared("runtimePublication", async () => normalizeRuntimePublicationPayload(await getJson(SOURCES.runtimePublication.url)), { force });
  }

  function normalizeRuntimeExclusionsPayload(payload) {
    if (payload?.ok !== true || payload?.schema !== "atlas-runtime-exclusions/v1") {
      throw new Error("INVALID_RUNTIME_EXCLUSIONS_RESPONSE");
    }
    const available=payload.available === true;
    if (!available) {
      return Object.freeze({
        schema:payload.schema,
        source:payload.source || null,
        available:false,
        reason:String(payload.reason || "RUNTIME_EXCLUSION_TARGET_SOURCE_UNAVAILABLE"),
        active_compile_key:payload.active_compile_key == null ? null : String(payload.active_compile_key).trim() || null,
        compiled_at:payload.compiled_at == null ? null : String(payload.compiled_at).trim() || null,
        total_count:null,
        reason_summary:null,
        targets:Object.freeze([])
      });
    }
    if (!Array.isArray(payload.targets)) throw new Error("INVALID_RUNTIME_EXCLUSION_TARGETS");
    const totalCount=Number(payload.total_count);
    if (!Number.isInteger(totalCount) || totalCount < 0 || totalCount !== payload.targets.length) {
      throw new Error("INVALID_RUNTIME_EXCLUSION_TARGET_COUNT");
    }
    const targets=payload.targets.map((row) => {
      const normalized=Object.freeze({
        activity_id:String(row?.activity_id || "").trim(),
        person_id:String(row?.person_id || "").trim(),
        person_display_name:String(row?.person_display_name || "").trim(),
        polity_id:String(row?.polity_id || "").trim(),
        polity_display_name:String(row?.polity_display_name || "").trim(),
        reason_code:String(row?.reason_code || "").trim()
      });
      if (!normalized.activity_id || !normalized.person_id || !normalized.polity_id || !normalized.reason_code) {
        throw new Error("INVALID_RUNTIME_EXCLUSION_TARGET");
      }
      return normalized;
    });
    if (new Set(targets.map((row)=>row.activity_id)).size !== targets.length) {
      throw new Error("DUPLICATE_RUNTIME_EXCLUSION_ACTIVITY");
    }
    const summary=payload.reason_summary && typeof payload.reason_summary === "object" && !Array.isArray(payload.reason_summary)
      ? Object.freeze(Object.fromEntries(Object.entries(payload.reason_summary).map(([code,count])=>[String(code),Number(count)])))
      : Object.freeze({});
    if (Object.values(summary).some((count)=>!Number.isInteger(count) || count < 0)) {
      throw new Error("INVALID_RUNTIME_EXCLUSION_REASON_SUMMARY");
    }
    if (Object.values(summary).reduce((sum,count)=>sum+count,0) !== totalCount) {
      throw new Error("INVALID_RUNTIME_EXCLUSION_REASON_BALANCE");
    }
    return Object.freeze({
      schema:payload.schema,
      source:payload.source || null,
      available:true,
      reason:null,
      active_compile_key:String(payload.active_compile_key || "").trim() || null,
      compiled_at:payload.compiled_at == null ? null : String(payload.compiled_at).trim() || null,
      total_count:totalCount,
      reason_summary:summary,
      targets:Object.freeze(targets)
    });
  }

  function loadRuntimeExclusions({ force = false } = {}) {
    return shared("runtimeExclusions", async () => normalizeRuntimeExclusionsPayload(await getJson(SOURCES.runtimeExclusions.url)), { force });
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
    loadSystemIdentity,
    loadRuntimePublication,
    loadRuntimeExclusions,
    getSourceState,
    sourceStates,
    invalidate
  });
})();