#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { audit: "audit-inventory-response.json", out: "person-necessity-audit-inventory.json", summary: "person-necessity-audit-summary.json" };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--audit" && value) { args.audit = value; i += 1; continue; }
    if (key === "--out" && value) { args.out = value; i += 1; continue; }
    if (key === "--summary" && value) { args.summary = value; i += 1; continue; }
    throw new Error(`Unsupported argument: ${key}`);
  }
  return args;
}

function asCount(value, label) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0) throw new Error(`Invalid ${label}: ${value}`);
  return count;
}

function preferredName(names, locale) {
  if (!Array.isArray(names)) return null;
  const preferred = names.find((entry) => entry?.locale === locale && entry?.is_preferred === true);
  const fallback = names.find((entry) => entry?.locale === locale);
  return preferred?.name ?? fallback?.name ?? null;
}

function compactActivity(row) {
  return {
    activity_id: row.activity_id,
    polity_id: row.polity_id,
    polity_canonical_key: row.polity_canonical_key ?? null,
    polity_name_ko: row.polity_name_ko ?? null,
    polity_name_en: row.polity_name_en ?? null,
    polity_type: row.polity_type ?? null,
    polity_historicity: row.polity_historicity ?? null,
    role_id: row.role_id ?? null,
    role_code: row.role_code ?? null,
    role_category: row.role_category ?? null,
    role_source_label: row.role_source_label ?? null,
    period_basis: row.period_basis ?? null,
    activity_start: row.activity_start ?? null,
    activity_end: row.activity_end ?? null,
    confidence: row.confidence ?? null,
    chronology_status: row.chronology_status ?? null,
    notes: row.notes ?? null
  };
}

function uniquePolities(activities) {
  const byId = new Map();
  for (const activity of activities) {
    const key = String(activity.polity_id ?? "");
    if (!key || byId.has(key)) continue;
    byId.set(key, {
      polity_id: activity.polity_id,
      canonical_key: activity.polity_canonical_key,
      name_ko: activity.polity_name_ko,
      name_en: activity.polity_name_en,
      polity_type: activity.polity_type,
      historicity: activity.polity_historicity
    });
  }
  return [...byId.values()].sort((a, b) => String(a.polity_id).localeCompare(String(b.polity_id)));
}

function main() {
  const args = parseArgs(process.argv);
  const audit = JSON.parse(fs.readFileSync(args.audit, "utf8"));

  if (audit?.ok !== true || audit?.marker !== "ATLAS_AUDIT_INVENTORY_V1") throw new Error("Expected successful ATLAS audit inventory response");
  if (audit?.mode !== "full_stage2_baseline") throw new Error(`Expected full_stage2_baseline, got ${audit?.mode}`);
  if (audit?.read_only !== true || audit?.committed !== false) throw new Error("Audit snapshot is not proven read-only");
  if (!/^[0-9a-f]{40}$/i.test(String(audit?.deployment_sha ?? ""))) throw new Error("Missing exact Production deployment SHA");
  if (!/^sha256:[0-9a-f]{64}$/i.test(String(audit?.baseline_digest ?? ""))) throw new Error("Missing deterministic baseline digest");

  const persons = audit?.catalogs?.persons;
  const rows = audit?.rows;
  if (!Array.isArray(persons) || !Array.isArray(rows)) throw new Error("Full Person catalog or Activity rows are missing");

  const expectedPersons = asCount(audit?.counts?.persons, "person count");
  const expectedActivities = asCount(audit?.counts?.activities, "activity count");
  if (persons.length !== expectedPersons) throw new Error(`Person catalog drift: expected ${expectedPersons}, got ${persons.length}`);
  if (rows.length !== expectedActivities) throw new Error(`Activity row drift: expected ${expectedActivities}, got ${rows.length}`);

  const catalogIds = new Set(persons.map((person) => String(person.id)));
  if (catalogIds.size !== persons.length) throw new Error("Duplicate Person UUID in catalog");

  const activitiesByPerson = new Map(persons.map((person) => [String(person.id), []]));
  for (const row of rows) {
    const personId = String(row?.person_id ?? "");
    if (!catalogIds.has(personId)) throw new Error(`Activity references Person missing from catalog: ${personId}`);
    activitiesByPerson.get(personId).push(compactActivity(row));
  }
  for (const activities of activitiesByPerson.values()) activities.sort((a, b) => String(a.activity_id).localeCompare(String(b.activity_id)));

  const exportedPersons = persons.map((person) => {
    const activities = activitiesByPerson.get(String(person.id)) ?? [];
    return {
      person_id: person.id,
      canonical_key: person.canonical_key ?? null,
      person_type: person.person_type ?? null,
      historicity: person.historicity ?? null,
      name_ko: preferredName(person.names, "ko"),
      name_en: preferredName(person.names, "en"),
      names: Array.isArray(person.names) ? person.names : [],
      activity_count: activities.length,
      polities: uniquePolities(activities),
      activities
    };
  }).sort((a, b) => String(a.person_id).localeCompare(String(b.person_id)));

  if (exportedPersons.length !== expectedPersons) throw new Error("Person export cardinality drift");
  const exportedActivityCount = exportedPersons.reduce((sum, person) => sum + person.activity_count, 0);
  if (exportedActivityCount !== expectedActivities) throw new Error(`Person Activity coverage drift: expected ${expectedActivities}, got ${exportedActivityCount}`);

  const zeroActivityPersons = exportedPersons.filter((person) => person.activity_count === 0).map((person) => person.person_id);
  const output = {
    schema: "atlas-person-necessity-audit-inventory/v1",
    read_only: true,
    production: true,
    deployment_sha: audit.deployment_sha,
    baseline_digest: audit.baseline_digest,
    counts: { persons: expectedPersons, activities: expectedActivities, zero_activity_persons: zeroActivityPersons.length },
    zero_activity_person_ids: zeroActivityPersons,
    persons: exportedPersons
  };
  const summary = {
    schema: "atlas-person-necessity-audit-summary/v1",
    read_only: true,
    production: true,
    deployment_sha: audit.deployment_sha,
    baseline_digest: audit.baseline_digest,
    counts: output.counts
  };

  fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
  fs.writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(args.summary, `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
