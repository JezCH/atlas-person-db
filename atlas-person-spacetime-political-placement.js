((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_POLITICAL_PLACEMENT = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";
  const PRIMARY_RELATIONS = Object.freeze(new Set(["rules", "governs", "serves", "active_in", "claims_rule"]));
  const COUNTERPARTY_RELATIONS = Object.freeze(new Set(["opposes"]));
  function text(value) { return value == null ? "" : String(value).trim(); }
  function classifyRelation(code) {
    const normalized = text(code);
    if (PRIMARY_RELATIONS.has(normalized)) return "primary";
    if (COUNTERPARTY_RELATIONS.has(normalized)) return "counterparty";
    return "unclassified";
  }
  function extentForSegments(segments) {
    if (!segments.length) return null;
    const starts = segments.map((s) => Number(s.start_ordinal)).filter(Number.isFinite);
    const ends = segments.map((s) => Number(s.end_ordinal)).filter(Number.isFinite);
    const xMins = segments.map((s) => Number(s.x_min)).filter(Number.isFinite);
    const xMaxs = segments.map((s) => Number(s.x_max)).filter(Number.isFinite);
    return Object.freeze({
      time: starts.length && ends.length ? Object.freeze({ min: Math.min(...starts), max: Math.max(...ends) }) : null,
      space: xMins.length && xMaxs.length ? Object.freeze({ min: Math.min(...xMins), max: Math.max(...xMaxs) }) : null
    });
  }
  function partitionTrack(track) {
    const primarySegments = [], counterpartySegments = [], unclassifiedSegments = [];
    for (const segment of Array.isArray(track?.segments) ? track.segments : []) {
      const classification = classifyRelation(segment?.relation_code);
      const enriched = Object.freeze({ ...segment, political_spatial_class: classification });
      if (classification === "primary") primarySegments.push(enriched);
      else if (classification === "counterparty") counterpartySegments.push(enriched);
      else unclassifiedSegments.push(enriched);
    }
    const extent = extentForSegments(primarySegments);
    return Object.freeze({
      ...track,
      primary_spatial_status: primarySegments.length ? "placed" : "unresolved",
      primary_segments: Object.freeze(primarySegments), counterparty_segments: Object.freeze(counterpartySegments), unclassified_segments: Object.freeze(unclassifiedSegments),
      primary_time_extent: extent?.time || null, primary_space_extent: extent?.space || null,
      counterparty_overlay_available: counterpartySegments.length > 0, requires_relation_review: unclassifiedSegments.length > 0
    });
  }
  function partitionTracks(compiledTracks) {
    const tracks = [], primaryUnresolved = [], relationReview = [];
    for (const track of Array.isArray(compiledTracks?.tracks) ? compiledTracks.tracks : []) {
      const partitioned = partitionTrack(track);
      (partitioned.primary_spatial_status === "placed" ? tracks : primaryUnresolved).push(partitioned);
      if (partitioned.requires_relation_review) relationReview.push(partitioned);
    }
    return Object.freeze({
      tracks: Object.freeze(tracks), primary_unresolved: Object.freeze(primaryUnresolved), relation_review: Object.freeze(relationReview),
      source_unresolved_people: Object.freeze(Array.isArray(compiledTracks?.unresolved_people) ? compiledTracks.unresolved_people.slice() : []),
      source_unresolved_activities: Object.freeze(Array.isArray(compiledTracks?.unresolved_activities) ? compiledTracks.unresolved_activities.slice() : [])
    });
  }
  return Object.freeze({ PRIMARY_RELATIONS, COUNTERPARTY_RELATIONS, classifyRelation, extentForSegments, partitionTrack, partitionTracks });
});