"use strict";

const crypto = require("node:crypto");
const {
  canonicalSemanticParts,
  readiness: semanticReadiness,
  SEMANTIC_KEY_VERSION
} = require("./atlas-activity-semantic-key-v2.js");

const DETECTOR_VERSION = "p10-v2-person-revalidation/v1";
const REVALIDATION_SEMANTIC_VERSION = "v2-relation-full-temporal";
const MAX_NAME_GROUP = 12;
const MIN_CONFIDENCE = 0.58;

function strictName(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("und")
    .replace(/\s+/gu, " ");
}

function foldedName(value) {
  return strictName(value)
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[\p{P}\p{S}_]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function tokenSetName(value) {
  const folded = foldedName(value);
  const tokens = folded.split(" ").filter(Boolean);
  if (tokens.length < 2) return null;
  const unique = [...new Set(tokens)].sort();
  return unique.length < 2 ? null : unique.join(" ");
}

function orderedPair(a, b) {
  const left = String(a);
  const right = String(b);
  if (left === right) return null;
  return left < right ? [left, right] : [right, left];
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
  }
  return value;
}

function stableFingerprint(evidence) {
  const canonical = [...(evidence || [])]
    .map(canonicalJson)
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function addIndex(index, key, row) {
  if (!key) return;
  let people = index.get(key);
  if (!people) {
    people = new Map();
    index.set(key, people);
  }
  const personId = String(row.person_id);
  let meta = people.get(personId);
  if (!meta) {
    meta = { preferred: false, locales: new Set(), values: new Set() };
    people.set(personId, meta);
  }
  meta.preferred ||= Boolean(row.is_preferred);
  if (row.locale != null) meta.locales.add(String(row.locale));
  meta.values.add(String(row.name));
}

function addSignal(accumulator, lowId, highId, signal, score) {
  const pair = orderedPair(lowId, highId);
  if (!pair) return;
  const key = pair.join("\u0001");
  let candidate = accumulator.get(key);
  if (!candidate) {
    candidate = { person_low_id: pair[0], person_high_id: pair[1], name_evidence: [], base_confidence: 0 };
    accumulator.set(key, candidate);
  }
  const signature = JSON.stringify(signal);
  if (!candidate.name_evidence.some((item) => JSON.stringify(item) === signature)) candidate.name_evidence.push(signal);
  candidate.base_confidence = Math.max(candidate.base_confidence, score);
}

function emitIndexPairs(index, kind, baseScore, accumulator) {
  for (const [key, people] of index.entries()) {
    const entries = [...people.entries()];
    if (entries.length < 2 || entries.length > MAX_NAME_GROUP) continue;
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const [aId, aMeta] = entries[i];
        const [bId, bMeta] = entries[j];
        const pair = orderedPair(aId, bId);
        if (!pair) continue;
        const lowMeta = pair[0] === aId ? aMeta : bMeta;
        const highMeta = pair[1] === bId ? bMeta : aMeta;
        const bothPreferred = lowMeta.preferred && highMeta.preferred;
        const onePreferred = lowMeta.preferred || highMeta.preferred;
        const sameLocale = [...lowMeta.locales].some((locale) => highMeta.locales.has(locale));
        let score = baseScore;
        if (bothPreferred) score += 0.03;
        else if (onePreferred) score += 0.01;
        if (sameLocale) score += 0.01;
        addSignal(accumulator, pair[0], pair[1], {
          kind,
          key,
          low_preferred: lowMeta.preferred,
          high_preferred: highMeta.preferred,
          same_locale: sameLocale,
          low_values: [...lowMeta.values].sort(),
          high_values: [...highMeta.values].sort()
        }, Math.min(score, 0.99));
      }
    }
  }
}

function validatedActivityMap(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const status = semanticReadiness(row);
    if (!status.ready) {
      const identity = row?.id || `${row?.person_id || "unknown-person"}:${row?.activity_start ?? "?"}`;
      throw new Error(`P10_ACTIVITY_NOT_SEMANTIC_V2_READY:${identity}:${status.reasons.join("; ")}`);
    }
    const parts = canonicalSemanticParts(row);
    const personId = String(row.person_id);
    const list = map.get(personId) || [];
    list.push({
      id: row.id == null ? null : String(row.id),
      polity_id: String(row.polity_id),
      activity_start: Number(row.activity_start),
      activity_end: Number(row.activity_end),
      exact_context: [parts[2], parts[3], parts[4], parts[5], parts[6], parts[7]].join("|"),
      roleless_context: [parts[2], parts[3], parts[5], parts[6], parts[7]].join("|")
    });
    map.set(personId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.exact_context.localeCompare(b.exact_context) || String(a.id).localeCompare(String(b.id)));
  }
  return map;
}

function overlap(a, b) {
  return a.activity_start <= b.activity_end && b.activity_start <= a.activity_end;
}

function profileFingerprint(rows) {
  return stableFingerprint(rows.map((row) => ({ exact_context: row.exact_context, roleless_context: row.roleless_context })));
}

