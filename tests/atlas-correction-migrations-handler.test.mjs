import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { requirePayload, MARKER } = require("../server/atlas-correction-migrations-handler.js");
const correctionApi = fs.readFileSync("api/atlas-correction-apply.js", "utf8");
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

const SHA = "88190d82f9e18400936e10060e72db7370fcdad0";

test("correction migration endpoint accepts only an exact deployment SHA", () => {
  assert.deepEqual(requirePayload({ deployment_sha: SHA }), { deploymentSha: SHA });
  assert.equal(MARKER, "ATLAS_CORRECTION_MIGRATIONS_V1");
  assert.throws(() => requirePayload({ deployment_sha: "bad" }), /CORRECTION_MIGRATIONS_SHA_REQUIRED/);
  assert.throws(
    () => requirePayload({ deployment_sha: SHA, plan: {} }),
    /CORRECTION_MIGRATIONS_EXTRA_INPUT_FORBIDDEN/
  );
});

test("correction migrations remain consolidated behind the current correction apply function", () => {
  assert.match(correctionApi, /atlas-correction-migrations-handler\.js/);
  assert.match(correctionApi, /createCorrectionMigrationsHandler/);
  assert.match(correctionApi, /surface === MIGRATIONS_SURFACE/);
  assert.deepEqual(
    vercel.rewrites.find((row) => row.source === "/api/atlas-correction-migrations"),
    {
      source: "/api/atlas-correction-migrations",
      destination: "/api/atlas-correction-apply?__atlas_correction_surface=migrations"
    }
  );
  assert.equal(fs.existsSync("api/atlas-correction-migrations.js"), false);
});
