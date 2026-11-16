import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/atlas-runtime-compile.yml", import.meta.url), "utf8");

test("read-only Authoring preflight cannot trigger a Runtime publication", () => {
  assert.match(workflow, /id: readonly_preflight/);
  assert.match(workflow, /ATLAS_PRODUCER_NAME.*workflow_run\.name/);
  assert.match(workflow, /ATLAS_PRODUCER_EVENT.*workflow_run\.event/);
  assert.match(workflow, /ATLAS_PRODUCER_SHA.*workflow_run\.head_sha/);
  assert.match(workflow, /git diff-tree.*\.github\/atlas-authoring-preflight\.txt/);
  assert.match(workflow, /\^preflight\[\[:space:\]\]\+authoring\/requests\//);
  assert.match(workflow, /echo "skip=\$skip" >> "\$GITHUB_OUTPUT"/);
  for (const name of [
    "Resolve compatible deployed Runtime",
    "Compile and atomically publish Runtime projection",
    "Verify active publication and explicit dispositions"
  ]) {
    const safe = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const step = new RegExp("- name: " + safe + "\\n        if: steps\\.readonly_preflight\\.outputs\\.skip != 'true'");
    assert.match(workflow, step);
  }
});

test("only exact main push preflight producer may suppress compile", () => {
  for (const source of [
    'ATLAS_TRIGGER_EVENT: ${{ github.event_name }}',
    'ATLAS_PRODUCER_NAME: ${{ github.event.workflow_run.name }}',
    'ATLAS_PRODUCER_EVENT: ${{ github.event.workflow_run.event }}',
    'ATLAS_PRODUCER_SHA: ${{ github.event.workflow_run.head_sha }}'
  ]) assert.ok(workflow.includes(source));
  assert.match(workflow, /"\$\{ATLAS_PRODUCER_NAME\}" == "ATLAS Authoring Apply"/);
  assert.match(workflow, /"\$\{ATLAS_PRODUCER_EVENT\}" == "push"/);
  assert.match(workflow, /git cat-file -e/);
});
