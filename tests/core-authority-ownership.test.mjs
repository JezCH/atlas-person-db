import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(root, "docs", "core", "CORE_AUTHORITY_OWNERSHIP.v1.json");
const docPath = path.join(root, "docs", "core", "CORE_AUTHORITY_OWNERSHIP.md");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const document = fs.readFileSync(docPath, "utf8");

const statuses = new Set([
  "single_writer",
  "transitional_single_writer",
  "multi_writer_debt",
  "ownership_gap",
  "derived_single_writer",
  "repository_source_authority",
  "duplicate_truth_registry"
]);

test("CORE authority ownership registry is structurally complete", () => {
  assert.equal(registry.schema, "atlas-core-authority-ownership/v1");
  assert.match(registry.as_of, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Array.isArray(registry.resources) && registry.resources.length >= 15);

  const ids = new Set();
  for (const resource of registry.resources) {
    assert.match(resource.id, /^[a-z0-9_]+$/);
    assert.equal(ids.has(resource.id), false, `duplicate resource: ${resource.id}`);
    ids.add(resource.id);
    assert.ok(statuses.has(resource.status), `unsupported status: ${resource.id} ${resource.status}`);
    assert.ok(String(resource.semantic_fact || "").trim(), `semantic_fact required: ${resource.id}`);
    assert.ok(Array.isArray(resource.canonical_state) && resource.canonical_state.length > 0, `canonical_state required: ${resource.id}`);
    assert.ok(document.includes(`\`${resource.id}\``), `human map missing resource: ${resource.id}`);

    if (resource.status === "ownership_gap") {
      assert.equal(resource.authoritative_writer, null, `gap must not pretend to have an owner: ${resource.id}`);
      assert.ok(resource.remediation_unit, `gap requires remediation unit: ${resource.id}`);
    } else {
      assert.ok(resource.authoritative_writer?.path, `owner path required: ${resource.id}`);
    }

    if (resource.status === "multi_writer_debt") {
      assert.ok(resource.shadow_writers.length > 0, `multi-writer debt requires exact shadow paths: ${resource.id}`);
      assert.ok(resource.remediation_unit, `multi-writer debt requires remediation unit: ${resource.id}`);
    }

    for (const shadow of resource.shadow_writers || []) {
      assert.ok(shadow.path && shadow.reason && shadow.cleanup_unit, `incomplete shadow writer record: ${resource.id}`);
    }
  }

  for (const required of [
    "person_identity_creation",
    "polity_identity_creation",
    "activity_authoring",
    "source_identity",
    "place_identity",
    "person_external_reference",
    "person_representative_domain",
    "context_objects",
    "spatial_reviewed_facts",
    "runtime_projection",
    "non_timeline_person_registry",
    "reviewed_candidate_state",
    "registration_execution_state",
    "person_destructive_lifecycle"
  ]) {
    assert.ok(ids.has(required), `required CORE resource missing: ${required}`);
  }
});

test("every ownership claim is anchored to current executable/source evidence", () => {
  for (const resource of registry.resources) {
    assert.ok(Array.isArray(resource.evidence_anchors) && resource.evidence_anchors.length > 0, `evidence anchors required: ${resource.id}`);
    for (const anchor of resource.evidence_anchors) {
      const target = path.join(root, anchor.path);
      assert.equal(fs.existsSync(target), true, `missing evidence path for ${resource.id}: ${anchor.path}`);
      const content = fs.readFileSync(target, "utf8");
      assert.equal(content.includes(anchor.contains), true, `evidence anchor drift for ${resource.id}: ${anchor.path} :: ${anchor.contains}`);
    }
  }
});

test("known Unit 1 shadow-writer debts stay explicit until their owning cleanup units remove them", () => {
  const byId = new Map(registry.resources.map((resource) => [resource.id, resource]));
  assert.deepEqual(
    byId.get("source_identity").shadow_writers.map((item) => item.path).sort(),
    [
      "server/atlas-correction-source-citation-v2-service.js",
      "server/atlas-correction-v2-stage2-assertions.js",
      "server/atlas-human-authoring-service.js"
    ].sort()
  );
  assert.deepEqual(
    byId.get("person_external_reference").shadow_writers.map((item) => item.path).sort(),
    [
      "db/migrations/20260821_human_authoring_external_reference_sync.sql",
      "server/atlas-human-authoring-service.js"
    ].sort()
  );
  assert.ok(byId.get("activity_authoring").shadow_writers.some((item) => item.path === "server/atlas-correction-manifest-v2-service.js"));
  assert.equal(byId.get("non_timeline_person_registry").status, "duplicate_truth_registry");
  assert.equal(byId.get("context_objects").status, "ownership_gap");
});

test("derived/runtime and repository spatial outputs are not mislabeled as historical authoring authority", () => {
  const byId = new Map(registry.resources.map((resource) => [resource.id, resource]));
  assert.equal(byId.get("runtime_projection").status, "derived_single_writer");
  assert.equal(byId.get("spatial_reviewed_facts").status, "repository_source_authority");
  assert.match(byId.get("spatial_reviewed_facts").note, /derived compatibility output/);
  assert.match(document, /atlas-polity-spatial-index\.json.*derived output/);
});
