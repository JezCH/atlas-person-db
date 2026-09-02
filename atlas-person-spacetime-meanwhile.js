((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_MEANWHILE = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function text(value) { return value == null ? "" : String(value).trim(); }

  function activeAtOrdinal(segment, ordinal) {
    const point = Number(ordinal);
    const start = Number(segment?.start_ordinal);
    const end = Number(segment?.end_ordinal);
    return Number.isFinite(point) && Number.isFinite(start) && Number.isFinite(end) && start <= point && point <= end;
  }

  function activeActivityEntries(tracks, ordinal) {
    const point = Number(ordinal);
    if (!Number.isFinite(point)) return Object.freeze([]);
    const entries = [];
    const seen = new Set();
    for (const track of Array.isArray(tracks) ? tracks : []) {
      for (const segment of Array.isArray(track?.primary_segments) ? track.primary_segments : []) {
        if (!activeAtOrdinal(segment, point)) continue;
        const personId = text(track?.person_id);
        const activityId = text(segment?.activity_id);
        const key = `${personId}\u0000${activityId}`;
        if (!personId || !activityId || seen.has(key)) continue;
        seen.add(key);
        entries.push(Object.freeze({
          person_id: personId,
          display_name: text(track?.display_name) || personId,
          activity_id: activityId,
          macroregion_code: text(segment?.macroregion_code) || null,
          start_ordinal: Number(segment.start_ordinal),
          end_ordinal: Number(segment.end_ordinal),
          activity: segment.activity || null,
          segment
        }));
      }
    }
    entries.sort((a, b) =>
      text(a.macroregion_code).localeCompare(text(b.macroregion_code))
      || text(a.display_name).localeCompare(text(b.display_name), "ko")
      || text(a.activity_id).localeCompare(text(b.activity_id))
    );
    return Object.freeze(entries);
  }

  function summarize(tracks, ordinal, regionCodes = []) {
    const entries = activeActivityEntries(tracks, ordinal);
    const personIds = new Set(entries.map((entry) => entry.person_id));
    const regionSets = new Map((Array.isArray(regionCodes) ? regionCodes : []).map((code) => [text(code), new Set()]));
    for (const entry of entries) {
      const code = text(entry.macroregion_code);
      if (!code) continue;
      if (!regionSets.has(code)) regionSets.set(code, new Set());
      regionSets.get(code).add(entry.person_id);
    }
    const regionCounts = [...regionSets.entries()].map(([code, ids]) => Object.freeze({ code, unique_person_count: ids.size }));
    return Object.freeze({
      ordinal: Number(ordinal),
      activity_count: entries.length,
      unique_person_count: personIds.size,
      person_ids: Object.freeze([...personIds].sort()),
      region_counts: Object.freeze(regionCounts),
      entries
    });
  }

  return Object.freeze({ activeAtOrdinal, activeActivityEntries, summarize });
});
