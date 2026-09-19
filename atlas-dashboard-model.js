((root, factory) => {
  "use strict";
  const domainRegistry = typeof module === "object" && module.exports
    ? require("./atlas-person-domain-registry.js")
    : root?.ATLAS_PERSON_DOMAIN_REGISTRY;
  const api = factory(domainRegistry);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_DASHBOARD_MODEL = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (domainRegistry) => {
  "use strict";

  if (!domainRegistry) throw new Error("ATLAS_PERSON_DOMAIN_REGISTRY is required");
  const DOMAIN_CODES = domainRegistry.CODES;

  function text(value) { return value == null ? "" : String(value).trim(); }
  function percent(done, total) {
    if (!Number.isFinite(total) || total <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((Number(done || 0) / total) * 1000) / 10));
  }

  function uniquePolityIds(personResult) {
    const ids = new Set();
    for (const person of personResult?.persons || []) {
      for (const polity of person?.facets?.polities || []) {
        const id = text(polity?.id || polity);
        if (id) ids.add(id);
      }
    }
    return ids;
  }

  function spatialStatus(personResult, spatialIndex) {
    const used = uniquePolityIds(personResult);
    if (!spatialIndex) return Object.freeze({
      total:used.size, ready:null, unresolved:null, review:null, macro_only:null, percentage:null
    });

    const subregions = spatialIndex.polity_subregions || {};
    const placeFunctionIds = new Set((spatialIndex.place_function_records || []).map((row) => text(row?.polity_id)).filter(Boolean));
    const readyIds = new Set();
    const macroOnlyIds = new Set();
    for (const id of used) {
      if (text(subregions[id]) || placeFunctionIds.has(id)) readyIds.add(id);
      else if (text(spatialIndex.polity_geography?.[id])) macroOnlyIds.add(id);
    }
    const unresolvedIds = new Set([...used].filter((id) => !readyIds.has(id)));
    const reviewIds = new Set((spatialIndex.review_queue || []).map((row) => text(row?.polity_id)).filter((id) => used.has(id)));

    return Object.freeze({
      total:used.size,
      ready:readyIds.size,
      unresolved:unresolvedIds.size,
      review:reviewIds.size,
      macro_only:macroOnlyIds.size,
      percentage:percent(readyIds.size, used.size)
    });
  }

  function buildDashboardSnapshot({
    personResult,
    domainResult = null,
    spatialIndex = null,
    nonTimelineRows = null,
    sourceStates = {}
  } = {}) {
    const persons = personResult?.persons || [];
    const totalPersons = persons.length;
    const activityCount = persons.reduce((sum, person) => sum + Number(person?.activity_count || 0), 0);
    const noActivity = persons.filter((person) => Number(person?.activity_count || 0) === 0).length;
    const historical = persons.filter((person) => text(person?.historicity) === "historical").length;
    const otherHistoricity = Math.max(0, totalPersons - historical);

    let namuLinked = 0;
    let namuNotFound = 0;
    let namuMissing = 0;
    for (const person of persons) {
      const status = text(person?.external_references?.namuwiki?.status);
      if (status === "linked") namuLinked += 1;
      else if (status === "not_found") namuNotFound += 1;
      else namuMissing += 1;
    }
    const namuReviewed = namuLinked + namuNotFound;

    const hasDomainData = Boolean(domainResult && domainResult.by_person_id && typeof domainResult.by_person_id === "object");
    const domainByPerson = hasDomainData ? domainResult.by_person_id : {};
    const domainBreakdown = Object.fromEntries(DOMAIN_CODES.map((code) => [code, hasDomainData ? 0 : null]));
    let domainAssigned = hasDomainData ? 0 : null;
    if (hasDomainData) {
      for (const person of persons) {
        const domain = text(domainByPerson[person?.id]);
        if (!DOMAIN_CODES.includes(domain)) continue;
        domainAssigned += 1;
        domainBreakdown[domain] += 1;
      }
    }
    const domainMissing = domainAssigned == null ? null : Math.max(0, totalPersons - domainAssigned);
    const spatial = spatialStatus(personResult, spatialIndex);
    const polityCount = spatial.total;

    const sourceList = Object.entries(sourceStates).map(([key, state]) => Object.freeze({
      key,
      label:state?.label || key,
      status:state?.status || "idle",
      url:state?.url || null,
      loaded_at:state?.loaded_at || null,
      error:state?.error || null
    }));

    return Object.freeze({
      kpis:Object.freeze({
        persons:totalPersons,
        activities:activityCount,
        polities:polityCount,
        historical,
        other_historicity:otherHistoricity
      }),
      work:Object.freeze({
        domain:Object.freeze({ done:domainAssigned, remaining:domainMissing, total:hasDomainData ? totalPersons : null, percentage:domainAssigned == null ? null : percent(domainAssigned,totalPersons) }),
        namuwiki:Object.freeze({ done:namuReviewed, remaining:namuMissing, total:totalPersons, percentage:percent(namuReviewed,totalPersons), linked:namuLinked, not_found:namuNotFound }),
        spatial:Object.freeze({ done:spatial.ready, remaining:spatial.unresolved, total:spatial.total, percentage:spatial.percentage, review:spatial.review, macro_only:spatial.macro_only }),
        runtime_activity:Object.freeze({ done:Math.max(0,totalPersons-noActivity), remaining:noActivity, total:totalPersons, percentage:percent(Math.max(0,totalPersons-noActivity),totalPersons) })
      }),
      domain_breakdown:Object.freeze(domainBreakdown),
      quality:Object.freeze({
        no_runtime_activity:noActivity,
        domain_unclassified:domainMissing,
        namuwiki_missing:namuMissing,
        spatial_unresolved:spatial.unresolved,
        spatial_review:spatial.review,
        non_timeline_registry:Array.isArray(nonTimelineRows) ? nonTimelineRows.length : null
      }),
      sources:Object.freeze(sourceList)
    });
  }

  return Object.freeze({ DOMAIN_CODES, percent, uniquePolityIds, spatialStatus, buildDashboardSnapshot });
});