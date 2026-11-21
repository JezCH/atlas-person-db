import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const workflow = readFileSync(new URL("../.github/workflows/atlas-integrity.yml", import.meta.url), "utf8");

for (const step of ["Validate changed registration data", "Syntax check changed UI JavaScript"]) {
  test(`${step} fails when git cannot enumerate the changes`, () => {
    const stepBody = workflow.split(`- name: ${step}\n`)[1].split(/\n      - name:|\n  \S/)[0];
    const script = stepBody.split("run: |\n")[1]
      .replaceAll(/\$\{\{ needs\.classify\.outputs\.(?:base|head)_sha \}\}/g, "fixture");
    const result = spawnSync("bash", ["-c", `git() { echo "cannot diff" >&2; return 128; }\n${script}`], { encoding: "utf8" });
    assert.equal(result.status, 128, result.stderr);
    assert.match(result.stderr, /cannot diff/);
  });
}
