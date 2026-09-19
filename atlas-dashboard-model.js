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

  function personPolityIds(person) {
    return new Set((person?.facets?.polities || []).map((polity) => text(polity?.id || polity)).filter(Boolean));
  }

  function buildAttentionQueue({ personResult, domainResult = null, spatialIndex = null } = {}) {
    const persons = personResult?.persons || [];
    const domainAvailable = Boolean(domainResult && domainResult.by_person_id && typeof domainResult.by_person_id === "object");
    const domainByPerson = domainAvailable ? domainResult.by_person_id : null;
    const domainPersonIds = domainAvailable
      ? persons.filter((person) => !DOMAIN_CODES.includes(text(domainByPerson[person?.id]))).map((person) => text(person?.id)).filter(Boolean)
      : null;

    const namuwikiPersonIds = persons
      .filter((person) => {
        const status = text(person?.external_references?.namuwiki?.status);
        return status !== "linked" && status !== "not_found";
      })
      .map((person) => text(person?.id))
      .filter(Boolean);

    let spatialPersonIds = null;
    if (spatialIndex) {
      const subregions = spatialIndex.polity_subregions || {};
      const placeFunctionIds = new Set((spatialIndex.place_function_records || []).map((row) => text(row?.polity_id)).filter(Boolean));
      const unresolvedPolityIds = new Set([...uniquePolityIds(personResult)].filter((id) => !text(subregions[id]) && !placeFunctionIds.has(id)));
      spatialPersonIds = persons
        .filter((person) => [...personPolityIds(person)].some((id) => unresolvedPolityIds.has(id)))
        .map((person) => text(person?.id))
        .filter(Boolean);
    }

    const items = [
      Object.freeze({
        code:"domain",
        label:"대표 분야 미분류",
        available:domainPersonIds !== null,
        count:domainPersonIds === null ? null : domainPersonIds.length,
        unit:"person",
        person_ids:domainPersonIds === null ? null : Object.freeze([...new Set(domainPersonIds)].sort()),
        unavailable_reason:domainPersonIds === null ? "PERSON_DOMAIN_SOURCE_UNAVAILABLE" : null
      }),
      Object.freeze({
        code:"namuwiki",
        label:"나무위키 미검토",
        available:true,
        count:namuwikiPersonIds.length,
        unit:"person",
        person_ids:Object.freeze([...new Set(namuwikiPersonIds)].sort()),
        unavailable_reason:null
      }),
      Object.freeze({
        code:"spatial",
        label:"Spatial 미해결 영향 인물",
        available:spatialPersonIds !== null,
        count:spatialPersonIds === null ? null : spatialPersonIds.length,
        unit:"person",
        person_ids:spatialPersonIds === null ? null : Object.freeze([...new Set(spatialPersonIds)].sort()),
        unavailable_reason:spatialPersonIds === null ? "SPATIAL_SOURCE_UNAVAILABLE" : null
      }),
      Object.freeze({
        code:"runtime_exclusion",
        label:"Runtime exclusion",
        available:false,
        count:null,
        unit:"person",
        person_ids:null,
        unavailable_reason:"RUNTIME_EXCLUSION_TARGET_SOURCE_NOT_EXPOSED"
      }),
      Object.freeze({
        code:"duplicate_review",
        label:"Duplicate review",
        available:false,
        count:null,
        unit:"person",
        person_ids:null,
        unavailable_reason:"DUPLICATE_REVIEW_TARGET_SOURCE_REQUIRES_ADMIN_CONTRACT"
      })
    ];

    const available = items.filter((item) => item.available && Array.isArray(item.person_ids));
    const affected = new Set(available.flatMap((item) => item.person_ids));
    const unavailableCodes = items.filter((item) => !item.available).map((item) => item.code);
    return Object.freeze({
      complete:unavailableCodes.length === 0,
      known_outstanding_checks:available.reduce((sum, item) => sum + Number(item.count || 0), 0),
      known_affected_persons:affected.size,
      available_categories:available.length,
      total_categories:items.length,
      unavailable_codes:Object.freeze(unavailableCodes),
      items:Object.freeze(items)
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
    const attentionQueue = buildAttentionQueue({ personResult, domainResult, spatialIndex });

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
      attention_queue:attentionQueue,
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

  return Object.freeze({ DOMAIN_CODES, percent, uniquePolityIds, spatialStatus, personPolityIds, buildAttentionQueue, buildDashboardSnapshot });
});