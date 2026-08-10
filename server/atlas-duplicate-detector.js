"use strict";

const crypto = require("node:crypto");

const DETECTOR_VERSION = "phase9a-v1";
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

function stableFingerprint(nameEvidence) {
  const canonical = nameEvidence
    .map((item) => ({
      kind: item.kind,
      key: item.key,
      low_preferred: Boolean(item.low_preferred),
      high_preferred: Boolean(item.high_preferred)
    }))
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
    candidate = {
      person_low_id: pair[0],
      person_high_id: pair[1],
      name_evidence: [],
      base_confidence: 0
    };
    accumulator.set(key, candidate);
  }
  const signature = JSON.stringify(signal);
  if (!candidate.name_evidence.some((item) => JSON.stringify(item) === signature)) {
    candidate.name_evidence.push(signal);
  }
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

function activityMap(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const personId = String(row.person_id);
    const list = map.get(personId) || [];
    list.push({
      polity_id: String(row.polity_id),
      activity_start: Number(row.activity_start),
      activity_end: Number(row.activity_end)
    });
    map.set(personId, list);
  }
  return map;
}

function overlap(a, b) {
  return a.activity_start <= b.activity_end && b.activity_start <= a.activity_end;
}

function contextEvidence(lowRows, highRows) {
  const evidence = [];
  let adjustment = 0;
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
    adjustment += 0.02;
  } else if (samePolity) {
    evidence.push({ kind: "SAME_POLITY" });
    adjustment += 0.01;
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

  const activitiesByPerson = activityMap(activities);
  const candidates = [];
  for (const candidate of accumulator.values()) {
    const context = contextEvidence(
      activitiesByPerson.get(candidate.person_low_id) || [],
      activitiesByPerson.get(candidate.person_high_id) || []
    );
    const confidence = Math.max(0, Math.min(0.99, candidate.base_confidence + context.adjustment));
    if (confidence < MIN_CONFIDENCE) continue;
    const nameEvidence = candidate.name_evidence
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key));
    candidates.push({
      person_low_id: candidate.person_low_id,
      person_high_id: candidate.person_high_id,
      confidence: Number(confidence.toFixed(4)),
      evidence: [...nameEvidence, ...context.evidence],
      evidence_fingerprint: stableFingerprint(nameEvidence),
      detector_version: DETECTOR_VERSION
    });
  }

  return candidates.sort((a, b) =>
    b.confidence - a.confidence
    || a.person_low_id.localeCompare(b.person_low_id)
    || a.person_high_id.localeCompare(b.person_high_id)
  );
}

module.exports = Object.freeze({
  DETECTOR_VERSION,
  MIN_CONFIDENCE,
  strictName,
  foldedName,
  tokenSetName,
  detectPersonDuplicateCandidates
});
