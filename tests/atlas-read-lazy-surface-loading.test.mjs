import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));

function probe(source) {
  const result = spawnSync(process.execPath, ["-e", source], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout || "null");
}

const SURFACE_MODULES = Object.freeze([
  "server/atlas-postgres-client.js",
  "server/atlas-normalized-read-handler.js",
  "server/atlas-normalized-read-service.js",
  "server/atlas-person-read-handler.js",
  "server/atlas-polity-read-handler.js",
  "server/atlas-catalog-read-handler.js",
  "server/atlas-admin-inspector-handler.js",
  "server/atlas-admin-system-status-handler.js",
  "server/atlas-admin-system-status-service.js",
  "server/atlas-person-portrait-handler.js",
  "server/atlas-person-portrait-source-candidates-handler.js"
]);

function cacheProbeScript(action = "") {
  return `
    (async () => {
      const api = require("./api/atlas-read.js");
      ${action}
      const cache = Object.keys(require.cache).map((value) => value.replace(/\\\\/g, "/"));
      const modules = ${JSON.stringify(SURFACE_MODULES)};
      process.stdout.write(JSON.stringify(modules.filter((name) => cache.some((entry) => entry.endsWith("/" + name)))));
    })().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `;
}

test("consolidated read import does not eagerly load any surface handler, DB client, or normalized service", () => {
  assert.deepEqual(probe(cacheProbeScript()), []);
});

test("Person read request initializes only its own surface dependency graph", () => {
  const loaded = probe(cacheProbeScript(`
    const res = {
      statusCode: 0,
      setHeader() {},
      end() {}
    };
    await api({ method: "POST", query: { __atlas_read_surface: "person" } }, res);
  `));

  assert.ok(loaded.includes("server/atlas-postgres-client.js"));
  assert.ok(loaded.includes("server/atlas-person-read-handler.js"));
  for (const unrelated of [
    "server/atlas-normalized-read-handler.js",
    "server/atlas-normalized-read-service.js",
    "server/atlas-polity-read-handler.js",
    "server/atlas-catalog-read-handler.js",
    "server/atlas-admin-inspector-handler.js",
    "server/atlas-admin-system-status-handler.js",
    "server/atlas-admin-system-status-service.js",
    "server/atlas-person-portrait-handler.js",
    "server/atlas-person-portrait-source-candidates-handler.js"
  ]) {
    assert.equal(loaded.includes(unrelated), false, unrelated);
  }
});

test("public runtime identity stays DB-free while loading only its metadata service", () => {
  const loaded = probe(cacheProbeScript(`
    const res = {
      statusCode: 0,
      setHeader() {},
      end() {}
    };
    await api({ method: "GET", query: { __atlas_read_surface: "runtime-identity" } }, res);
  `));

  assert.equal(loaded.includes("server/atlas-postgres-client.js"), false);
  assert.ok(loaded.includes("server/atlas-admin-system-status-service.js"));
  for (const unrelated of [
    "server/atlas-person-read-handler.js",
    "server/atlas-polity-read-handler.js",
    "server/atlas-catalog-read-handler.js",
    "server/atlas-admin-inspector-handler.js",
    "server/atlas-admin-system-status-handler.js",
    "server/atlas-person-portrait-handler.js",
    "server/atlas-person-portrait-source-candidates-handler.js"
  ]) {
    assert.equal(loaded.includes(unrelated), false, unrelated);
  }
});
