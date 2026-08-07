(() => {
  "use strict";

  const FIELDS = ["person_name", "politic_name", "activity_start", "activity_end", "role", "period_basis", "notes"];

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function normalizeLookup(value) {
    return normalizeText(value).toLowerCase();
  }

  function normalizeRecord(input) {
    return {
      id: input?.id ?? null,
      person_name: normalizeText(input?.person_name),
      politic_name: normalizeText(input?.politic_name),
      activity_start: Number(input?.activity_start),
      activity_end: Number(input?.activity_end),
      role: normalizeText(input?.role) || null,
      period_basis: normalizeText(input?.period_basis),
      notes: normalizeText(input?.notes) || null
    };
  }

  function validateRecord(record) {
    const errors = [];
    if (!record.person_name) errors.push("person_name is required");
    if (!record.politic_name) errors.push("politic_name is required");
    if (!Number.isInteger(record.activity_start)) errors.push("activity_start must be an integer");
    if (!Number.isInteger(record.activity_end)) errors.push("activity_end must be an integer");
    if (Number.isInteger(record.activity_start) && Number.isInteger(record.activity_end) && record.activity_end < record.activity_start) {
      errors.push("activity_end must be greater than or equal to activity_start");
    }
    return errors;
  }

  function activityKey(record) {
    return [record.person_name, record.politic_name, record.activity_start, record.activity_end].join("\u0001").toLowerCase();
  }

  function stableDigest(value) {
    const raw = JSON.stringify(value);
    let hash = 2166136261;
    for (let index = 0; index < raw.length; index += 1) {
      hash ^= raw.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function diffFields(before, after) {
    const changes = {};
    for (const field of FIELDS) {
      if (String(before[field] ?? "") !== String(after[field] ?? "")) {
        changes[field] = { before: before[field] ?? null, after: after[field] ?? null };
      }
    }
    return changes;
  }

  function planReconciliation({ existingRows = [], canonicalRows = [], excludedNames = [], obsoleteKeys = [], snapshotId = "unspecified" } = {}) {
    const existing = existingRows.map(normalizeRecord);
    const canonical = canonicalRows.map(normalizeRecord);
    const obsolete = new Set([...obsoleteKeys].map((value) => String(value).toLowerCase()));
    const excluded = new Set([...excludedNames].map(normalizeLookup));
    const validation_failures = [];
    const canonicalByKey = new Map();

    canonical.forEach((record, index) => {
      const errors = validateRecord(record);
      if (errors.length) {
        validation_failures.push({ source: "canonical", index, record, errors, reason_code: "INVALID_CANONICAL_RECORD" });
        return;
      }
      const key = activityKey(record);
      if (!canonicalByKey.has(key)) canonicalByKey.set(key, record);
    });

    const managedPersons = new Set([
      ...[...canonicalByKey.values()].map((record) => normalizeLookup(record.person_name)),
      ...excluded
    ]);

    const retainedKeys = new Set();
    const inserts = [];
    const updates = [];
    const deletes = [];
    const duplicate_removals = [];
    let unchanged = 0;

    for (const row of existing) {
      const errors = validateRecord(row);
      if (errors.length) {
        validation_failures.push({ source: "existing", id: row.id, record: row, errors, reason_code: "UNRESOLVED_IDENTITY" });
        continue;
      }

      const key = activityKey(row);
      const desired = canonicalByKey.get(key);
      const personKey = normalizeLookup(row.person_name);

      if (obsolete.has(key)) {
        deletes.push({ id: row.id, before: row, reason_code: "OBSOLETE_KEY", evidence: { activity_key: key } });
        continue;
      }

      if (managedPersons.has(personKey) && !desired) {
        deletes.push({ id: row.id, before: row, reason_code: "MANAGED_ROW_ABSENT_FROM_CANONICAL", evidence: { person_key: personKey, activity_key: key } });
        continue;
      }

      if (!desired) {
        unchanged += 1;
        continue;
      }

      if (retainedKeys.has(key)) {
        duplicate_removals.push({ id: row.id, before: row, reason_code: "EXACT_ACTIVITY_DUPLICATE", evidence: { activity_key: key } });
        continue;
      }

      retainedKeys.add(key);
      const changes = diffFields(row, desired);
      if (Object.keys(changes).length) {
        updates.push({ id: row.id, before: row, after: desired, changes, reason_code: "FIELD_DIFFERENCE", evidence: { activity_key: key } });
      } else {
        unchanged += 1;
      }
    }

    for (const [key, record] of canonicalByKey.entries()) {
      if (retainedKeys.has(key)) continue;
      inserts.push({ after: record, reason_code: "MISSING_FROM_LEGACY", evidence: { activity_key: key } });
    }

    const canonical_snapshot = {
      id: snapshotId,
      digest: stableDigest([...canonicalByKey.entries()].sort(([left], [right]) => left.localeCompare(right)))
    };

    return Object.freeze({
      marker: "PHASE_8B_RECONCILIATION_DRY_RUN",
      canonical_snapshot,
      existing_legacy_row_count: existing.length,
      canonical_valid_row_count: canonicalByKey.size,
      proposed_inserts: inserts,
      proposed_updates: updates,
      proposed_deletes: deletes,
      proposed_duplicate_removals: duplicate_removals,
      unchanged_row_count: unchanged,
      validation_failures,
      total_destructive_proposals: deletes.length + duplicate_removals.length,
      commit: false,
      database_writes: 0
    });
  }

  const api = Object.freeze({ planReconciliation, normalizeRecord, activityKey, stableDigest });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_RECONCILIATION_PLANNER = api;
})();
