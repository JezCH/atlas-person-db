((root, factory) => {
  "use strict";
  const domainRegistry = typeof module === "object" && module.exports
    ? require("./atlas-person-domain-registry.js")
    : root?.ATLAS_PERSON_DOMAIN_REGISTRY;
  const spatialModel = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-model.js")
    : root?.ATLAS_PERSON_SPACETIME_MODEL;
  const eraModel = typeof module === "object" && module.exports
    ? require("./atlas-person-era-model.js")
    : root?.ATLAS_PERSON_ERA_MODEL;
  const api = factory(domainRegistry, spatialModel, eraModel);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_DASHBOARD_MODEL = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (domainRegistry, spatialModel, eraModel) => {
  "use strict";

  if (!domainRegistry) throw new Error("ATLAS_PERSON_DOMAIN_REGISTRY is required");
  if (!spatialModel) throw new Error("ATLAS_PERSON_SPACETIME_MODEL is required");
  if (!eraModel) throw new Error("ATLAS_PERSON_ERA_MODEL is required");
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
    const persons = personResult?.persons || [];
    const used = uniquePolityIds(personResult);
    if (!spatialIndex) return Object.freeze({
      total:null, ready:null, unresolved:null, review:null, macro_only:null, percentage:null,
      used_polities:used.size, unresolved_person_ids:null, reason_counts:null
    });

    const lookup = spatialModel.createSpatialLookup(spatialIndex);
    const reviewIds = new Set((spatialIndex.review_queue || []).map((row) => text(row?.polity_id)).filter((id) => used.has(id)));
    const macroOnlyIds = new Set(Object.keys(spatialIndex.polity_geography || {})
      .filter((id) => used.has(id) && !text(spatialIndex.polity_subregions?.[id])));
    const unresolvedPersonIds = new Set();
    const reasonCounts = {};
    let total = 0;
    let ready = 0;

    for (const person of persons) {
      for (const activity of person?.activity_summaries || []) {
        total += 1;
        const result = spatialModel.resolveActivityPlacement(activity, lookup);
        if (result?.status === "placed") {
          ready += 1;
          continue;
        }
        const reason = text(result?.reason || result?.chronology_reason || result?.status) || "unknown";
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        const personId = text(person?.id);
        if (personId) unresolvedPersonIds.add(personId);
      }
    }

    return Object.freeze({
      total,
      ready,
      unresolved:Math.max(0,total-ready),
      review:reviewIds.size,
      macro_only:macroOnlyIds.size,
      percentage:percent(ready,total),
      used_polities:used.size,
      unresolved_person_ids:Object.freeze([...unresolvedPersonIds].sort()),
      reason_counts:Object.freeze(Object.fromEntries(Object.entries(reasonCounts).sort(([a],[b]) => a.localeCompare(b))))
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

    const spatial = spatialStatus(personResult, spatialIndex);
    const spatialPersonIds = spatial.unresolved_person_ids;

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

  function buildKpiDrilldown({ personResult, attentionQueue } = {}) {
    const persons = personResult?.persons || [];
    const personIds = Object.freeze(persons.map((person) => text(person?.id)).filter(Boolean).sort());
    const byAttention = Object.fromEntries((attentionQueue?.items || []).map((item) => [item.code,item]));
    const personTarget = (code, label) => {
      const item = byAttention[code];
      const ids = Array.isArray(item?.person_ids) ? Object.freeze([...item.person_ids]) : null;
      return Object.freeze({
        code,
        label,
        available:Array.isArray(ids),
        mode:"person_ids",
        route:"persons",
        person_ids:ids,
        target_count:ids == null ? null : ids.length,
        unavailable_reason:ids == null ? item?.unavailable_reason || "TARGET_SET_UNAVAILABLE" : null
      });
    };
    return Object.freeze({
      persons:Object.freeze({
        code:"persons",
        label:"전체 인물",
        available:true,
        mode:"all_persons",
        route:"persons",
        person_ids:personIds,
        target_count:personIds.length,
        unavailable_reason:null
      }),
      activities:Object.freeze({
        code:"activities",
        label:"Runtime Activities",
        available:false,
        mode:"activity",
        route:null,
        person_ids:null,
        target_count:null,
        unavailable_reason:"ACTIVITY_UNIT_DRILLDOWN_NOT_EXPOSED"
      }),
      polities:Object.freeze({
        code:"polities",
        label:"Used Polities",
        available:false,
        mode:"polity",
        route:null,
        person_ids:null,
        target_count:null,
        unavailable_reason:"POLITY_UNIT_DRILLDOWN_NOT_EXPOSED"
      }),
      domain:personTarget("domain","대표 분야 미분류"),
      namuwiki:personTarget("namuwiki","나무위키 미검토"),
      spatial:Object.freeze({
        code:"spatial",
        label:"Spatial Ready",
        available:false,
        mode:"activity",
        route:null,
        person_ids:null,
        target_count:null,
        unavailable_reason:"SPATIAL_KPI_IS_ACTIVITY_UNIT_USE_ATTENTION_PERSON_TARGETS"
      })
    });
  }

  function buildIncompleteBreakdown({ personResult, domainResult = null, spatialIndex = null } = {}) {
    const persons = personResult?.persons || [];
    const domainAvailable = Boolean(domainResult && domainResult.by_person_id && typeof domainResult.by_person_id === "object");
    const domainByPerson = domainAvailable ? domainResult.by_person_id : {};
    const domainUnresolved = domainAvailable
      ? persons.filter((person) => !DOMAIN_CODES.includes(text(domainByPerson[person?.id]))).length
      : null;

    const namuwikiNotChecked = persons.filter((person) => {
      const status = text(person?.external_references?.namuwiki?.status);
      return status !== "linked" && status !== "not_found";
    }).length;

    const spatialStatusResult = spatialStatus(personResult, spatialIndex);
    const spatial = !spatialIndex ? Object.freeze({
      available:false,
      complete:false,
      total:null,
      unit:"activity",
      rows:Object.freeze([]),
      unattributed_count:null,
      unavailable_reason:"SPATIAL_SOURCE_UNAVAILABLE"
    }) : Object.freeze({
      available:true,
      complete:true,
      total:spatialStatusResult.unresolved,
      unit:"activity",
      rows:Object.freeze(Object.entries(spatialStatusResult.reason_counts || {}).map(([reason,count]) =>
        Object.freeze({ code:reason, label:reason, count, canonical:true })
      )),
      unattributed_count:0,
      unavailable_reason:null
    });

    return Object.freeze({
      domain:Object.freeze({
        available:false,
        complete:false,
        total:domainUnresolved,
        unit:"person",
        rows:Object.freeze([]),
        unattributed_count:domainUnresolved,
        unavailable_reason:domainAvailable ? "DOMAIN_UNRESOLVED_REASON_NOT_EXPOSED" : "PERSON_DOMAIN_SOURCE_UNAVAILABLE"
      }),
      namuwiki:Object.freeze({
        available:true,
        complete:true,
        total:namuwikiNotChecked,
        unit:"person",
        rows:Object.freeze([
          Object.freeze({ code:"REFERENCE_ABSENT", label:"Not checked", count:namuwikiNotChecked, canonical:false })
        ]),
        unattributed_count:0,
        unavailable_reason:null
      }),
      spatial,
      runtime:Object.freeze({
        available:false,
        complete:false,
        total:null,
        unit:"activity",
        rows:Object.freeze([]),
        unattributed_count:null,
        unavailable_reason:"RUNTIME_EXCLUSION_TARGET_SOURCE_NOT_EXPOSED"
      }),
      duplicate:Object.freeze({
        available:false,
        complete:false,
        total:null,
        unit:"person",
        rows:Object.freeze([]),
        unattributed_count:null,
        unavailable_reason:"DUPLICATE_REVIEW_TARGET_SOURCE_REQUIRES_ADMIN_CONTRACT"
      })
    });
  }

  function buildRecentDelta(recentDeltaResult = null) {
    if (!recentDeltaResult || !Array.isArray(recentDeltaResult.rows)) return Object.freeze({
      available:false,
      rows:Object.freeze([]),
      latest_at:null,
      tracked_sources:Object.freeze([]),
      gaps:Object.freeze(["RECENT_DELTA_SOURCE_UNAVAILABLE"])
    });
    const labelFor = (row) => {
      const key = `${text(row?.kind)}:${text(row?.operation)}`;
      const labels = {
        "authoring:create_activity":"Activity 등록",
        "profile:set_person_korean_name":"한글명 수정",
        "profile:set_person_external_reference":"외부참조 수정",
        "correction:relationship_correction":"Activity 보정",
        "merge:person_merge":"인물 병합"
      };
      return labels[key] || text(row?.operation) || text(row?.kind) || "변경";
    };
    const rows = recentDeltaResult.rows.map((row) => Object.freeze({
      occurred_at:text(row?.occurred_at) || null,
      kind:text(row?.kind),
      operation:text(row?.operation),
      label:labelFor(row),
      person_id:text(row?.person_id) || null,
      display_name:text(row?.display_name) || null,
      change_count:Number(row?.change_count || 0)
    })).filter((row) => row.occurred_at && row.kind && row.operation);
    const coverage = recentDeltaResult.coverage || {};
    const tracked = ["authoring","profile","correction","merge"].filter((key) => coverage[key] === true);
    const gaps = [];
    if (coverage.delete_person !== true) gaps.push(text(coverage.delete_person_reason) || "DELETE_PERSON_NOT_TRACKED");
    return Object.freeze({
      available:true,
      rows:Object.freeze(rows),
      latest_at:rows[0]?.occurred_at || null,
      tracked_sources:Object.freeze(tracked),
      gaps:Object.freeze(gaps)
    });
  }

  function buildSystemStrip(systemIdentityResult = null, sourceStates = {}) {
    const identity = systemIdentityResult?.identity && typeof systemIdentityResult.identity === "object"
      ? systemIdentityResult.identity
      : null;
    const provider = identity ? text(identity.provider) || null : null;
    const environment = identity ? text(identity.environment) || null : null;
    const gitCommitSha = identity ? text(identity.git_commit_sha) || null : null;
    const gitCommitRef = identity ? text(identity.git_commit_ref) || null : null;
    const region = identity ? text(identity.region) || null : null;
    const identityComplete = Boolean(provider && environment && gitCommitSha && gitCommitRef);
    const productionMain = environment && gitCommitRef
      ? environment === "production" && gitCommitRef === "main"
      : null;

    const states = Object.values(sourceStates || {});
    const sourceAvailable = states.length > 0;
    const ready = sourceAvailable ? states.filter((state) => state?.status === "ready").length : null;
    const errors = sourceAvailable ? states.filter((state) => state?.status === "error").length : null;
    const loading = sourceAvailable ? states.filter((state) => state?.status === "loading").length : null;

    return Object.freeze({
      available:Boolean(identity),
      provider,
      environment,
      git_commit_sha:gitCommitSha,
      git_commit_short:gitCommitSha ? gitCommitSha.slice(0,12) : null,
      git_commit_ref:gitCommitRef,
      region,
      identity_complete:identityComplete,
      production_main:productionMain,
      source_health:Object.freeze({
        available:sourceAvailable,
        total:sourceAvailable ? states.length : null,
        ready,
        errors,
        loading
      })
    });
  }

  function eraBounds(era) {
    const start = Number.isInteger(era?.start_year) ? spatialModel.historicalYearToOrdinal(era.start_year) : Number.NEGATIVE_INFINITY;
    const end = Number.isInteger(era?.end_year) ? spatialModel.historicalYearToOrdinal(era.end_year) : Number.POSITIVE_INFINITY;
    return Object.freeze({ start, end });
  }

  function segmentOverlapsEra(segment, era) {
    const start = spatialModel.historicalYearToOrdinal(Number(segment?.start_year));
    const end = spatialModel.historicalYearToOrdinal(Number(segment?.end_year));
    if (!Number.isInteger(start) || !Number.isInteger(end)) return false;
    const bounds = eraBounds(era);
    return start <= bounds.end && end >= bounds.start;
  }

  function buildEraRegionHeatmap({ personResult, spatialIndex } = {}) {
    const eras = eraModel.ERAS;
    if (!spatialIndex) return Object.freeze({
      available:false,
      unit:"placed_activity",
      eras,
      regions:Object.freeze([]),
      rows:Object.freeze([]),
      placed_activity_count:null,
      unresolved_activity_count:null,
      max_count:null,
      unavailable_reason:"SPATIAL_SOURCE_UNAVAILABLE"
    });

    const regions = Object.freeze((Array.isArray(spatialIndex.regions) && spatialIndex.regions.length
      ? spatialIndex.regions
      : spatialModel.REGION_DEFINITIONS).map((region) => Object.freeze({
        code:text(region?.code),
        label:text(region?.label) || text(region?.code)
      })).filter((region) => region.code));
    const regionCodes = new Set(regions.map((region) => region.code));
    const lookup = spatialModel.createSpatialLookup(spatialIndex);
    const counts = new Map();
    const seenCells = new Set();
    const placedActivities = new Set();
    let unresolvedActivityCount = 0;

    for (const person of personResult?.persons || []) {
      for (const activity of person?.activity_summaries || []) {
        const activityId = text(activity?.id);
        const result = spatialModel.resolveActivityPlacement(activity,lookup);
        if (result?.status !== "placed") {
          unresolvedActivityCount += 1;
          continue;
        }
        if (activityId) placedActivities.add(activityId);
        for (const segment of result.segments || []) {
          const regionCode = text(segment?.region_code);
          if (!regionCodes.has(regionCode)) continue;
          for (const era of eras) {
            if (!segmentOverlapsEra(segment,era)) continue;
            const key = `${activityId || text(person?.id)}|${era.code}|${regionCode}`;
            if (seenCells.has(key)) continue;
            seenCells.add(key);
            const cell = `${era.code}|${regionCode}`;
            counts.set(cell,(counts.get(cell) || 0) + 1);
          }
        }
      }
    }

    let maxCount = 0;
    const rows = eras.map((era) => {
      const cells = regions.map((region) => {
        const count = counts.get(`${era.code}|${region.code}`) || 0;
        maxCount=Math.max(maxCount,count);
        return Object.freeze({ era_code:era.code, region_code:region.code, count });
      });
      return Object.freeze({ era, cells:Object.freeze(cells), total:cells.reduce((sum,cell)=>sum+cell.count,0) });
    });

    return Object.freeze({
      available:true,
      unit:"placed_activity",
      eras,
      regions,
      rows:Object.freeze(rows),
      placed_activity_count:placedActivities.size,
      unresolved_activity_count:unresolvedActivityCount,
      max_count:maxCount,
      unavailable_reason:null
    });
  }

  function buildDashboardSnapshot({
    personResult,
    domainResult = null,
    spatialIndex = null,
    nonTimelineRows = null,
    recentDeltaResult = null,
    systemIdentityResult = null,
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
    const polityCount = uniquePolityIds(personResult).size;
    const attentionQueue = buildAttentionQueue({ personResult, domainResult, spatialIndex });
    const kpiDrilldown = buildKpiDrilldown({ personResult, attentionQueue });
    const incompleteBreakdown = buildIncompleteBreakdown({ personResult, domainResult, spatialIndex });
    const recentDelta = buildRecentDelta(recentDeltaResult);
    const systemStrip = buildSystemStrip(systemIdentityResult, sourceStates);
    const coverageHeatmap = buildEraRegionHeatmap({ personResult, spatialIndex });

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
      kpi_drilldown:kpiDrilldown,
      incomplete_breakdown:incompleteBreakdown,
      recent_delta:recentDelta,
      system_strip:systemStrip,
      coverage_heatmap:coverageHeatmap,
      quality:Object.freeze({
        no_runtime_activity:noActivity,
        spatial_unresolved:spatial.unresolved,
        spatial_review:spatial.review,
        non_timeline_registry:Array.isArray(nonTimelineRows) ? nonTimelineRows.length : null
      }),
      sources:Object.freeze(sourceList)
    });
  }

  return Object.freeze({ DOMAIN_CODES, percent, uniquePolityIds, spatialStatus, personPolityIds, buildAttentionQueue, buildKpiDrilldown, buildIncompleteBreakdown, buildRecentDelta, buildSystemStrip, buildEraRegionHeatmap, buildDashboardSnapshot });
});