"use strict";

const SIGNALS = Object.freeze({
  EXACT_ACTIVITY_DUPLICATE: "exact_activity_duplicate",
  RELATION_VARIANT_SAME_SLOT: "relation_variant_same_slot",
  ROLE_VARIANT_SAME_SLOT: "role_variant_same_slot",
  POLITY_VARIANT_SAME_SLOT: "polity_variant_same_slot",
  CONTAINMENT_SAME_CONTEXT: "containment_same_context"
});

const VERDICTS = Object.freeze({
  EXACT_DUPLICATE: "exact_duplicate",
  MIGRATION_DUPLICATE_RELATION_GAP: "migration_duplicate_relation_gap",
  RELATION_VARIANT_REVIEW: "relation_variant_review",
  ROLE_ALIAS_REVIEW: "role_alias_review",
  POLITY_IDENTITY_REVIEW: "polity_identity_review",
  STALE_WIDE_INTERVAL_REVIEW: "stale_wide_interval_review"
});

function nullableId(value) {
  if (value == null || String(value).trim() === "") return null;
  return String(value).trim().toLowerCase();
}

function nestedId(value) {
  if (value && typeof value === "object") return nullableId(value.id);
  return nullableId(value);
}

function boundary(row, side) {
  const nested = row?.[side] && typeof row[side] === "object" ? row[side] : null;
  const prefix = side === "start" ? "activity_start" : "activity_end";
  return Object.freeze({
    year: Number(nested?.year ?? row?.[prefix]),
    month: nested?.month ?? row?.[`${prefix}_month`] ?? null,
    day: nested?.day ?? row?.[`${prefix}_day`] ?? null,
    granularity: nested?.granularity ?? row?.[`${prefix}_granularity`] ?? null,
    calendar: nested?.calendar ?? row?.[`${prefix}_calendar`] ?? null
  });
}

function boundaryKey(value) {
  return [value.year, value.month ?? "_", value.day ?? "_", value.granularity ?? "_", value.calendar ?? "_"].join(":");
}

function normalizeActivity(row) {
  const personId = nullableId(row?.person_id ?? row?.historical_person_id);
  const polityId = nestedId(row?.polity) ?? nullableId(row?.polity_id);
  const relationTypeId = nestedId(row?.relation) ?? nullableId(row?.relation_type_id);
  const roleId = nestedId(row?.role) ?? nullableId(row?.role_id);
  const periodBasisId = nestedId(row?.period_basis) ?? nullableId(row?.period_basis_id);
  const id = nullableId(row?.id ?? row?.activity_id);
  const start = boundary(row, "start");
  const end = boundary(row, "end");
  if (!id || !personId || !polityId || !periodBasisId || !Number.isInteger(start.year) || !Number.isInteger(end.year)) {
    throw new Error("ACTIVITY_DUPLICATE_AUDIT_ROW_INCOMPLETE");
  }
  return Object.freeze({
    id,
    person_id: personId,
    polity_id: polityId,
    relation_type_id: relationTypeId,
    role_id: roleId,
    period_basis_id: periodBasisId,
    start,
    end
  });
}

function same(a, b, fields) {
  return fields.every((field) => a[field] === b[field]);
}

function sameBoundary(a, b) {
  return boundaryKey(a.start) === boundaryKey(b.start) && boundaryKey(a.end) === boundaryKey(b.end);
}

function contains(a, b) {
  return a.start.year <= b.start.year && a.end.year >= b.end.year &&
    (a.start.year < b.start.year || a.end.year > b.end.year);
}

function pairSignal(leftRaw, rightRaw) {
  const left = normalizeActivity(leftRaw);
  const right = normalizeActivity(rightRaw);
  if (left.person_id !== right.person_id || left.id === right.id) return null;

  const sameTime = sameBoundary(left, right);
  const exactContext = ["person_id", "polity_id", "relation_type_id", "role_id", "period_basis_id"];

  if (same(left, right, exactContext) && sameTime) {
    return SIGNALS.EXACT_ACTIVITY_DUPLICATE;
  }
  if (sameTime && same(left, right, ["person_id", "polity_id", "role_id", "period_basis_id"]) &&
      left.relation_type_id !== right.relation_type_id) {
    return SIGNALS.RELATION_VARIANT_SAME_SLOT;
  }
  if (sameTime && same(left, right, ["person_id", "polity_id", "relation_type_id", "period_basis_id"]) &&
      left.role_id !== right.role_id) {
    return SIGNALS.ROLE_VARIANT_SAME_SLOT;
  }
  if (sameTime && same(left, right, ["person_id", "relation_type_id", "role_id", "period_basis_id"]) &&
      left.polity_id !== right.polity_id) {
    return SIGNALS.POLITY_VARIANT_SAME_SLOT;
  }
  if (same(left, right, exactContext) && (contains(left, right) || contains(right, left))) {
    return SIGNALS.CONTAINMENT_SAME_CONTEXT;
  }
  return null;
}

function pairVerdict(leftRaw, rightRaw) {
  const left = normalizeActivity(leftRaw);
  const right = normalizeActivity(rightRaw);
  const signal = pairSignal(left, right);
  if (!signal) return null;

  if (signal === SIGNALS.EXACT_ACTIVITY_DUPLICATE) {
    return Object.freeze({ signal, verdict: VERDICTS.EXACT_DUPLICATE, confirmed_duplicate: true });
  }
  if (signal === SIGNALS.RELATION_VARIANT_SAME_SLOT) {
    const oneLegacyNull = (left.relation_type_id == null) !== (right.relation_type_id == null);
    return Object.freeze({
      signal,
      verdict: oneLegacyNull ? VERDICTS.MIGRATION_DUPLICATE_RELATION_GAP : VERDICTS.RELATION_VARIANT_REVIEW,
      confirmed_duplicate: oneLegacyNull
    });
  }
  if (signal === SIGNALS.ROLE_VARIANT_SAME_SLOT) {
    return Object.freeze({ signal, verdict: VERDICTS.ROLE_ALIAS_REVIEW, confirmed_duplicate: false });
  }
  if (signal === SIGNALS.POLITY_VARIANT_SAME_SLOT) {
    return Object.freeze({ signal, verdict: VERDICTS.POLITY_IDENTITY_REVIEW, confirmed_duplicate: false });
  }
  return Object.freeze({ signal, verdict: VERDICTS.STALE_WIDE_INTERVAL_REVIEW, confirmed_duplicate: false });
}

function auditSamePersonActivities(rows = []) {
  const normalized = rows.map(normalizeActivity);
  const groups = new Map();
  for (const row of normalized) {
    const list = groups.get(row.person_id) || [];
    list.push(row);
    groups.set(row.person_id, list);
  }

  const signals = [];
  for (const [personId, list] of groups.entries()) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const classification = pairVerdict(list[i], list[j]);
        if (!classification) continue;
        const [activityLowId, activityHighId] = [list[i].id, list[j].id].sort();
        signals.push(Object.freeze({
          person_id: personId,
          activity_low_id: activityLowId,
          activity_high_id: activityHighId,
          ...classification
        }));
      }
    }
  }

  return signals.sort((a, b) =>
    a.person_id.localeCompare(b.person_id) ||
    a.signal.localeCompare(b.signal) ||
    a.activity_low_id.localeCompare(b.activity_low_id)
  );
}

module.exports = Object.freeze({
  SIGNALS,
  VERDICTS,
  normalizeActivity,
  pairSignal,
  pairVerdict,
  auditSamePersonActivities
});