"use strict";

const NAME_CATALOGS = Object.freeze([
  Object.freeze({ key: "persons", names: "person_names", entityId: "id", nameEntityId: "person_id" }),
  Object.freeze({ key: "polities", names: "polity_names", entityId: "id", nameEntityId: "polity_id" }),
  Object.freeze({ key: "roles", names: "role_names", entityId: "id", nameEntityId: "role_id" }),
  Object.freeze({ key: "period_bases", names: "period_basis_names", entityId: "id", nameEntityId: "period_basis_id" }),
  Object.freeze({ key: "governance_contexts", names: "governance_context_names", entityId: "id", nameEntityId: "governance_context_id" }),
  Object.freeze({ key: "polity_designations", names: "polity_designation_names", entityId: "id", nameEntityId: "polity_designation_id" }),
  Object.freeze({ key: "people_groups", names: "people_group_names", entityId: "id", nameEntityId: "people_group_id" }),
  Object.freeze({ key: "historical_events", names: "historical_event_names", entityId: "id", nameEntityId: "historical_event_id" })
]);

function rows(datasets, key) {
  return Array.isArray(datasets?.[key]) ? datasets[key] : [];
}

function text(value) {
  return String(value ?? "").trim();
}

function normalizedName(value) {
  return text(value).normalize("NFKC").replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function isPreferred(row) {
  return row?.is_preferred === true || row?.is_preferred === "true" || row?.is_preferred === 1;
}

function isKorean(row) {
  const locale = text(row?.locale).toLowerCase();
  return locale === "ko" || locale.startsWith("ko-");
}

function isEnglish(row) {
  const locale = text(row?.locale).toLowerCase();
  return locale === "en" || locale.startsWith("en-");
}

function preferredLabelMap(nameRows, entityIdKey) {
  const result = new Map();
  for (const row of nameRows) {
    const id = text(row?.[entityIdKey]);
    const name = text(row?.name);
    if (!id || !name) continue;
    const current = result.get(id) || {};
    if (isPreferred(row) && isKorean(row)) current.ko = name;
    if (isPreferred(row) && isEnglish(row)) current.en = name;
    if (!current.fallback) current.fallback = name;
    result.set(id, current);
  }
  return result;
}

function koreanCoverage(entities, nameRows, entityIdKey, nameEntityIdKey) {
  const labels = preferredLabelMap(nameRows, nameEntityIdKey);
  const anyKorean = new Set(
    nameRows
      .filter((row) => isKorean(row) && text(row?.name))
      .map((row) => text(row?.[nameEntityIdKey]))
      .filter(Boolean)
  );
  const preferredKorean = new Set(
    nameRows
      .filter((row) => isKorean(row) && isPreferred(row) && text(row?.name))
      .map((row) => text(row?.[nameEntityIdKey]))
      .filter(Boolean)
  );
  const missingAny = [];
  const missingPreferred = [];
  for (const entity of entities) {
    const id = text(entity?.[entityIdKey]);
    if (!id) continue;
    const label = labels.get(id) || {};
    const item = Object.freeze({ id, display_name: label.ko || label.en || label.fallback || id });
    if (!anyKorean.has(id)) missingAny.push(item);
    if (!preferredKorean.has(id)) missingPreferred.push(item);
  }
  return Object.freeze({
    total: entities.length,
    with_any_ko: entities.length - missingAny.length,
    with_preferred_ko: entities.length - missingPreferred.length,
    missing_any_ko: Object.freeze(missingAny),
    missing_preferred_ko: Object.freeze(missingPreferred)
  });
}

function activitySemanticTuple(activity) {
  return [
    activity?.person_id,
    activity?.polity_id,
    activity?.relation_type_id,
    activity?.role_id ?? null,
    activity?.period_basis_id,
    activity?.activity_start,
    activity?.activity_start_month ?? null,
    activity?.activity_start_day ?? null,
    activity?.activity_start_granularity,
    activity?.activity_start_calendar,
    activity?.activity_end,
    activity?.activity_end_month ?? null,
    activity?.activity_end_day ?? null,
    activity?.activity_end_granularity,
    activity?.activity_end_calendar
  ].map((value) => value ?? null);
}

function exactActivityDuplicateGroups(activities) {
  const groups = new Map();
  for (const activity of activities) {
    const key = JSON.stringify(activitySemanticTuple(activity));
    const items = groups.get(key) || [];
    items.push(text(activity?.id));
    groups.set(key, items);
  }
  return Object.freeze(
    [...groups.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([semantic_key, activity_ids]) => Object.freeze({ semantic_key, activity_ids: Object.freeze(activity_ids.filter(Boolean).sort()) }))
      .sort((a, b) => a.semantic_key.localeCompare(b.semantic_key))
  );
}

function eventLikePolityReview(polities, polityNames) {
  const labels = preferredLabelMap(polityNames, "polity_id");
  const pattern = /(?:^|\b)(?:world war|war|battle|revolution|uprising)(?:\b|$)/i;
  const result = [];
  for (const polity of polities) {
    const id = text(polity?.id);
    if (!id) continue;
    const label = labels.get(id) || {};
    const candidate = label.en || label.fallback || "";
    if (!pattern.test(candidate)) continue;
    result.push(Object.freeze({
      polity_id: id,
      display_name: label.ko || label.en || label.fallback || id,
      english_name: label.en || null,
      verdict: "REVIEW_ONLY_EVENT_LIKE_POLITY_NAME"
    }));
  }
  return Object.freeze(result.sort((a, b) => a.display_name.localeCompare(b.display_name)));
}

function crossCategoryNameCollisions(polityNames, eventNames) {
  const polityByName = new Map();
  for (const row of polityNames) {
    const name = normalizedName(row?.name);
    const id = text(row?.polity_id);
    if (!name || !id) continue;
    const ids = polityByName.get(name) || new Set();
    ids.add(id);
    polityByName.set(name, ids);
  }
  const eventByName = new Map();
  for (const row of eventNames) {
    const name = normalizedName(row?.name);
    const id = text(row?.historical_event_id);
    if (!name || !id) continue;
    const ids = eventByName.get(name) || new Set();
    ids.add(id);
    eventByName.set(name, ids);
  }
  const result = [];
  for (const [name, polityIds] of polityByName.entries()) {
    const eventIds = eventByName.get(name);
    if (!eventIds) continue;
    result.push(Object.freeze({
      normalized_name: name,
      polity_ids: Object.freeze([...polityIds].sort()),
      historical_event_ids: Object.freeze([...eventIds].sort()),
      verdict: "REVIEW_CROSS_CATEGORY_NAME_COLLISION"
    }));
  }
  return Object.freeze(result.sort((a, b) => a.normalized_name.localeCompare(b.normalized_name)));
}

function collectSourceReferenceIds(datasets) {
  const ids = new Set();
  for (const [key, datasetRows] of Object.entries(datasets || {})) {
    if (key === "sources" || !Array.isArray(datasetRows)) continue;
    for (const row of datasetRows) {
      const sourceId = text(row?.source_id);
      if (sourceId) ids.add(sourceId);
    }
  }
  return ids;
}

function auditBaselineBDocument(baseline) {
  const datasets = baseline?.datasets || {};
  const persons = rows(datasets, "persons");
  const polities = rows(datasets, "polities");
  const activities = rows(datasets, "activities");
  const activitySources = rows(datasets, "activity_sources");
  const sources = rows(datasets, "sources");
  const roles = rows(datasets, "roles");
  const periodBases = rows(datasets, "period_bases");
  const relationTypes = rows(datasets, "relation_types");

  const activityIds = new Set(activities.map((row) => text(row?.id)).filter(Boolean));
  const personIds = new Set(persons.map((row) => text(row?.id)).filter(Boolean));
  const polityIds = new Set(polities.map((row) => text(row?.id)).filter(Boolean));
  const roleIds = new Set(roles.map((row) => text(row?.id)).filter(Boolean));
  const periodBasisIds = new Set(periodBases.map((row) => text(row?.id)).filter(Boolean));
  const relationTypeIds = new Set(relationTypes.map((row) => text(row?.id)).filter(Boolean));
  const sourceIds = new Set(sources.map((row) => text(row?.id)).filter(Boolean));

  const activitySourceIds = new Set(activitySources.map((row) => text(row?.person_politics_id)).filter(Boolean));
  const zeroSourceActivities = activities
    .filter((row) => !activitySourceIds.has(text(row?.id)))
    .map((row) => text(row?.id))
    .filter(Boolean)
    .sort();

  const danglingActivitySourceLinks = activitySources
    .filter((row) => !activityIds.has(text(row?.person_politics_id)) || !sourceIds.has(text(row?.source_id)))
    .map((row) => Object.freeze({
      person_politics_id: text(row?.person_politics_id) || null,
      source_id: text(row?.source_id) || null
    }));

  const danglingActivityReferences = activities
    .filter((row) =>
      !personIds.has(text(row?.person_id)) ||
      !polityIds.has(text(row?.polity_id)) ||
      !relationTypeIds.has(text(row?.relation_type_id)) ||
      (text(row?.role_id) && !roleIds.has(text(row?.role_id))) ||
      !periodBasisIds.has(text(row?.period_basis_id))
    )
    .map((row) => text(row?.id))
    .filter(Boolean)
    .sort();

  const semanticV2Incomplete = activities
    .filter((row) =>
      !text(row?.relation_type_id) ||
      !text(row?.period_basis_id) ||
      !text(row?.activity_start_granularity) ||
      !text(row?.activity_start_calendar) ||
      !text(row?.activity_end_granularity) ||
      !text(row?.activity_end_calendar)
    )
    .map((row) => text(row?.id))
    .filter(Boolean)
    .sort();

  const usedPolities = new Set(activities.map((row) => text(row?.polity_id)).filter(Boolean));
  const usedRoles = new Set(activities.map((row) => text(row?.role_id)).filter(Boolean));
  const usedPeriodBases = new Set(activities.map((row) => text(row?.period_basis_id)).filter(Boolean));
  const usedSourceIds = collectSourceReferenceIds(datasets);

  const korean = {};
  for (const descriptor of NAME_CATALOGS) {
    korean[descriptor.key] = koreanCoverage(
      rows(datasets, descriptor.key),
      rows(datasets, descriptor.names),
      descriptor.entityId,
      descriptor.nameEntityId
    );
  }

  const duplicateGroups = exactActivityDuplicateGroups(activities);
  const eventLikePolities = eventLikePolityReview(polities, rows(datasets, "polity_names"));
  const categoryCollisions = crossCategoryNameCollisions(rows(datasets, "polity_names"), rows(datasets, "historical_event_names"));
  const summary = Object.freeze({
    persons: persons.length,
    activities: activities.length,
    polities: polities.length,
    sources: sources.length,
    zero_source_activities: zeroSourceActivities.length,
    dangling_activity_source_links: danglingActivitySourceLinks.length,
    dangling_activity_references: danglingActivityReferences.length,
    semantic_v2_incomplete: semanticV2Incomplete.length,
    exact_activity_duplicate_groups: duplicateGroups.length,
    polity_event_name_review_candidates: eventLikePolities.length,
    cross_category_name_collisions: categoryCollisions.length
  });

  return Object.freeze({
    schema: "atlas-project-integrity-audit/v1",
    baseline_schema: baseline?.schema || null,
    baseline_digest: baseline?.baseline_digest || null,
    summary,
    korean: Object.freeze(korean),
    provenance: Object.freeze({
      zero_source_activity_ids: Object.freeze(zeroSourceActivities),
      dangling_activity_source_links: Object.freeze(danglingActivitySourceLinks),
      unreferenced_source_ids: Object.freeze([...sourceIds].filter((id) => !usedSourceIds.has(id)).sort())
    }),
    activity_integrity: Object.freeze({
      semantic_v2_incomplete_ids: Object.freeze(semanticV2Incomplete),
      dangling_reference_activity_ids: Object.freeze(danglingActivityReferences),
      exact_duplicate_groups: duplicateGroups
    }),
    catalog_usage: Object.freeze({
      activity_unreferenced_polity_ids: Object.freeze([...polityIds].filter((id) => !usedPolities.has(id)).sort()),
      activity_unreferenced_role_ids: Object.freeze([...roleIds].filter((id) => !usedRoles.has(id)).sort()),
      activity_unreferenced_period_basis_ids: Object.freeze([...periodBasisIds].filter((id) => !usedPeriodBases.has(id)).sort())
    }),
    semantic_review: Object.freeze({
      event_like_polities: eventLikePolities,
      polity_historical_event_name_collisions: categoryCollisions
    }),
    policy: Object.freeze({
      destructive_cleanup_authorized: false,
      event_like_name_is_review_signal_only: true,
      activity_unreferenced_catalog_entry_is_not_automatically_orphaned: true
    })
  });
}

module.exports = Object.freeze({
  NAME_CATALOGS,
  normalizedName,
  koreanCoverage,
  activitySemanticTuple,
  exactActivityDuplicateGroups,
  eventLikePolityReview,
  crossCategoryNameCollisions,
  auditBaselineBDocument
});
