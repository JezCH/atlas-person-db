(() => {
  "use strict";

  function normalizeExact(value) {
    return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
  }

  function normalizeOptional(value) {
    const normalized = normalizeExact(value);
    return normalized || null;
  }

  function activityKey(row) {
    const person = normalizeExact(row?.person_name);
    const polity = normalizeExact(row?.politic_name);
    const start = Number(row?.activity_start);
    const end = row?.chronology_status === "ongoing" && row?.activity_end == null ? "<ONGOING>" : Number(row?.activity_end);
    const role = normalizeOptional(row?.role) ?? "<NULL_ROLE>";
    const basis = normalizeExact(row?.period_basis);
    return [person, polity, start, end, role, basis].join("\u0001").toLowerCase();
  }

  const api = Object.freeze({ normalizeExact, normalizeOptional, activityKey });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_ACTIVITY_SEMANTICS = api;
})();
