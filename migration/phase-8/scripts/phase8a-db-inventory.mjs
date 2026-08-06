#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [inputPath, outputPath = 'migration/phase-8/tmp/phase8a/database-inventory-report.json'] = process.argv.slice(2);
if (!inputPath) {
  console.error('usage: node phase8a-db-inventory.mjs <database-inventory.json> [report.json]');
  process.exit(64);
}

const db = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const relations = Array.isArray(db.relations) ? db.relations : [];
const views = Array.isArray(db.views) ? db.views : [];
const functions = Array.isArray(db.functions) ? db.functions : [];
const triggers = Array.isArray(db.triggers) ? db.triggers : [];
const policies = Array.isArray(db.policies) ? db.policies : [];
const privileges = Array.isArray(db.application_privileges) ? db.application_privileges : [];
const dependencies = Array.isArray(db.dependencies) ? db.dependencies : [];

assert(Number(db.counts?.legacy) === 319, `legacy row count ${db.counts?.legacy}`);
assert(Number(db.counts?.compatibility) === 349, `compatibility row count ${db.counts?.compatibility}`);
assert(relations.some((r) => r.schema === 'public' && r.name === 'person_politics'), 'public.person_politics missing');
assert(relations.some((r) => r.schema === 'public' && r.name === 'atlas_person_politics_compat_v1'), 'compatibility view missing');
assert(relations.some((r) => r.schema === 'atlas_v2'), 'atlas_v2 relations missing');
assert(views.some((v) => v.schema === 'public' && v.name === 'atlas_person_politics_compat_v1'), 'compatibility view definition missing');

const report = {
  marker: 'PHASE_8A_DATABASE_OBJECT_INVENTORY',
  counts: {
    legacy_rows: Number(db.counts?.legacy),
    compatibility_rows: Number(db.counts?.compatibility),
    relations: relations.length,
    views: views.length,
    functions: functions.length,
    triggers: triggers.length,
    policies: policies.length,
    application_privileges: privileges.length,
    dependencies: dependencies.length
  },
  referenced_objects: {
    legacy: dependencies.filter((d) => d.referenced_schema === 'public' && d.referenced_object === 'person_politics'),
    compatibility: dependencies.filter((d) => d.referenced_schema === 'public' && d.referenced_object === 'atlas_person_politics_compat_v1'),
    atlas_v2: dependencies.filter((d) => d.referenced_schema === 'atlas_v2')
  },
  unresolved_database_dependency_count: dependencies.length,
  destructive_actions: 0,
  failures,
  pass: failures.length === 0
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(2);
