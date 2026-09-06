import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PRODUCTION_URL = process.env.ATLAS_PRODUCTION_URL || "https://atlas-person-db.vercel.app/#atlas-spacetime";
const EXPECTED_RUNTIME_SHA = String(process.env.ATLAS_EXPECTED_RUNTIME_SHA || "").trim();
const OUT_DIR = process.env.ATLAS_VISUAL_OUT_DIR || "artifacts/spacetime-visual-acceptance";
const REPO = "JezCH/atlas-person-db";
const ASSETS = Object.freeze([
  "atlas-domain-surface-owner.js",
  "atlas-person-domain-palette.css",
  "atlas-person-domain-ui.js",
  "atlas-person-spacetime-domain-colors.js",
  "atlas-person-spacetime-domain-colors.css",
  "atlas-person-spacetime-label-overlap-guard.js",
  "atlas-person-spacetime-view.js",
  "atlas-person-spacetime-view.css",
  "atlas-person-spacetime-temporal-certainty.js"
]);

function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function digest(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function fetchBytes(url) {
  const response = await fetch(url, { cache: "no-store", headers: { "cache-control": "no-cache" } });
  assert(response.ok, `HTTP ${response.status} for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  assert(/^[0-9a-f]{40}$/i.test(EXPECTED_RUNTIME_SHA), "ATLAS_EXPECTED_RUNTIME_SHA_REQUIRED", { expected_runtime_sha: EXPECTED_RUNTIME_SHA || null });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const productionOrigin = new URL(PRODUCTION_URL).origin;
  const rows = [];
  for (const asset of ASSETS) {
    const productionAsset = new URL(`/${asset}`, productionOrigin);
    productionAsset.searchParams.set("atlas_acceptance_sha", EXPECTED_RUNTIME_SHA);
    const githubAsset = `https://raw.githubusercontent.com/${REPO}/${EXPECTED_RUNTIME_SHA}/${asset}`;
    const [productionBytes, githubBytes] = await Promise.all([
      fetchBytes(productionAsset.href),
      fetchBytes(githubAsset)
    ]);
    const productionSha256 = digest(productionBytes);
    const githubSha256 = digest(githubBytes);
    const equal = productionBytes.equals(githubBytes);
    rows.push({
      asset,
      bytes: productionBytes.length,
      production_sha256: productionSha256,
      github_sha256: githubSha256,
      equal
    });
    assert(equal, `Production asset differs from expected GitHub SHA: ${asset}`, rows.at(-1));
  }

  const report = {
    schema: "atlas-spacetime-production-exact-sha-parity/v1",
    production_url: PRODUCTION_URL,
    expected_runtime_sha: EXPECTED_RUNTIME_SHA,
    checked_at: new Date().toISOString(),
    asset_count: rows.length,
    mismatches: rows.filter((row) => !row.equal).length,
    assets: rows,
    status: "PASS"
  };
  fs.writeFileSync(path.join(OUT_DIR, "exact-sha-parity.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const failure = {
    schema: "atlas-spacetime-production-exact-sha-parity/v1",
    production_url: PRODUCTION_URL,
    expected_runtime_sha: EXPECTED_RUNTIME_SHA || null,
    checked_at: new Date().toISOString(),
    status: "FAIL",
    error: error?.message || String(error),
    details: error?.details || null
  };
  fs.writeFileSync(path.join(OUT_DIR, "exact-sha-parity.json"), JSON.stringify(failure, null, 2));
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
});