function sharedValues(lowRows, highRows, field) {
  const high = new Set(highRows.map((row) => row[field]));
  return [...new Set(lowRows.map((row) => row[field]).filter((value) => high.has(value)))].sort();
}

function contextEvidence(lowRows, highRows) {
  const evidence = [];
  let adjustment = 0;

  if (lowRows.length || highRows.length) {
    evidence.push({
      kind: "P10_SEMANTIC_PROFILE",
      semantic_version: REVALIDATION_SEMANTIC_VERSION,
      semantic_key_version: SEMANTIC_KEY_VERSION,
      low_activity_count: lowRows.length,
      high_activity_count: highRows.length,
      low_profile_fingerprint: profileFingerprint(lowRows),
      high_profile_fingerprint: profileFingerprint(highRows)
    });
  }

  const exactContexts = sharedValues(lowRows, highRows, "exact_context");
  if (exactContexts.length) {
    evidence.push({ kind: "P10_EXACT_ACTIVITY_SEMANTIC_CONTEXT", count: exactContexts.length, contexts: exactContexts });
    adjustment += 0.02;
  }

  const rolelessContexts = sharedValues(lowRows, highRows, "roleless_context");
  if (rolelessContexts.length && !exactContexts.length) {
    evidence.push({ kind: "P10_ROLE_VARIANT_ACTIVITY_CONTEXT", count: rolelessContexts.length, contexts: rolelessContexts });
    adjustment += 0.01;
  }

  let samePolity = false;
  let samePolityOverlap = false;
  for (const low of lowRows) {
    for (const high of highRows) {
      if (low.polity_id !== high.polity_id) continue;
      samePolity = true;
      if (overlap(low, high)) samePolityOverlap = true;
    }
  }
  if (samePolityOverlap) {
    evidence.push({ kind: "SAME_POLITY_OVERLAP" });
    adjustment += 0.01;
  } else if (samePolity) {
    evidence.push({ kind: "SAME_POLITY" });
  }

  if (lowRows.length && highRows.length) {
    const lowMin = Math.min(...lowRows.map((row) => row.activity_start));
    const lowMax = Math.max(...lowRows.map((row) => row.activity_end));
    const highMin = Math.min(...highRows.map((row) => row.activity_start));
    const highMax = Math.max(...highRows.map((row) => row.activity_end));
    const gap = lowMax < highMin ? highMin - lowMax : highMax < lowMin ? lowMin - highMax : 0;
    if (gap > 80) {
      evidence.push({ kind: "CHRONOLOGY_SEPARATION", years: gap });
      adjustment -= 0.25;
    }
  }
  return { evidence, adjustment };
}

function detectPersonDuplicateCandidates({ names = [], activities = [] } = {}) {
  const strictIndex = new Map();
  const foldIndex = new Map();
  const tokenIndex = new Map();
  for (const row of names) {
    if (!row?.person_id || !String(row.name || "").trim()) continue;
    addIndex(strictIndex, strictName(row.name), row);
    addIndex(foldIndex, foldedName(row.name), row);
    addIndex(tokenIndex, tokenSetName(row.name), row);
  }

  const accumulator = new Map();
  emitIndexPairs(strictIndex, "EXACT_NAME", 0.92, accumulator);
  emitIndexPairs(foldIndex, "FOLDED_NAME", 0.74, accumulator);
  emitIndexPairs(tokenIndex, "TOKEN_SET_NAME", 0.62, accumulator);

  const activitiesByPerson = validatedActivityMap(activities);
  const candidates = [];
  for (const candidate of accumulator.values()) {
    const context = contextEvidence(
      activitiesByPerson.get(candidate.person_low_id) || [],
      activitiesByPerson.get(candidate.person_high_id) || []
    );
    const confidence = Math.max(0, Math.min(0.99, candidate.base_confidence + context.adjustment));
    if (confidence < MIN_CONFIDENCE) continue;
    const nameEvidence = candidate.name_evidence.sort((a, b) => a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key));
    const evidence = [...nameEvidence, ...context.evidence];
    candidates.push({
      person_low_id: candidate.person_low_id,
      person_high_id: candidate.person_high_id,
      confidence: Number(confidence.toFixed(4)),
      evidence,
      evidence_fingerprint: stableFingerprint(evidence),
      detector_version: DETECTOR_VERSION,
      reconciliation_semantic_version: REVALIDATION_SEMANTIC_VERSION,
      semantic_key_version: SEMANTIC_KEY_VERSION
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence || a.person_low_id.localeCompare(b.person_low_id) || a.person_high_id.localeCompare(b.person_high_id));
}

module.exports = Object.freeze({
  DETECTOR_VERSION,
  REVALIDATION_SEMANTIC_VERSION,
  MIN_CONFIDENCE,
  strictName,
  foldedName,
  tokenSetName,
  stableFingerprint,
  validatedActivityMap,
  contextEvidence,
  detectPersonDuplicateCandidates
});
