import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/atlas-authoring-apply.yml", import.meta.url), "utf8");
const start = workflow.indexOf('            verify_queue="/tmp/atlas-authoring-evidence/verify-queue.jsonl"');
const end = workflow.indexOf('            final_failed=false', start);
const canonicalBranch = workflow.slice(start, end);

test("canonical post-commit readback verifies same transaction ledger, not stale compiled Runtime", () => {
  assert.ok(start >= 0 && end > start);
  assert.match(canonicalBranch, /post_human_batch "preflight_batch" "\$manifest_paths" "\$requests" "\$candidate_ids" "\$replay_response"/);
  assert.match(canonicalBranch, /\.committed==false/);
  assert.match(canonicalBranch, /\.status=="ALREADY_PRESENT"/);
  assert.match(canonicalBranch, /\.request_id==\$item\.request_id/);
  assert.match(canonicalBranch, /\.person_id==\$item\.person_id/);
  assert.match(canonicalBranch, /\.manifest_path==\$item\.manifest_path/);
  assert.match(canonicalBranch, /\.relationship_id \/\/ null\)==\(\$item\.relationship_id \/\/ null/);
  assert.match(canonicalBranch, /verify_failed=true/);
  assert.doesNotMatch(canonicalBranch, /ATLAS_PERSON_READ_ENDPOINT/);
  assert.match(canonicalBranch, /independent Runtime Projection Compile workflow/);
});

test("only successful applied or already-present immutable requests enter replay verification", () => {
  assert.match(canonicalBranch, /select\(\.status=="ALREADY_PRESENT"\)/);
  assert.match(canonicalBranch, /\.results\[\] as \$result/);
  assert.match(canonicalBranch, /jq -s -c '\.' "\$verify_queue"/);
  assert.match(canonicalBranch, /if \[\[ -s "\$verify_queue" \]\]; then/);
  assert.match(canonicalBranch, /if \[\[ "\$ready_count" -gt 0 \]\]; then/);
  assert.match(workflow, /if \[\[ "\$blocked_count" -gt 0 \]\]; then[\s\S]{0,300}final_failed=true/);
});
