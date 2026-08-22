((root, factory) => {
  "use strict";
  const modelApi = typeof module === "object" && module.exports
    ? require("./atlas-person-spacetime-model.js")
    : root?.ATLAS_PERSON_SPACETIME_MODEL;
  const api = factory(modelApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_PERSON_TRACKS_V2 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, (modelApi) => {
  "use strict";

  if (!modelApi) throw new Error("ATLAS_PERSON_SPACETIME_MODEL is required");

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function personLabel(person) {
    return text(person?.display_name) || text(person?.preferred_name_ko) || text(person?.canonical_name_en) || "이름 미상";
  }

  function relationCode(activity) {
    return text(activity?.relation?.code);
  }

  function normalizePlacementMap(placementResults) {
    if (placementResults instanceof Map) return placementResults;
    const map = new Map();
    for (const result of Array.isArray(placementResults) ? placementResults : []) {
      const activityId = text(result?.activity_id);
      if (activityId) map.set(activityId, result);
    }
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
      stable_id: `${personId}:${activityId}:${segmentIndex}`,
      activity_id: activityId,
      segment_index: segmentIndex,
      start_year: compiledSegment.start_year,
      end_year: compiledSegment.end_year,
      start_ordinal: startOrdinal,
      end_ordinal: endOrdinal,
      x_anchor: Number.isFinite(Number(compiledSegment?.x_anchor)) ? Number(compiledSegment.x_anchor) : null,
      x_min: Number.isFinite(Number(compiledSegment?.x_min)) ? Number(compiledSegment.x_min) : null,
      x_max: Number.isFinite(Number(compiledSegment?.x_max)) ? Number(compiledSegment.x_max) : null,
      macroregion_code: text(compiledSegment?.macroregion_code) || text(compiledSegment?.region_code) || null,
      subregion_code: text(compiledSegment?.subregion_code) || null,
      spatial_precision: text(compiledSegment?.spatial_precision) || "unresolved",
      display_anchor_basis: text(compiledSegment?.display_anchor_basis) || null,
      polity_id: text(activity?.polity?.id) || text(compiledSegment?.polity_id) || null,
      relation_code: relationCode(activity) || null,
      is_counterparty_relation: relationCode(activity) === "opposes",
      role_code: text(activity?.role?.code) || null,
      role_label: text(activity?.role?.display_name) || text(activity?.role?.source_label) || null,
      historical_placement_basis: text(compiledSegment?.historical_placement_basis) || null,
      historical_confidence: text(compiledSegment?.historical_confidence) || null,
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
      if (!activityId) {
        unresolvedActivities.push(Object.freeze({ activity_id: null, reason: "activity_id_missing", activity }));
        continue;
      }
      const chronology = activityChronology(activity);
      if (!chronology) {
        unresolvedActivities.push(Object.freeze({ activity_id: activityId, reason: "chronology_unresolved", activity }));
        continue;
      }
      const placement = placementMap.get(activityId);
      if (!placement || placement.status !== "placed") {
        unresolvedActivities.push(Object.freeze({ activity_id: activityId, reason: text(placement?.reason) || text(placement?.status) || "placement_missing", activity }));
        continue;
      }
      const compiledSegments = Array.isArray(placement.segments) ? placement.segments : [];
      if (!compiledSegments.length) {
        unresolvedActivities.push(Object.freeze({ activity_id: activityId, reason: "placement_segments_missing", activity }));
        continue;
      }
      let activityPlaced = false;
      compiledSegments.forEach((compiledSegment, segmentIndex) => {
        if (compiledSegment?.status && compiledSegment.status !== "placed") {
          unresolvedActivities.push(Object.freeze({ activity_id: activityId, reason: text(compiledSegment.reason) || text(compiledSegment.status), activity }));
          return;
        }
        const segment = trackSegment(personId, activity, compiledSegment, segmentIndex);
        if (!segment) {
          unresolvedActivities.push(Object.freeze({ activity_id: activityId, reason: "compiled_segment_chronology_unresolved", activity }));
          return;
        }
        segments.push(segment);
        activityPlaced = true;
      });
      if (!activityPlaced && !unresolvedActivities.some((item) => item.activity_id === activityId)) {
        unresolvedActivities.push(Object.freeze({ activity_id: activityId, reason: "placement_segments_unusable", activity }));
      }
    }

    segments.sort((left, right) => left.start_ordinal - right.start_ordinal || left.end_ordinal - right.end_ordinal || left.activity_id.localeCompare(right.activity_id) || left.segment_index - right.segment_index);
    const startOrdinal = segments.length ? Math.min(...segments.map((segment) => segment.start_ordinal)) : null;
    const endOrdinal = segments.length ? Math.max(...segments.map((segment) => segment.end_ordinal)) : null;
    const xValuesMin = segments.map((segment) => segment.x_min).filter(Number.isFinite);
    const xValuesMax = segments.map((segment) => segment.x_max).filter(Number.isFinite);
    const placedActivityIds = [...new Set(segments.map((segment) => segment.activity_id))];

    return Object.freeze({
      track_id: personId,
      person_id: personId,
      display_name: personLabel(person),
      canonical_name_en: text(person?.canonical_name_en) || null,
      preferred_name_ko: text(person?.preferred_name_ko) || null,
      person,
      status: segments.length ? "placed" : "unresolved",
      activity_count: activities.length,
      placed_activity_count: placedActivityIds.length,
      segment_count: segments.length,
      time_extent: segments.length ? Object.freeze({
        start_ordinal: startOrdinal,
        end_ordinal: endOrdinal,
        start_year: modelApi.ordinalToHistoricalYear(startOrdinal),
        end_year: modelApi.ordinalToHistoricalYear(endOrdinal)
      }) : null,
      space_extent: xValuesMin.length && xValuesMax.length ? Object.freeze({ min: Math.min(...xValuesMin), max: Math.max(...xValuesMax) }) : null,
      segments: Object.freeze(segments),
      unresolved_activities: Object.freeze(unresolvedActivities)
    });
  }

  function compilePersonTracks(persons, placementResults) {
    const placementMap = normalizePlacementMap(placementResults);
    const tracks = [];
    const unresolvedPeople = [];
    const unresolvedActivities = [];

    for (const person of Array.isArray(persons) ? persons : []) {
      const track = compilePersonTrack(person, placementMap);
      if (track.status === "placed") tracks.push(track);
      else unresolvedPeople.push(track);
      for (const unresolved of track.unresolved_activities) {
        unresolvedActivities.push(Object.freeze({ person_id: track.person_id, display_name: track.display_name, ...unresolved }));
      }
    }

    tracks.sort((left, right) => {
      const leftStart = left.time_extent?.start_ordinal ?? Number.POSITIVE_INFINITY;
      const rightStart = right.time_extent?.start_ordinal ?? Number.POSITIVE_INFINITY;
      return leftStart - rightStart || left.display_name.localeCompare(right.display_name, "ko") || left.person_id.localeCompare(right.person_id);
    });
    unresolvedPeople.sort((left, right) => left.display_name.localeCompare(right.display_name, "ko") || left.person_id.localeCompare(right.person_id));

    return Object.freeze({
      tracks: Object.freeze(tracks),
      unresolved_people: Object.freeze(unresolvedPeople),
      unresolved_activities: Object.freeze(unresolvedActivities)
    });
  }

  return Object.freeze({
    personLabel,
    activityChronology,
    normalizePlacementMap,
    compilePersonTrack,
    compilePersonTracks
  });
});