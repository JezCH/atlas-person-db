import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const here = path.dirname(fileURLToPath(import.meta.url));
const spatialIndex = JSON.parse(readFileSync(path.join(here, "..", "atlas-polity-spatial-index.json"), "utf8"));

test("DIAGNOSTIC current macro-only polity metadata", () => {
  const macroOnly = model.macroOnlyPolityIds(spatialIndex);
  const reviewById = Object.fromEntries((spatialIndex.review_queue || []).map((row) => [row.polity_id, row]));
  const placeFunctionIds = new Set((spatialIndex.place_function_records || []).map((row) => row.polity_id));
  const meta = macroOnly.map((id) => ({
    id,
    macroregion: spatialIndex.polity_geography[id],
    review: reviewById[id] || null,
    has_place_function: placeFunctionIds.has(id)
  }));
  throw new Error(`MACRO_ONLY_META=${JSON.stringify(meta)}`);
});
