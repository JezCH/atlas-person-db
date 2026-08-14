import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const workflowPath = path.join(root, ".github/workflows/atlas-stage2-train2-release.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");

function executionScript() {
  const startMarker = "      - name: Execute Train 2 with dry-run before every mutation\n        shell: bash\n        run: |\n";
  const endMarker = "\n      - name: Upload immutable Train 2 evidence";
  const start = workflow.indexOf(startMarker);
  assert.notEqual(start, -1, "Train 2 execution step marker must exist");
  const bodyStart = start + startMarker.length;
  const end = workflow.indexOf(endMarker, bodyStart);
  assert.notEqual(end, -1, "Train 2 upload step marker must exist");
  return workflow.slice(bodyStart, end)
    .split("\n")
    .map((line) => line.startsWith("          ") ? line.slice(10) : line)
    .join("\n");
}

test("Train 2 execution shell remains syntactically valid", () => {
  const script = executionScript();
  const result = spawnSync("bash", ["-n"], { input: script, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout || "bash -n failed");
});

test("Train 2 JSON defaults do not use the Bash brace-expansion trap", () => {
  const script = executionScript();
  assert.doesNotMatch(script, /\$\{2:-\{\}\}/, "${2:-{}} turns an explicit {} argument into {}} in Bash");
  assert.match(script, /local extra='\{\}'/);
  assert.match(script, /if \(\( \$# >= 2 \)\); then extra="\$2"; fi/);
  assert.match(script, /jq -e 'type=="object"' <<<"\$extra"/);
});

test("Train 2 correction loop preserves CALL_NO and LAST_RESPONSE in the parent shell", () => {
  const script = executionScript();
  assert.doesNotMatch(script, /jq -c '\.entries\[\]'[^\n]*\|\s*while/, "pipeline while would run the correction loop in a subshell");
  assert.match(script, /done < <\(jq -c '\.entries\[\]' \/tmp\/atlas-train2-plans\/plan-list\.json\)/);
  assert.match(script, /--slurpfile p "\$plan_file"/);
});

test("Train 2 preserves partial evidence even when execution fails", () => {
  const script = executionScript();
  const copyIndex = script.indexOf("cp /tmp/atlas-train2-plans/plan-list.json /tmp/atlas-train2-evidence/plan-list.json");
  const firstCallIndex = script.indexOf("call preflight '{}'");
  assert.ok(copyIndex >= 0 && firstCallIndex >= 0 && copyIndex < firstCallIndex, "plan-list evidence must be copied before the first release call");
  assert.match(workflow, /- name: Upload immutable Train 2 evidence\n        if: always\(\)/);
  assert.match(workflow, /if-no-files-found: warn/);
});
