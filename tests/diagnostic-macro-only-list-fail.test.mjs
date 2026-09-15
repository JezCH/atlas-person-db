import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const here = path.dirname(fileURLToPath(import.meta.url));
const spatialIndex = JSON.parse(readFileSync(path.join(here, "..", "atlas-polity-spatial-index.json"), "utf8"));

test("DIAGNOSTIC current macro-only polity ids", () => {
  const macroOnly = model.macroOnlyPolityIds(spatialIndex);
  throw new Error(`MACRO_ONLY_IDS=${JSON.stringify(macroOnly)}`);
});
