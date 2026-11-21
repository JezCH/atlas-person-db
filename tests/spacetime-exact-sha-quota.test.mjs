import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const verifier = fileURLToPath(new URL("../scripts/verify-spacetime-production-exact-sha.mjs", import.meta.url));

test("Production asset HTTP 402 uses the terminal exit code after the first request", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "atlas-exact-sha-quota-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const fakeFetch = join(dir, "fetch.mjs");
  writeFileSync(fakeFetch, `
    globalThis.fetch = async (url) => {
      if (new URL(url).hostname === "production.example") {
        console.log("production asset request");
        await new Promise((resolve) => setImmediate(resolve));
        return new Response("quota suspended", { status: 402 });
      }
      return new Response("GitHub fixture unavailable", { status: 404 });
    };
  `);
  const result = spawnSync(process.execPath, ["--import", fakeFetch, verifier], {
    env: {
      ...process.env,
      ATLAS_PRODUCTION_URL: "https://production.example/",
      ATLAS_EXPECTED_RUNTIME_SHA: "a".repeat(40),
      ATLAS_VISUAL_OUT_DIR: dir
    },
    encoding: "utf8"
  });
  assert.equal(result.status, 42, result.stderr);
  assert.equal(result.stdout.trim(), "production asset request");
  const report = JSON.parse(readFileSync(join(dir, "exact-sha-parity.json"), "utf8"));
  assert.equal(report.status, "FAIL");
  assert.match(report.error, /DEPLOYMENT_DISABLED_OR_PAYMENT_REQUIRED/);
});

test("workflow treats the asset verifier quota exit as terminal before the next attempt", () => {
  const workflow = readFileSync(new URL("../.github/workflows/atlas-spacetime-production-visual.yml", import.meta.url), "utf8");
  assert.match(workflow, /if node scripts\/verify-spacetime-production-exact-sha\.mjs; then[\s\S]*?else\s+status=\$\?\s+if \[\[ "\$status" == "42" \]\]; then[\s\S]*?exit 1[\s\S]*?sleep 10/);
});

