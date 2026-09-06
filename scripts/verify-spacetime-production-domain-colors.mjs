import fs from "node:fs";
import path from "node:path";

const DEBUG_URL = process.env.ATLAS_CDP_URL || "http://127.0.0.1:9222";
const PRODUCTION_URL = process.env.ATLAS_PRODUCTION_URL || "https://atlas-person-db.vercel.app/#atlas-spacetime";
const OUT_DIR = process.env.ATLAS_VISUAL_OUT_DIR || "artifacts/spacetime-visual-acceptance";

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}
async function jsonFetch(url) {
  const response = await fetch(url);
  assert(response.ok, `HTTP ${response.status} for ${url}`);
  return response.json();
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
  }
  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("CDP websocket open timeout")), 10000);
      this.ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      this.ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("CDP websocket error")); }, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.code}: ${message.error.message}`));
      else resolve(message.result || {});
    });
  }
  call(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws.close(); }
}

async function evaluate(client, expression) {
  const result = await client.call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Runtime.evaluate failed");
  return result.result?.value;
}

async function waitFor(client, expression, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await evaluate(client, expression);
      if (value) return value;
    } catch {}
    await sleep(250);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pages = await jsonFetch(`${DEBUG_URL}/json/list`);
  const page = pages.find((item) => item.type === "page") || pages[0];
  assert(page?.webSocketDebuggerUrl, "No Chrome page target found");
  const client = new CdpClient(page.webSocketDebuggerUrl);
  await client.ready();
  await client.call("Runtime.enable");

  try {
    const href = await evaluate(client, "location.href");
    if (!String(href || "").startsWith(new URL(PRODUCTION_URL).origin)) {
      await client.call("Page.enable");
      await client.call("Page.navigate", { url: PRODUCTION_URL });
    }
    await waitFor(client, "Boolean(window.ATLAS_PERSON_DOMAIN_UI && window.ATLAS_PERSON_SPACETIME_DOMAIN_COLORS && document.querySelector('#personSpacetimeMount .spacetime-frame'))", 90000);
    await evaluate(client, "window.ATLAS_PERSON_DOMAIN_UI.loadDomains({ force:true })");

    const report = await evaluate(client, `(() => {
      const ui=window.ATLAS_PERSON_DOMAIN_UI;
      const canonical=new Set((ui.DEFINITIONS||[]).map((item)=>String(item.code||'').trim()).filter(Boolean));
      const labels=[...document.querySelectorAll('.spacetime-track-label[data-spacetime-person]')];
      const rails=[...document.querySelectorAll('.spacetime-track-rail[data-spacetime-person]')];
      const glyphs=[...document.querySelectorAll('.spacetime-activity-glyph[data-representative-domain]')];
      const decorated=[...labels,...rails].filter((el)=>el.hasAttribute('data-representative-domain'));
      const invalid=decorated.map((el)=>({person_id:el.dataset.spacetimePerson,domain:el.dataset.representativeDomain,class_name:el.className})).filter((row)=>!canonical.has(row.domain));
      const wrongAgainstCanonical=decorated.map((el)=>({
        person_id:el.dataset.spacetimePerson,
        domain:el.dataset.representativeDomain,
        canonical_domain:ui.currentDomain(el.dataset.spacetimePerson)||null,
        class_name:el.className
      })).filter((row)=>row.domain!==row.canonical_domain);
      const labelByPerson=new Map(labels.filter((el)=>el.dataset.representativeDomain).map((el)=>[el.dataset.spacetimePerson,el.dataset.representativeDomain]));
      const pairMismatches=rails.filter((el)=>el.dataset.representativeDomain&&labelByPerson.has(el.dataset.spacetimePerson))
        .map((el)=>({person_id:el.dataset.spacetimePerson,label_domain:labelByPerson.get(el.dataset.spacetimePerson),rail_domain:el.dataset.representativeDomain}))
        .filter((row)=>row.label_domain!==row.rail_domain);
      const styledLabels=labels.filter((el)=>el.dataset.representativeDomain&&!el.classList.contains('is-selected')&&!el.classList.contains('is-meanwhile-active'));
      const styledRails=rails.filter((el)=>el.dataset.representativeDomain&&!el.classList.contains('is-selected')&&!el.classList.contains('is-meanwhile-active')&&!el.classList.contains('is-activity-selected'));
      const styleSamples=styledLabels.slice(0,20).map((el)=>{
        const style=getComputedStyle(el);
        const domain=el.dataset.representativeDomain;
        const expectedVar=domain==='religion'?'--atlas-person-domain-religion-edge':('--atlas-person-domain-'+domain);
        return {
          person_id:el.dataset.spacetimePerson,
          domain,
          domain_edge:style.getPropertyValue('--spacetime-person-domain-edge').trim(),
          canonical_edge:getComputedStyle(document.documentElement).getPropertyValue(expectedVar).trim(),
          box_shadow:style.boxShadow
        };
      });
      const styleMismatches=styleSamples.filter((row)=>!row.domain_edge||!row.canonical_edge||row.domain_edge!==row.canonical_edge);
      return {
        canonical_domains:[...canonical],
        label_count:labels.length,
        rail_count:rails.length,
        decorated_count:decorated.length,
        decorated_label_count:labels.filter((el)=>el.dataset.representativeDomain).length,
        decorated_rail_count:rails.filter((el)=>el.dataset.representativeDomain).length,
        default_styled_label_count:styledLabels.length,
        default_styled_rail_count:styledRails.length,
        invalid_domains:invalid,
        canonical_mismatches:wrongAgainstCanonical,
        label_rail_mismatches:pairMismatches,
        activity_glyph_domain_attr_count:glyphs.length,
        style_samples:styleSamples,
        style_mismatches:styleMismatches
      };
    })()`);

    assert(report.canonical_domains.length === 8, "Canonical Person domain registry is not eight-way", report);
    assert(report.decorated_count > 0, "No spacetime Person domain presentation was decorated in Production", report);
    assert(report.decorated_label_count > 0, "No spacetime Person labels carry canonical domain semantics", report);
    assert(report.decorated_rail_count > 0, "No spacetime Person rails carry canonical domain semantics", report);
    assert(report.invalid_domains.length === 0, "Noncanonical Person domain reached spacetime presentation", report);
    assert(report.canonical_mismatches.length === 0, "Spacetime domain differs from canonical Person domain reader", report);
    assert(report.label_rail_mismatches.length === 0, "Person label/rail domain semantics disagree", report);
    assert(report.activity_glyph_domain_attr_count === 0, "Activity glyphs were incorrectly recolored as Person domains", report);
    assert(report.style_samples.length > 0 && report.style_mismatches.length === 0, "Canonical palette variables are not resolving on spacetime Person labels", report);

    const output = {
      schema: "atlas-spacetime-production-domain-colors/v1",
      production_url: PRODUCTION_URL,
      checked_at: new Date().toISOString(),
      status: "PASS",
      ...report
    };
    fs.writeFileSync(path.join(OUT_DIR, "domain-color-acceptance.json"), JSON.stringify(output, null, 2));
    console.log(JSON.stringify(output, null, 2));
  } finally {
    client.close();
  }
}

main().catch((error) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const failure = {
    schema: "atlas-spacetime-production-domain-colors/v1",
    production_url: PRODUCTION_URL,
    checked_at: new Date().toISOString(),
    status: "FAIL",
    error: error?.message || String(error),
    details: error?.details || null
  };
  fs.writeFileSync(path.join(OUT_DIR, "domain-color-acceptance.json"), JSON.stringify(failure, null, 2));
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
});
