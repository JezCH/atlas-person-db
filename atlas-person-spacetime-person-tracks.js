((root, factory) => {
  "use strict";
  const modelApi = typeof module === "object" && module.exports ? require("./atlas-person-spacetime-model.js") : root?.ATLAS_PERSON_SPACETIME_MODEL;
  const api = factory(modelApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_PERSON_TRACKS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (modelApi) => {
  "use strict";
  if (!modelApi) throw new Error("ATLAS_PERSON_SPACETIME_MODEL is required");
  function text(value) { return value == null ? "" : String(value).trim(); }
  function personLabel(person) { return text(person?.display_name) || text(person?.preferred_name_ko) || text(person?.canonical_name_en) || "이름 미상"; }
  function relationCode(activity) { return text(activity?.relation?.code); }
  function normalizedRefs(refs) {
    return Object.freeze(Array.from(new Set((Array.isArray(refs) ? refs : []).map(text).filter(Boolean))).sort());
  }
  function normalizePlacementMap(results) {
    if (results instanceof Map) return results;
    const map = new Map();
    for (const result of Array.isArray(results) ? results : []) if (text(result?.activity_id)) map.set(text(result.activity_id), result);
    return map;
  }
  function activityChronology(activity) {
    const startYear = Number.isInteger(activity?.start?.year) && activity.start.year !== 0 ? activity.start.year : null;
    const endYear = Number.isInteger(activity?.end?.year) && activity.end.year !== 0 ? activity.end.year : null;
    const startOrdinal = modelApi.historicalYearToOrdinal(startYear);
    const endOrdinal = modelApi.historicalYearToOrdinal(endYear);
    if (startOrdinal == null || endOrdinal == null || startOrdinal > endOrdinal) return null;
    return Object.freeze({ start_year: startYear, end_year: endYear, start_ordinal: startOrdinal, end_ordinal: endOrdinal });
  }
  function trackSegment(personId, activity, compiledSegment, segmentIndex) {
    const activityId = text(activity?.id);
    const startOrdinal = modelApi.historicalYearToOrdinal(compiledSegment?.start_year);
    const endOrdinal = modelApi.historicalYearToOrdinal(compiledSegment?.end_year);
    if (startOrdinal == null || endOrdinal == null || startOrdinal > endOrdinal) return null;
    return Object.freeze({
      stable_id: `${personId}:${activityId}:${segmentIndex}`, activity_id: activityId, segment_index: segmentIndex,
      start_year: compiledSegment.start_year, end_year: compiledSegment.end_year, start_ordinal: startOrdinal, end_ordinal: endOrdinal,
      x_anchor: Number.isFinite(Number(compiledSegment?.x_anchor)) ? Number(compiledSegment.x_anchor) : null,
      x_min: Number.isFinite(Number(compiledSegment?.x_min)) ? Number(compiledSegment.x_min) : null,
      x_max: Number.isFinite(Number(compiledSegment?.x_max)) ? Number(compiledSegment.x_max) : null,
      macroregion_code: text(compiledSegment?.macroregion_code) || text(compiledSegment?.region_code) || null,
      subregion_code: text(compiledSegment?.subregion_code) || null, spatial_precision: text(compiledSegment?.spatial_precision) || "unresolved",
      display_anchor_basis: text(compiledSegment?.display_anchor_basis) || null,
      place_function_type: text(compiledSegment?.place_function_type) || null,
      place_name: text(compiledSegment?.place_name) || null,
      place_id: text(compiledSegment?.place_id) || null,
      active_place_functions: Object.freeze((Array.isArray(compiledSegment?.active_place_functions) ? compiledSegment.active_place_functions : []).map((fn) => Object.freeze({
        function_type: text(fn?.function_type) || null,
        place_name: text(fn?.place_name) || null,
        place_id: text(fn?.place_id) || null,
        region_code: text(fn?.region_code) || null,
        confidence: text(fn?.confidence) || null,
        source_refs: normalizedRefs(fn?.source_refs)
      }))),
      display_place_points: Object.freeze((Array.isArray(compiledSegment?.display_place_points) ? compiledSegment.display_place_points : []).map((point) => Object.freeze({
        place_id: text(point?.place_id) || null,
        place_name: text(point?.place_name) || null,
        function_type: text(point?.function_type) || null,
        macroregion_code: text(point?.macroregion_code) || null,
        subregion_code: text(point?.subregion_code) || null,
        x_anchor: Number.isFinite(Number(point?.x_anchor)) ? Number(point.x_anchor) : null,
        display_anchor_basis: text(point?.display_anchor_basis) || null,
        display_source_refs: normalizedRefs(point?.display_source_refs)
      }))),
      polity_id: text(activity?.polity?.id) || text(compiledSegment?.polity_id) || null,
      relation_code: relationCode(activity) || null, role_code: text(activity?.role?.code) || null,
      role_label: text(activity?.role?.display_name) || text(activity?.role?.source_label) || null,
      historical_placement_basis: text(compiledSegment?.historical_placement_basis) || null,
      historical_confidence: text(compiledSegment?.historical_confidence) || null,
      historical_source_refs: normalizedRefs(compiledSegment?.historical_source_refs),
      display_confidence: text(compiledSegment?.display_confidence) || null,
      display_source_refs: normalizedRefs(compiledSegment?.display_source_refs),
      activity
    });
  }
  function compilePersonTrack(person, placementResults) {
    const personId = text(person?.id);
    if (!personId) throw new Error("PERSON_ID_REQUIRED_FOR_SPACETIME_TRACK");
    const placementMap = normalizePlacementMap(placementResults);
    const activities = Array.isArray(person?.activity_summaries) ? person.activity_summaries : [];
    const segments = [];
    const unresolvedActivities = [];
    for (const activity of activities) {
      const activityId = text(activity?.id);
      if (!activityId) { unresolvedActivities.push(Object.freeze({ activity_id: null, reason: "activity_id_missing", activity })); continue; }
      if (!activityChronology(activity)) { unresolvedActivities.push(Object.freeze({ activity_id: activityId, reason: "chronology_unresolved", activity })); continue; }
      const placement = placementMap.get(activityId);
      if (!placement || placement.status !== "placed") { unresolvedActivities.push(Object.freeze({ activity_id: activityId, reason: text(placement?.reason) || text(placement?.status) || "placement_missing", activity })); continue; }
      const compiledSegments = Array.isArray(placement.segments) ? placement.segments : [];
      if (!compiledSegments.length) { unresolvedActivities.push(Object.freeze({ activity_id: activityId, reason: "placement_segments_missing", activity })); continue; }
      compiledSegments.forEach((compiledSegment, segmentIndex) => {
        if (compiledSegment?.status && compiledSegment.status !== "placed") { unresolvedActivities.push(Object.freeze({ activity_id: activityId, reason: text(compiledSegment.reason) || text(compiledSegment.status), activity })); return; }
        const segment = trackSegment(personId, activity, compiledSegment, segmentIndex);
        if (segment) segments.push(segment); else unresolvedActivities.push(Object.freeze({ activity_id: activityId, reason: "compiled_segment_chronology_unresolved", activity }));
      });
    }
    segments.sort((a, b) => a.start_ordinal - b.start_ordinal || a.end_ordinal - b.end_ordinal || a.activity_id.localeCompare(b.activity_id) || a.segment_index - b.segment_index);
    const placedIds = [...new Set(segments.map((s) => s.activity_id))];
    return Object.freeze({
      track_id: personId, person_id: personId, display_name: personLabel(person), canonical_name_en: text(person?.canonical_name_en) || null,
      preferred_name_ko: text(person?.preferred_name_ko) || null, person, status: segments.length ? "placed" : "unresolved",
      activity_count: activities.length, placed_activity_count: placedIds.length, segment_count: segments.length,
      time_extent: segments.length ? Object.freeze({ start_ordinal: Math.min(...segments.map((s) => s.start_ordinal)), end_ordinal: Math.max(...segments.map((s) => s.end_ordinal)) }) : null,
      segments: Object.freeze(segments), unresolved_activities: Object.freeze(unresolvedActivities)
    });
  }
  function compilePersonTracks(persons, placementResults) {
    const placementMap = normalizePlacementMap(placementResults);
    const tracks = [], unresolvedPeople = [], unresolvedActivities = [];
    for (const person of Array.isArray(persons) ? persons : []) {
      const track = compilePersonTrack(person, placementMap);
      (track.status === "placed" ? tracks : unresolvedPeople).push(track);
      for (const unresolved of track.unresolved_activities) unresolvedActivities.push(Object.freeze({ person_id: track.person_id, display_name: track.display_name, ...unresolved }));
    }
    return Object.freeze({ tracks: Object.freeze(tracks), unresolved_people: Object.freeze(unresolvedPeople), unresolved_activities: Object.freeze(unresolvedActivities) });
  }
  return Object.freeze({ personLabel, normalizePlacementMap, activityChronology, compilePersonTrack, compilePersonTracks });
});