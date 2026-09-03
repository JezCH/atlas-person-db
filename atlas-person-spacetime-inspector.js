((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_INSPECTOR = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function text(value) {
    const normalized = value == null ? "" : String(value).trim();
    return normalized || null;
  }

  function normalizedRefs(refs) {
    return Object.freeze([...new Set((Array.isArray(refs) ? refs : []).map(text).filter(Boolean))].sort());
  }

  function segmentClassification(segment, fallback) {
    const explicit = text(segment?.political_spatial_class);
    if (explicit) return explicit;
    return fallback || "unclassified";
  }

  function allClassifiedSegments(track) {
    const rows = [];
    const seen = new Set();
    const push = (segments, fallback) => {
      for (const segment of Array.isArray(segments) ? segments : []) {
        const key = text(segment?.stable_id) || `${text(segment?.activity_id) || ""}:${segment?.segment_index ?? ""}:${segment?.start_ordinal ?? ""}:${segment?.end_ordinal ?? ""}:${fallback}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(Object.freeze({ ...segment, inspector_classification: segmentClassification(segment, fallback) }));
      }
    };
    push(track?.primary_segments, "primary");
    push(track?.counterparty_segments, "counterparty");
    push(track?.unclassified_segments, "unclassified");
    if (!rows.length) push(track?.segments, null);
    return rows;
  }

  function groupActivities(track) {
    const groups = new Map();
    for (const segment of allClassifiedSegments(track)) {
      const activityId = text(segment?.activity_id);
      if (!activityId) continue;
      if (!groups.has(activityId)) groups.set(activityId, []);
      groups.get(activityId).push(segment);
    }

    const activities = [];
    for (const [activityId, segments] of groups) {
      segments.sort((a,b)=>
        Number(a?.start_ordinal)-Number(b?.start_ordinal)
        || Number(a?.end_ordinal)-Number(b?.end_ordinal)
        || Number(a?.segment_index)-Number(b?.segment_index)
      );
      const activity = segments.find((segment)=>segment?.activity)?.activity || null;
      const starts = segments.map((segment)=>Number(segment?.start_ordinal)).filter(Number.isFinite);
      const ends = segments.map((segment)=>Number(segment?.end_ordinal)).filter(Number.isFinite);
      const startOrdinal = starts.length ? Math.min(...starts) : null;
      const endOrdinal = ends.length ? Math.max(...ends) : null;
      const midpointOrdinal = startOrdinal == null || endOrdinal == null ? null : Math.floor((startOrdinal + endOrdinal) / 2);
      const classifications = [...new Set(segments.map((segment)=>segment.inspector_classification))];
      const sourceRefs = normalizedRefs(segments.flatMap((segment)=>[
        ...(Array.isArray(segment?.historical_source_refs) ? segment.historical_source_refs : []),
        ...(Array.isArray(segment?.display_source_refs) ? segment.display_source_refs : [])
      ]));
      activities.push(Object.freeze({
        activity_id: activityId,
        activity,
        segments: Object.freeze(segments.slice()),
        start_ordinal: startOrdinal,
        end_ordinal: endOrdinal,
        midpoint_ordinal: midpointOrdinal,
        classifications: Object.freeze(classifications),
        source_refs: sourceRefs
      }));
    }

    activities.sort((a,b)=>
      (a.start_ordinal ?? Number.POSITIVE_INFINITY)-(b.start_ordinal ?? Number.POSITIVE_INFINITY)
      || (a.end_ordinal ?? Number.POSITIVE_INFINITY)-(b.end_ordinal ?? Number.POSITIVE_INFINITY)
      || a.activity_id.localeCompare(b.activity_id)
    );
    return Object.freeze(activities);
  }

  function selectedActivity(track, activityId) {
    const id = text(activityId);
    if (!id) return null;
    return groupActivities(track).find((group)=>group.activity_id===id) || null;
  }

  function activityMidpointOrdinal(track, activityId) {
    return selectedActivity(track, activityId)?.midpoint_ordinal ?? null;
  }

  function personExtent(track) {
    const activities = groupActivities(track);
    const starts = activities.map((group)=>group.start_ordinal).filter(Number.isFinite);
    const ends = activities.map((group)=>group.end_ordinal).filter(Number.isFinite);
    if (!starts.length || !ends.length) return null;
    return Object.freeze({ start_ordinal:Math.min(...starts), end_ordinal:Math.max(...ends) });
  }

  function placementSlices(group) {
    return Object.freeze((group?.segments || []).map((segment)=>Object.freeze({
      stable_id:text(segment?.stable_id),
      classification:text(segment?.inspector_classification) || text(segment?.political_spatial_class) || "unclassified",
      start_ordinal:Number.isFinite(Number(segment?.start_ordinal)) ? Number(segment.start_ordinal) : null,
      end_ordinal:Number.isFinite(Number(segment?.end_ordinal)) ? Number(segment.end_ordinal) : null,
      spatial_precision:text(segment?.spatial_precision) || "unresolved",
      historical_placement_basis:text(segment?.historical_placement_basis),
      historical_confidence:text(segment?.historical_confidence),
      display_confidence:text(segment?.display_confidence),
      macroregion_code:text(segment?.macroregion_code),
      subregion_code:text(segment?.subregion_code),
      place_id:text(segment?.place_id),
      place_name:text(segment?.place_name),
      place_function_type:text(segment?.place_function_type),
      historical_source_refs:normalizedRefs(segment?.historical_source_refs),
      display_source_refs:normalizedRefs(segment?.display_source_refs)
    })));
  }

  return Object.freeze({
    normalizedRefs,
    allClassifiedSegments,
    groupActivities,
    selectedActivity,
    activityMidpointOrdinal,
    personExtent,
    placementSlices
  });
});
