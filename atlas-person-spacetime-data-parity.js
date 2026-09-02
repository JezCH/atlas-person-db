((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_DATA_PARITY = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function text(value) {
    const normalized = value == null ? "" : String(value).trim();
    return normalized || null;
  }

  function numberOrNull(value) {
    return Number.isInteger(value) ? value : null;
  }

  function boundarySignature(boundary) {
    return Object.freeze({
      year: numberOrNull(boundary?.year),
      month: numberOrNull(boundary?.month),
      day: numberOrNull(boundary?.day),
      granularity: text(boundary?.granularity),
      certainty: text(boundary?.certainty),
      calendar: text(boundary?.calendar)
    });
  }

  function entityIdentity(entity) {
    return Object.freeze({
      id: text(entity?.id),
      code: text(entity?.code)
    });
  }

  function activitySignature(activity) {
    return Object.freeze({
      activity_id: text(activity?.id),
      start: boundarySignature(activity?.start),
      end: boundarySignature(activity?.end),
      polity: Object.freeze({ id: text(activity?.polity?.id) }),
      relation: entityIdentity(activity?.relation),
      role: entityIdentity(activity?.role)
    });
  }

  function canonical(value) {
    return JSON.stringify(value);
  }

  function sourceSnapshot(persons) {
    const personIds = new Set();
    const activities = new Map();
    const duplicatePersonIds = new Set();
    const duplicateActivityIds = new Set();
    const missingPersonIds = [];
    const missingActivityIds = [];

    for (const [personIndex, person] of (Array.isArray(persons) ? persons : []).entries()) {
      const personId = text(person?.id);
      if (!personId) {
        missingPersonIds.push(personIndex);
        continue;
      }
      if (personIds.has(personId)) duplicatePersonIds.add(personId);
      personIds.add(personId);
      for (const [activityIndex, activity] of (Array.isArray(person?.activity_summaries) ? person.activity_summaries : []).entries()) {
        const signature = activitySignature(activity);
        const activityId = signature.activity_id;
        if (!activityId) {
          missingActivityIds.push(Object.freeze({ person_id: personId, activity_index: activityIndex }));
          continue;
        }
        if (activities.has(activityId)) duplicateActivityIds.add(activityId);
        activities.set(activityId, Object.freeze({ person_id: personId, signature }));
      }
    }

    return Object.freeze({
      person_ids: Object.freeze([...personIds].sort()),
      activities,
      duplicate_person_ids: Object.freeze([...duplicatePersonIds].sort()),
      duplicate_activity_ids: Object.freeze([...duplicateActivityIds].sort()),
      missing_person_ids: Object.freeze(missingPersonIds),
      missing_activity_ids: Object.freeze(missingActivityIds)
    });
  }

  function compiledSnapshot(compiledTracks) {
    const allTracks = [
      ...(Array.isArray(compiledTracks?.tracks) ? compiledTracks.tracks : []),
      ...(Array.isArray(compiledTracks?.unresolved_people) ? compiledTracks.unresolved_people : [])
    ];
    const personIds = new Set();
    const activities = new Map();
    const duplicatePersonIds = new Set();
    const conflictingActivityIds = new Set();
    const missingPersonIds = [];
    const missingActivityIds = [];

    function recordActivity(personId, activity, sourceKind) {
      const signature = activitySignature(activity);
      const activityId = signature.activity_id;
      if (!activityId) {
        missingActivityIds.push(Object.freeze({ person_id: personId, source_kind: sourceKind }));
        return;
      }
      const existing = activities.get(activityId);
      if (existing && (existing.person_id !== personId || canonical(existing.signature) !== canonical(signature))) {
        conflictingActivityIds.add(activityId);
        return;
      }
      if (!existing) activities.set(activityId, Object.freeze({ person_id: personId, signature }));
    }

    for (const [trackIndex, track] of allTracks.entries()) {
      const personId = text(track?.person_id);
      if (!personId) {
        missingPersonIds.push(trackIndex);
        continue;
      }
      if (personIds.has(personId)) duplicatePersonIds.add(personId);
      personIds.add(personId);

      for (const segment of (Array.isArray(track?.segments) ? track.segments : [])) {
        recordActivity(personId, segment?.activity, "segment");
      }
      for (const unresolved of (Array.isArray(track?.unresolved_activities) ? track.unresolved_activities : [])) {
        recordActivity(personId, unresolved?.activity, "unresolved_activity");
      }
    }

    return Object.freeze({
      person_ids: Object.freeze([...personIds].sort()),
      activities,
      duplicate_person_ids: Object.freeze([...duplicatePersonIds].sort()),
      conflicting_activity_ids: Object.freeze([...conflictingActivityIds].sort()),
      missing_person_ids: Object.freeze(missingPersonIds),
      missing_activity_ids: Object.freeze(missingActivityIds)
    });
  }

  function setDelta(left, right) {
    const rightSet = new Set(right);
    const leftSet = new Set(left);
    return Object.freeze({
      missing: Object.freeze(left.filter((value) => !rightSet.has(value))),
      unexpected: Object.freeze(right.filter((value) => !leftSet.has(value)))
    });
  }

  function verify(persons, compiledTracks) {
    const source = sourceSnapshot(persons);
    const compiled = compiledSnapshot(compiledTracks);
    const personIdentity = setDelta(source.person_ids, compiled.person_ids);
    const activityIdentity = setDelta([...source.activities.keys()].sort(), [...compiled.activities.keys()].sort());
    const temporal = [];
    const polity = [];
    const relation = [];
    const role = [];
    const personOwnership = [];

    for (const [activityId, sourceEntry] of source.activities) {
      const compiledEntry = compiled.activities.get(activityId);
      if (!compiledEntry) continue;
      if (sourceEntry.person_id !== compiledEntry.person_id) personOwnership.push(activityId);
      const left = sourceEntry.signature;
      const right = compiledEntry.signature;
      if (canonical({ start: left.start, end: left.end }) !== canonical({ start: right.start, end: right.end })) temporal.push(activityId);
      if (canonical(left.polity) !== canonical(right.polity)) polity.push(activityId);
      if (canonical(left.relation) !== canonical(right.relation)) relation.push(activityId);
      if (canonical(left.role) !== canonical(right.role)) role.push(activityId);
    }

    const structuralErrors = Object.freeze({
      source_duplicate_person_ids: source.duplicate_person_ids,
      source_duplicate_activity_ids: source.duplicate_activity_ids,
      source_missing_person_ids: source.missing_person_ids,
      source_missing_activity_ids: source.missing_activity_ids,
      compiled_duplicate_person_ids: compiled.duplicate_person_ids,
      compiled_conflicting_activity_ids: compiled.conflicting_activity_ids,
      compiled_missing_person_ids: compiled.missing_person_ids,
      compiled_missing_activity_ids: compiled.missing_activity_ids,
      person_activity_ownership_delta: Object.freeze(personOwnership.sort())
    });

    const report = {
      person_identity: personIdentity,
      activity_identity: activityIdentity,
      temporal_boundary_delta: Object.freeze(temporal.sort()),
      polity_delta: Object.freeze(polity.sort()),
      relation_delta: Object.freeze(relation.sort()),
      role_delta: Object.freeze(role.sort()),
      structural_errors: structuralErrors,
      source_person_count: source.person_ids.length,
      compiled_person_count: compiled.person_ids.length,
      source_activity_count: source.activities.size,
      compiled_activity_count: compiled.activities.size
    };

    const hasStructuralError = Object.values(structuralErrors).some((value) => Array.isArray(value) && value.length > 0);
    report.ok = !hasStructuralError
      && personIdentity.missing.length === 0
      && personIdentity.unexpected.length === 0
      && activityIdentity.missing.length === 0
      && activityIdentity.unexpected.length === 0
      && temporal.length === 0
      && polity.length === 0
      && relation.length === 0
      && role.length === 0;

    return Object.freeze(report);
  }

  function failureSummary(report) {
    if (report?.ok) return "ok";
    const counts = [
      ["person_identity", (report?.person_identity?.missing?.length || 0) + (report?.person_identity?.unexpected?.length || 0)],
      ["activity_identity", (report?.activity_identity?.missing?.length || 0) + (report?.activity_identity?.unexpected?.length || 0)],
      ["temporal_boundary", report?.temporal_boundary_delta?.length || 0],
      ["polity", report?.polity_delta?.length || 0],
      ["relation", report?.relation_delta?.length || 0],
      ["role", report?.role_delta?.length || 0]
    ].filter(([, count]) => count > 0).map(([name, count]) => `${name}=${count}`);
    const structural = Object.values(report?.structural_errors || {}).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);
    if (structural) counts.push(`structural=${structural}`);
    return counts.join(", ") || "unknown";
  }

  return Object.freeze({
    boundarySignature,
    entityIdentity,
    activitySignature,
    sourceSnapshot,
    compiledSnapshot,
    verify,
    failureSummary
  });
});
