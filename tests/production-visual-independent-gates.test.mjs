import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const workflow = fs.readFileSync(
  new URL("../.github/workflows/atlas-spacetime-production-visual.yml", import.meta.url), "utf8"
);
const begin = workflow.indexOf("          set +e\n", workflow.indexOf("node scripts/verify-spacetime-production-exact-sha.mjs"));
const end = workflow.indexOf('          if [[ "$GITHUB_EVENT_NAME" == "workflow_dispatch" ]]; then', begin);
assert.ok(begin >= 0 && end > begin, "Production smoke must have an independent track-status aggregate");
const shellBlock = workflow.slice(begin, end).split("\n").map((row) => row.replace(/^          /, "")).join("\n");

function simulate([spacetime, person, polity]) {
  const shell = [
    "set -euo pipefail",
    "node() {",
    "  printf 'CALLED:%s\\n' \"$1\"",
    "  case \"$1\" in",
    "    scripts/verify-spacetime-production-visual.mjs) return \"$SPACETIME_EXIT\" ;;",
    "    scripts/verify-ui-v10-production-visual.mjs) return \"$PERSON_EXIT\" ;;",
    "    scripts/verify-polity-production-visual.mjs) return \"$POLITY_EXIT\" ;;",
    "    *) printf 'UNEXPECTED:%s\\n' \"$1\" >&2; return 99 ;;",
    "  esac",
    "}",
    shellBlock,
    "echo FINISHED_ALL"
  ].join("\n") + "\n";
  return spawnSync("bash", ["-c", shell], {
    encoding: "utf8",
    env: {
      ...process.env,
      SPACETIME_EXIT: String(spacetime),
      PERSON_EXIT: String(person),
      POLITY_EXIT: String(polity)
    }
  });
}

test("Production Chrome visual smoke preserves existing exact three tracks, without a fourth automation", () => {
  const paths = [
    "scripts/verify-spacetime-production-visual.mjs",
    "scripts/verify-ui-v10-production-visual.mjs",
    "scripts/verify-polity-production-visual.mjs"
  ];
  const actual = [...shellBlock.matchAll(/^\s*node (scripts\/verify-[^\s]+\.mjs)$/gm)].map((match) => match[1]);
  assert.deepEqual(actual, paths);
  assert.match(workflow, /group: atlas-spacetime-production-visual-main/);
  assert.doesNotMatch(workflow, /^\s*schedule:/m);
  assert.match(workflow, /ATLAS_EXPECTED_RUNTIME_SHA=\$EXPECTED_SHA/);
});

test("All three valid real-browser acceptance tracks still yield success", () => {
  const result = simulate([0, 0, 0]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ATLAS_VISUAL_TRACK_RESULTS spacetime=0 person=0 polity=0/);
  assert.match(result.stdout, /FINISHED_ALL/);
});

test("Person register failure does not hide independent Polity visual check, but still fails final gate", () => {
  const result = simulate([0, 9, 0]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /CALLED:scripts\/verify-spacetime-production-visual\.mjs/);
  assert.match(result.stdout, /CALLED:scripts\/verify-ui-v10-production-visual\.mjs/);
  assert.match(result.stdout, /CALLED:scripts\/verify-polity-production-visual\.mjs/);
  assert.match(result.stdout, /ATLAS_VISUAL_TRACK_RESULTS spacetime=0 person=9 polity=0/);
  assert.doesNotMatch(result.stdout, /FINISHED_ALL/);
  assert.match(result.stderr, /ATLAS_VISUAL_ACCEPTANCE_FAILED/);
});

test("Spacetime and Polity failures cannot be overridden by a passing Person suite", () => {
  const result = simulate([3, 0, 5]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /CALLED:scripts\/verify-polity-production-visual\.mjs/);
  assert.match(result.stdout, /ATLAS_VISUAL_TRACK_RESULTS spacetime=3 person=0 polity=5/);
});
