import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const view = read("atlas-person-spacetime-view.js");
const css = read("atlas-person-spacetime-instrument-tools.css");
const nav = read("atlas-main-authority-nav.js");
const root = read("index.html");
const range = { start_year:-3000, end_year:2026 };

const parseStart = view.indexOf("  function parseMeanwhileYearInput(value, range) {");
const parseEnd = view.indexOf("  async function setMeanwhileYear(", parseStart);
assert.ok(parseStart >= 0 && parseEnd > parseStart, "Real view parser is present");
const parse = new Function("model", view.slice(parseStart, parseEnd) + "\nreturn parseMeanwhileYearInput;")(model);

test("UI-06A year entry accepts explicit BCE and CE without year zero", () => {
  for (const [input, expected] of [
    ["기원전 500", -500], ["BCE 500", -500], ["BC 1", -1],
    ["-500", -500], ["서기 1592", 1592], ["AD 1", 1],
    ["CE 2026", 2026], ["1592", 1592], ["+1592", 1592]
  ]) {
    assert.deepEqual(parse(input, range), { year:expected, error:"" }, input);
    const ordinal = model.historicalYearToOrdinal(expected);
    assert.equal(model.ordinalToHistoricalYear(ordinal), expected);
  }
  assert.equal(model.historicalYearToOrdinal(-1), -1);
  assert.equal(model.historicalYearToOrdinal(1), 0);
});

test("UI-06A year input fails closed for year zero, precision loss and outside displayed historical range", () => {
  for (const input of [
    "", "0", "-0", "기원전 0", "AD 0", "2026.5", "1592년대",
    "한글", "3001 BC", "BCE 3001", "-3001", "CE 2027", "999999999999999999",
    "2026<script>"
  ]) {
    const result = parse(input, range);
    assert.equal(result.year, null, input);
    assert.ok(result.error.length > 5, input);
  }
  assert.match(parse("3001", range).error, /현재 시공간 범위/);
  assert.deepEqual(parse("BC 3000", range), { year:-3000, error:"" });
});

test("UI-06A year input reuses existing Meanwhile ordinal projection and protects factual scope", () => {
  const yearStart = view.indexOf("  async function setMeanwhileYear(");
  const yearEnd = view.indexOf("  function clearMeanwhile(", yearStart);
  const yearBody = view.slice(yearStart, yearEnd);
  assert.match(yearBody, /model\.historicalYearToOrdinal\(Number\(year\)\)/);
  assert.match(yearBody, /await ensureMeanwhileModule\(\)/);
  assert.match(yearBody, /meanwhileSelectedOrdinal = ordinal/);
  assert.match(yearBody, /meanwhileSelectionSource = "manual"/);
  assert.match(yearBody, /meanwhileRegionCode = ""/);
  assert.match(view, /meanwhile\.summarize\(\s*compiled\.partitioned\.tracks,\s*meanwhileOrdinal/);
  assert.doesNotMatch(view, /let meanwhileYear = null/);
});

test("UI-06A live form reports invalid input without changing historical state, submits a valid year through existing setter", async () => {
  const start = view.indexOf('    mount.querySelector("#spacetimeMeanwhileYearForm")?.addEventListener("submit"');
  const end = view.indexOf('    const yearAxis = mount.querySelector(".spacetime-year-axis")', start);
  assert.ok(start >= 0 && end > start, "Actual DOM submit handler was found");
  const attrs = new Map();
  let focusCount = 0;
  const input = {
    value:"0",
    isConnected:true,
    focus(options){focusCount += 1; assert.deepEqual(options,{preventScroll:true});},
    setAttribute(k,v){attrs.set(k,v);},
    removeAttribute(k){attrs.delete(k);}
  };
  const error = { textContent:"" };
  let submitHandler;
  const calls = [];
  const form = { addEventListener(type,callback){assert.equal(type,"submit");submitHandler=callback;} };
  const mount = { querySelector(selector){
    if (selector === "#spacetimeMeanwhileYearForm") return form;
    if (selector === "#spacetimeMeanwhileYearInput") return input;
    if (selector === "#spacetimeMeanwhileYearError") return error;
    throw new Error("Unexpected DOM selector " + selector);
  } };
  new Function("mount", "parseMeanwhileYearInput", "timelineRange", "setMeanwhileYear", "requestAnimationFrame", view.slice(start,end))(
    mount,parse,()=>range,async (_mount,year)=>{calls.push(year);return true;},(callback)=>callback()
  );
  let prevented = 0;
  const event = { preventDefault(){prevented++;} };
  await submitHandler(event);
  assert.equal(calls.length,0);
  assert.match(error.textContent,/0년/);
  assert.equal(attrs.get("aria-invalid"),"true");
  assert.equal(focusCount,1);
  input.value = "기원전 500";
  await submitHandler(event);
  assert.deepEqual(calls,[-500]);
  assert.equal(error.textContent,"");
  assert.equal(attrs.has("aria-invalid"),false);
  assert.equal(focusCount,2);
  assert.equal(prevented,2);
});

test("UI-06A direct year jump is visible, keyboard accessible, responsive and versioned at the real loader", () => {
  assert.match(view, /<form id="spacetimeMeanwhileYearForm"[^>]*novalidate>/);
  assert.match(view, /id="spacetimeMeanwhileYearInput" type="text"/);
  assert.match(view, /aria-describedby="spacetimeMeanwhileYearHelp spacetimeMeanwhileYearError"/);
  assert.match(view, /id="spacetimeMeanwhileYearError"[^>]*role="alert"/);
  assert.match(view, /type="submit">동시대 보기/);
  assert.match(view, /value="\$\{escapeHtml\(Number\.isInteger\(meanwhileSelectedOrdinal\)/);
  assert.match(css, /\.spacetime-year-jump button:focus-visible/);
  assert.match(css, /\.spacetime-year-jump input\[aria-invalid="true"\]/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.spacetime-year-jump/);
  assert.match(nav, /atlas-person-spacetime-view\.js\?v=[^"]+&year=20261120-ui06a-direct-year-v1/);
  assert.match(nav, /atlas-person-spacetime-instrument-tools\.css\?v=[^"]+&year=20261120-ui06a-direct-year-v1/);
  assert.match(root, /atlas-main-authority-nav\.js\?v=[^"]+&year=20261120-ui06a-direct-year-v1/);
});
