import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Read-only live Production acceptance; no dashboard truth is authored here.\nconst DEBUG_URL = process.env.ATLAS_CDP_URL || "http://127.0.0.1:9222";
const PRODUCTION_ORIGIN = process.env.ATLAS_PRODUCTION_ORIGIN || "https://atlas-person-db.vercel.app";
const EXPECTED_RUNTIME_SHA = String(process.env.ATLAS_EXPECTED_RUNTIME_SHA || "").trim();
const OUT_DIR = process.env.ATLAS_DASHBOARD_ACCEPTANCE_OUT_DIR || "artifacts/dashboard-production-acceptance";
const DESKTOP = Object.freeze({ width:1440, height:1100, deviceScaleFactor:1, mobile:false });
const MOBILE = Object.freeze({ width:390, height:844, deviceScaleFactor:1, mobile:true });
const CRITICAL_ASSETS = Object.freeze([
  "index.html",
  "atlas-client-data-store.js",
  "atlas-dashboard-model.js",
  "atlas-dashboard.js",
  "atlas-dashboard.css",
  "atlas-main-authority-nav.js",
  "atlas-person-main.js"
]);

fs.mkdirSync(OUT_DIR, { recursive:true });

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}
function digest(buffer) { return crypto.createHash("sha256").update(buffer).digest("hex"); }
function canonicalTimestamp(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}
async function fetchJson(url) {
  const response = await fetch(url, { cache:"no-store", headers:{ accept:"application/json", "cache-control":"no-cache" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}
async function fetchBytes(url) {
  const response = await fetch(url, { cache:"no-store", headers:{ "cache-control":"no-cache" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }
  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("CDP websocket open timeout")), 10000);
      this.ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once:true });
      this.ws.addEventListener("error", (event) => { clearTimeout(timer); reject(event.error || new Error("CDP websocket error")); }, { once:true });
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.code}: ${message.error.message}`));
        else resolve(message.result || {});
        return;
      }
      if (message.method) {
        for (const fn of this.listeners.get(message.method) || []) fn(message.params || {});
      }
    });
  }
  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method).add(fn);
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
    awaitPromise:true,
    returnByValue:true,
    userGesture:true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Runtime.evaluate failed");
  }
  return result.result?.value;
}
async function waitFor(client, expression, timeoutMs = 60000, intervalMs = 250) {
  const started = Date.now();
  let lastValue = null;
  while (Date.now() - started < timeoutMs) {
    try {
      lastValue = await evaluate(client, expression);
      if (lastValue) return lastValue;
    } catch {}
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for: ${expression}; last=${JSON.stringify(lastValue)}`);
}
async function screenshot(client, name) {
  const result = await client.call("Page.captureScreenshot", { format:"png", fromSurface:true, captureBeyondViewport:false });
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, Buffer.from(result.data, "base64"));
  return file;
}

async function waitForProductionSha() {
  assert(/^[0-9a-f]{40}$/i.test(EXPECTED_RUNTIME_SHA), "ATLAS_EXPECTED_RUNTIME_SHA_REQUIRED", { expected_runtime_sha:EXPECTED_RUNTIME_SHA || null });
  const endpoint = new URL("/api/atlas-read?__atlas_read_surface=runtime-identity", PRODUCTION_ORIGIN);
  const started = Date.now();
  const attempts = [];
  while (Date.now() - started < 240000) {
    endpoint.searchParams.set("acceptance_probe", String(Date.now()));
    try {
      const payload = await fetchJson(endpoint.href);
      const actual = String(payload?.identity?.git_commit_sha || "").trim();
      attempts.push({ at:new Date().toISOString(), actual:actual || null });
      if (actual === EXPECTED_RUNTIME_SHA) {
        return { actual, attempts, elapsed_ms:Date.now()-started };
      }
    } catch (error) {
      attempts.push({ at:new Date().toISOString(), error:error?.message || String(error) });
    }
    await sleep(3000);
  }
  throw Object.assign(new Error("PRODUCTION_SHA_DID_NOT_CONVERGE"), { details:{ expected:EXPECTED_RUNTIME_SHA, attempts } });
}

async function verifyAssetParity() {
  const rows = [];
  for (const asset of CRITICAL_ASSETS) {
    const productionUrl = new URL(`/${asset}`, PRODUCTION_ORIGIN);
    productionUrl.searchParams.set("atlas_acceptance_sha", EXPECTED_RUNTIME_SHA);
    const githubUrl = `https://raw.githubusercontent.com/JezCH/atlas-person-db/${EXPECTED_RUNTIME_SHA}/${asset}`;
    const [productionBytes, githubBytes] = await Promise.all([fetchBytes(productionUrl.href), fetchBytes(githubUrl)]);
    const row = {
      asset,
      bytes:productionBytes.length,
      production_sha256:digest(productionBytes),
      github_sha256:digest(githubBytes),
      equal:productionBytes.equals(githubBytes)
    };
    rows.push(row);
    assert(row.equal, `Production asset differs from expected GitHub SHA: ${asset}`, row);
  }
  return rows;
}

async function dashboardReady(client) {
  await waitFor(client, "document.readyState === 'complete'", 45000);
  await waitFor(client, "Boolean(window.ATLAS_MAIN_AUTHORITY_NAV && window.ATLAS_DASHBOARD && window.ATLAS_CLIENT_DATA_STORE && window.ATLAS_DASHBOARD_MODEL)", 45000);
  await waitFor(client, "document.querySelectorAll('#atlasDashboardMount .dashboard-kpi').length >= 6", 90000);
  await waitFor(client, "document.querySelectorAll('.dashboard-source-freshness tbody tr').length >= 6", 90000);
}

async function showDashboard(client) {
  await evaluate(client, "window.ATLAS_MAIN_AUTHORITY_NAV.showDomain('dashboard')");
  await dashboardReady(client);
}

async function collectCanonicalSnapshot(client) {
  return evaluate(client, `(async () => {
    const store=window.ATLAS_CLIENT_DATA_STORE;
    const model=window.ATLAS_DASHBOARD_MODEL;
    const [personResult,domainResult,spatialIndex,nonTimelineRows,recentDeltaResult,systemIdentityResult]=await Promise.all([
      store.loadPersons(),
      store.loadPersonDomains(),
      store.loadSpatialIndex(),
      store.loadNonTimelinePersons(),
      store.loadRecentDelta(),
      store.loadSystemIdentity()
    ]);
    const snapshot=model.buildDashboardSnapshot({
      personResult,domainResult,spatialIndex,nonTimelineRows,recentDeltaResult,systemIdentityResult,
      sourceStates:store.sourceStates()
    });
    return {
      system_identity:systemIdentityResult.identity,
      spatial_generated_at:spatialIndex.generated_at || null,
      recent_delta_rows:recentDeltaResult.rows,
      recent_delta_coverage:recentDeltaResult.coverage,
      source_states:store.sourceStates(),
      source_freshness:snapshot.source_freshness,
      heatmap:snapshot.coverage_heatmap,
      recent_delta:snapshot.recent_delta,
      timeline:snapshot.recent_activity_timeline,
      completeness:snapshot.completeness_matrix,
      attention:snapshot.attention_queue,
      kpi_drilldown:snapshot.kpi_drilldown
    };
  })()`);
}

async function collectDesktopDom(client) {
  return evaluate(client, `(() => {
    const qa=(s)=>[...document.querySelectorAll(s)];
    const visible=(el)=>{const r=el.getBoundingClientRect();const st=getComputedStyle(el);return r.width>0&&r.height>0&&st.display!=="none"&&st.visibility!=="hidden";};
    const eyebrowPanels=qa("#atlasDashboardMount .eyebrow").map((el)=>(el.textContent||"").trim()).filter(Boolean);
    const freshnessRows=qa(".dashboard-source-freshness tbody tr").map((tr)=>[...tr.children].map((td)=>(td.textContent||"").trim()));
    const activityRows=qa('.dashboard-completeness tbody tr[data-completeness-unit="activity"]').map((tr)=>({
      text:(tr.textContent||"").trim(),
      has_person_drilldown:Boolean(tr.querySelector("[data-dashboard-completeness]"))
    }));
    const personRows=qa('.dashboard-completeness tbody tr[data-completeness-unit="person"]').map((tr)=>({
      text:(tr.textContent||"").trim(),
      has_person_drilldown:Boolean(tr.querySelector("[data-dashboard-completeness]"))
    }));
    const heatmapCells=qa(".dashboard-heatmap tbody td").map((td)=>Number((td.textContent||"").replace(/,/g,"").trim())).filter(Number.isFinite);
    const timelinePanel=qa("#atlasDashboardMount .dashboard-panel").find((p)=>p.querySelector(".eyebrow")?.textContent?.includes("RECENT DELTA"));
    const timelineMeta=timelinePanel ? [...timelinePanel.querySelectorAll(".dashboard-progress-meta span")].map((x)=>(x.textContent||"").trim()) : [];
    const doc=document.documentElement;
    return {
      href:location.href,
      title:document.title,
      viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
      body_text_length:document.body.innerText.trim().length,
      dashboard_visible:Boolean(document.querySelector("#atlasDashboardMount .dashboard-control-center") && visible(document.querySelector("#atlasDashboardMount .dashboard-control-center"))),
      kpi_count:qa("#atlasDashboardMount .dashboard-kpi").length,
      eyebrows:eyebrowPanels,
      panel_count:qa("#atlasDashboardMount .dashboard-panel").length,
      global_scroll:{client_width:doc.clientWidth,scroll_width:doc.scrollWidth,overflow_x:doc.scrollWidth-doc.clientWidth},
      freshness_rows:freshnessRows,
      activity_rows:activityRows,
      person_rows:personRows,
      heatmap:{row_count:qa(".dashboard-heatmap tbody tr").length,cell_count:heatmapCells.length,non_zero:heatmapCells.filter((v)=>v>0).length,total:heatmapCells.reduce((a,b)=>a+b,0)},
      timeline:{entry_count:qa(".dashboard-timeline-entry").length,meta:timelineMeta},
      error_overlay:Boolean(document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay"))
    };
  })()`);
}

async function verifyDrilldowns(client) {
  const results = {};

  const kpi = await evaluate(client, `(() => {
    const buttons=[...document.querySelectorAll("[data-dashboard-kpi]:not(:disabled)")];
    const button=buttons.find((b)=>b.dataset.dashboardKpi!=="persons") || buttons[0];
    if (!button) return null;
    const code=button.dataset.dashboardKpi;
    button.click();
    return {code};
  })()`);
  assert(kpi, "No actionable KPI drill-down button found");
  await waitFor(client, "window.ATLAS_MAIN_AUTHORITY_NAV.getDomain() === 'persons'", 15000);
  const kpiFilter = await evaluate(client, "window.ATLAS_PERSON_MAIN?.getDashboardFilter?.() || null");
  results.kpi = { ...kpi, filter:kpiFilter };
  assert(kpi.code === "persons" || kpiFilter, "KPI click did not produce expected Person drill-down state", results.kpi);

  await showDashboard(client);
  const attention = await evaluate(client, `(() => {
    const button=[...document.querySelectorAll("[data-dashboard-attention]:not(:disabled)")][0];
    if (!button) return null;
    const code=button.dataset.dashboardAttention;
    const label=(button.querySelector("span")?.textContent||"").trim();
    button.click();
    return {code,label};
  })()`);
  assert(attention, "No actionable Needs Attention drill-down button found");
  await waitFor(client, "window.ATLAS_MAIN_AUTHORITY_NAV.getDomain() === 'persons'", 15000);
  const attentionFilter = await evaluate(client, "window.ATLAS_PERSON_MAIN?.getDashboardFilter?.() || null");
  results.attention = { ...attention, filter:attentionFilter };
  assert(attentionFilter && attentionFilter.person_ids?.length > 0, "Needs Attention click did not set a Person filter", results.attention);

  await showDashboard(client);
  const completeness = await evaluate(client, `(() => {
    const button=document.querySelector("[data-dashboard-completeness]");
    if (!button) return null;
    const code=button.dataset.dashboardCompleteness;
    const row=button.closest("tr");
    const unit=row?.dataset.completenessUnit || null;
    button.click();
    return {code,unit};
  })()`);
  assert(completeness, "No actionable Completeness Matrix Person drill-down button found");
  assert(completeness.unit === "person", "Completeness drill-down was not a Person-unit row", completeness);
  await waitFor(client, "window.ATLAS_MAIN_AUTHORITY_NAV.getDomain() === 'persons'", 15000);
  const completenessFilter = await evaluate(client, "window.ATLAS_PERSON_MAIN?.getDashboardFilter?.() || null");
  results.completeness = { ...completeness, filter:completenessFilter };
  assert(completenessFilter && completenessFilter.person_ids?.length > 0, "Completeness Person click did not set a Person filter", results.completeness);

  await showDashboard(client);
  return results;
}

async function collectMobileDom(client) {
  return evaluate(client, `(() => {
    const q=(s)=>document.querySelector(s);
    const qa=(s)=>[...document.querySelectorAll(s)];
    const doc=document.documentElement;
    const heat=q(".dashboard-heatmap-wrap");
    const complete=q(".dashboard-completeness-wrap");
    const timeline=q(".dashboard-timeline");
    const scrollProbe=(el)=>{
      if (!el) return null;
      const style=getComputedStyle(el);
      const before=el.scrollTop;
      el.scrollTop=Math.min(120,Math.max(0,el.scrollHeight-el.clientHeight));
      const after=el.scrollTop;
      el.scrollTop=before;
      return {
        client_width:el.clientWidth,scroll_width:el.scrollWidth,
        client_height:el.clientHeight,scroll_height:el.scrollHeight,
        overflow_x:style.overflowX,overflow_y:style.overflowY,max_height:style.maxHeight,
        scroll_probe:after
      };
    };
    return {
      viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
      global_scroll:{client_width:doc.clientWidth,scroll_width:doc.scrollWidth,overflow_x:doc.scrollWidth-doc.clientWidth},
      kpi_columns:getComputedStyle(q(".dashboard-kpi-grid")).gridTemplateColumns,
      heatmap_wrap:scrollProbe(heat),
      completeness_wrap:scrollProbe(complete),
      timeline:scrollProbe(timeline),
      timeline_entry_count:qa(".dashboard-timeline-entry").length,
      dashboard_width:q("#atlasDashboardMount .dashboard-control-center")?.getBoundingClientRect().width || 0
    };
  })()`);
}

function verifyCanonicalContracts(modelState, desktopDom) {
  assert(modelState.system_identity?.git_commit_sha === EXPECTED_RUNTIME_SHA, "Dashboard Runtime Identity SHA mismatch", modelState.system_identity);

  const freshness = modelState.source_freshness;
  assert(freshness?.total_sources === 6, "Expected six shared Dashboard sources", freshness);
  const byKey = Object.fromEntries((freshness.rows || []).map((row)=>[row.key,row]));
  const spatialExpected = canonicalTimestamp(modelState.spatial_generated_at);
  assert(spatialExpected, "Spatial Index generated_at is missing or invalid", { generated_at:modelState.spatial_generated_at });
  assert(byKey.spatialIndex?.data_at === spatialExpected, "Spatial freshness is not derived from generated_at", { row:byKey.spatialIndex, generated_at:modelState.spatial_generated_at });
  assert(byKey.spatialIndex?.data_basis === "generated_at", "Spatial freshness basis mismatch", byKey.spatialIndex);

  const recentTimes=(modelState.recent_delta_rows || []).map((row)=>canonicalTimestamp(row.occurred_at)).filter(Boolean).sort();
  assert(recentTimes.length > 0, "Recent Delta has no real mutation rows", modelState.recent_delta_rows);
  const recentExpected=recentTimes.at(-1);
  assert(byKey.recentDelta?.data_at === recentExpected, "Recent Delta freshness is not latest mutation timestamp", { row:byKey.recentDelta, expected:recentExpected });
  assert(byKey.recentDelta?.data_basis === "latest_tracked_mutation", "Recent Delta freshness basis mismatch", byKey.recentDelta);

  for (const key of ["persons","personDomains","nonTimeline","systemIdentity"]) {
    assert(byKey[key]?.data_at == null, `${key} incorrectly exposes a source timestamp`, byKey[key]);
    assert(byKey[key]?.data_timestamp_known === false, `${key} incorrectly marks source timestamp known`, byKey[key]);
    assert(byKey[key]?.read_at, `${key} should still expose LAST READ`, byKey[key]);
  }

  assert(desktopDom.freshness_rows.length === freshness.rows.length, "Freshness DOM row count does not match shared source state", { dom:desktopDom.freshness_rows, model:freshness.rows });
  freshness.rows.forEach((row,index)=>{
    const cells=desktopDom.freshness_rows[index] || [];
    assert(cells.length >= 5, "Malformed Source Freshness row", { index,cells,row });
    if (row.data_at == null) assert(cells[2] === "—", "Timestamp-hidden source did not render —", { index,cells,row });
    else assert(cells[2] !== "—", "Known source timestamp rendered as —", { index,cells,row });
    assert(cells[4] !== "—", "LAST READ was not rendered separately for a ready source", { index,cells,row });
  });

  const heatmap=modelState.heatmap;
  assert(heatmap?.available === true, "Era × Region Heatmap source unavailable", heatmap);
  assert(Number(heatmap.placed_activity_count || 0) > 0, "Era × Region Heatmap has no placed real activities", heatmap);
  assert((heatmap.rows || []).some((row)=>(row.cells || []).some((cell)=>Number(cell.count || 0)>0)), "Era × Region Heatmap contains no non-zero real-data cells", heatmap);
  assert(desktopDom.heatmap.non_zero > 0 && desktopDom.heatmap.total > 0, "Rendered heatmap has no real data", desktopDom.heatmap);

  const timeline=modelState.timeline;
  assert(timeline?.available === true, "Recent Activity Timeline source unavailable", timeline);
  assert((timeline.entries || []).length > 0, "Recent Activity Timeline has no real entries", timeline);
  assert(desktopDom.timeline.entry_count > 0, "Recent Activity Timeline rendered zero entries", desktopDom.timeline);
  assert(Array.isArray(modelState.recent_delta?.gaps), "Recent Delta coverage gap contract is missing", modelState.recent_delta);

  assert(desktopDom.activity_rows.length > 0, "Completeness Matrix has no Activity-unit rows", desktopDom.activity_rows);
  assert(desktopDom.activity_rows.every((row)=>row.has_person_drilldown === false), "Activity-unit Completeness row incorrectly exposes Person drill-down", desktopDom.activity_rows);
  assert(desktopDom.person_rows.some((row)=>row.has_person_drilldown), "Completeness Matrix has no actionable Person drill-down row", desktopDom.person_rows);
}

async function main() {
  const productionSha = await waitForProductionSha();
  const assetParity = await verifyAssetParity();

  const pages = await fetchJson(`${DEBUG_URL}/json/list`);
  const page = pages.find((item)=>item.type === "page") || pages[0];
  assert(page?.webSocketDebuggerUrl, "No Chrome page target found");
  const client = new CdpClient(page.webSocketDebuggerUrl);
  await client.ready();

  const consoleErrors = [];
  const exceptions = [];
  const resourceErrors = [];
  const requestUrls = new Map();
  await client.call("Page.enable");
  await client.call("Runtime.enable");
  await client.call("Log.enable");
  await client.call("Network.enable");
  client.on("Runtime.consoleAPICalled", (params) => {
    if (params.type === "error") consoleErrors.push({
      source:"console",
      text:params.args?.map((arg)=>arg.value ?? arg.description ?? "").join(" ") || "console.error",
      url:params.stackTrace?.callFrames?.[0]?.url || null
    });
  });
  client.on("Runtime.exceptionThrown", (params) => exceptions.push(params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || "runtime exception"));
  client.on("Log.entryAdded", (params) => {
    if (params.entry?.level === "error") consoleErrors.push({
      source:"log",
      text:params.entry.text || "Log.entryAdded error",
      url:params.entry.url || null
    });
  });
  client.on("Network.requestWillBeSent", (params) => {
    if (params.requestId && params.request?.url) requestUrls.set(params.requestId, params.request.url);
  });
  client.on("Network.responseReceived", (params) => {
    const status=Number(params.response?.status || 0);
    if (status >= 400) resourceErrors.push({ url:params.response?.url || null,status,type:params.type || null });
  });
  client.on("Network.loadingFailed", (params) => {
    resourceErrors.push({ url:requestUrls.get(params.requestId) || null,status:null,type:params.type || null,error:params.errorText || "loadingFailed",blocked_reason:params.blockedReason || null });
  });

  try {
    await client.call("Emulation.setDeviceMetricsOverride", DESKTOP);
    const url = new URL(PRODUCTION_ORIGIN);
    url.searchParams.set("atlas_acceptance_sha", EXPECTED_RUNTIME_SHA);
    url.hash = "atlas-dashboard";
    await client.call("Page.navigate", { url:url.href });
    await dashboardReady(client);

    const requiredEyebrows=[
      "SYSTEM / PRODUCTION","SOURCE FRESHNESS","NEEDS ATTENTION","WORK FRONTIER","DATA QUALITY",
      "COMPLETENESS MATRIX","ERA × REGION COVERAGE","RECENT DELTA · RECENT ACTIVITY TIMELINE","PERSON DOMAINS","WORKSPACE"
    ];
    const desktopDom=await collectDesktopDom(client);
    assert(desktopDom.dashboard_visible, "Dashboard did not render on Desktop", desktopDom);
    assert(desktopDom.kpi_count >= 6, "Dashboard KPI grid incomplete", desktopDom);
    for (const label of requiredEyebrows) assert(desktopDom.eyebrows.includes(label), `Dashboard panel missing: ${label}`, desktopDom.eyebrows);
    assert(desktopDom.global_scroll.overflow_x <= 1, "Desktop Dashboard causes page-level horizontal overflow", desktopDom.global_scroll);
    assert(!desktopDom.error_overlay, "Framework error overlay detected", desktopDom);

    const modelState=await collectCanonicalSnapshot(client);
    verifyCanonicalContracts(modelState, desktopDom);
    const drilldowns=await verifyDrilldowns(client);
    const desktopScreenshot=await screenshot(client, "dashboard-desktop.png");

    await client.call("Emulation.setDeviceMetricsOverride", MOBILE);
    await showDashboard(client);
    await sleep(500);
    const mobileDom=await collectMobileDom(client);
    assert(mobileDom.global_scroll.overflow_x <= 1, "Mobile Dashboard causes page-level horizontal overflow", mobileDom.global_scroll);
    assert(mobileDom.heatmap_wrap && mobileDom.heatmap_wrap.overflow_x === "auto", "Mobile Heatmap wrapper is not horizontally scrollable", mobileDom.heatmap_wrap);
    assert(mobileDom.heatmap_wrap.scroll_width > mobileDom.heatmap_wrap.client_width, "Mobile Heatmap has no horizontal scroll range", mobileDom.heatmap_wrap);
    assert(mobileDom.completeness_wrap && mobileDom.completeness_wrap.overflow_x === "auto", "Mobile Completeness wrapper is not horizontally scrollable", mobileDom.completeness_wrap);
    assert(mobileDom.completeness_wrap.scroll_width > mobileDom.completeness_wrap.client_width, "Mobile Completeness has no horizontal scroll range", mobileDom.completeness_wrap);
    assert(mobileDom.timeline && mobileDom.timeline.overflow_y === "auto", "Mobile timeline scroll contract is not active", mobileDom.timeline);
    if (mobileDom.timeline.scroll_height > mobileDom.timeline.client_height) {
      assert(mobileDom.timeline.scroll_probe > 0, "Mobile timeline had overflow but did not actually scroll", mobileDom.timeline);
    }
    const mobileScreenshot=await screenshot(client, "dashboard-mobile.png");

    const majorNetworkErrors=resourceErrors.filter((row)=>{
      if (!row.url) return true;
      let parsed=null;
      let sameOrigin=false;
      try {
        parsed=new URL(row.url);
        sameOrigin=parsed.origin === new URL(PRODUCTION_ORIGIN).origin;
      } catch {}
      if (sameOrigin && parsed?.pathname === "/favicon.ico" && Number(row.status || 0) === 404 && row.type === "Other") return false;
      return sameOrigin || Number(row.status || 0) >= 500 || ["Document","Script","Stylesheet","XHR","Fetch"].includes(row.type);
    });

    const genericResourceConsole=(row)=>String(row?.text || "").startsWith("Failed to load resource:");
    const majorConsoleErrors=consoleErrors.filter((row)=>{
      if (!genericResourceConsole(row)) return true;
      if (row.url) {
        try {
          const parsed=new URL(row.url);
          if (parsed.pathname === "/favicon.ico" && Number(resourceErrors.find((item)=>item.url===row.url)?.status || 0) === 404) return false;
        } catch {}
      }
      return majorNetworkErrors.length > 0;
    });

    assert(majorNetworkErrors.length === 0, "Major Production API/network failures detected", { major:majorNetworkErrors, all:resourceErrors, console:consoleErrors });
    assert(majorConsoleErrors.length === 0, "Production browser console errors detected", { major:majorConsoleErrors, all:consoleErrors, network:resourceErrors });
    assert(exceptions.length === 0, "Production uncaught exceptions detected", exceptions);

    const report={
      schema:"atlas-dashboard-production-acceptance/v1",
      status:"PASS",
      checked_at:new Date().toISOString(),
      production_origin:PRODUCTION_ORIGIN,
      expected_runtime_sha:EXPECTED_RUNTIME_SHA,
      production_sha:productionSha,
      asset_parity:{count:assetParity.length,rows:assetParity},
      desktop:desktopDom,
      mobile:mobileDom,
      drilldowns,
      canonical:{
        system_identity:modelState.system_identity,
        source_freshness:modelState.source_freshness,
        spatial_generated_at:modelState.spatial_generated_at,
        recent_delta_latest_at:modelState.source_freshness.rows.find((row)=>row.key==="recentDelta")?.data_at || null,
        recent_delta_gaps:modelState.recent_delta?.gaps || [],
        recent_delta_coverage:modelState.recent_delta_coverage,
        heatmap:{available:modelState.heatmap?.available,placed_activity_count:modelState.heatmap?.placed_activity_count,unresolved_activity_count:modelState.heatmap?.unresolved_activity_count,row_count:modelState.heatmap?.rows?.length || 0},
        timeline:{available:modelState.timeline?.available,event_count:modelState.timeline?.event_count,total_change_count:modelState.timeline?.total_change_count,entry_count:modelState.timeline?.entries?.length || 0}
      },
      browser_errors:{console:consoleErrors,major_console:majorConsoleErrors,exceptions,major_network:majorNetworkErrors,all_network:resourceErrors},
      screenshots:{desktop:desktopScreenshot,mobile:mobileScreenshot}
    };
    fs.writeFileSync(path.join(OUT_DIR,"dashboard-production-acceptance.json"),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  } finally {
    client.close();
  }
}

main().catch((error)=>{
  const failure={
    schema:"atlas-dashboard-production-acceptance/v1",
    status:"FAIL",
    checked_at:new Date().toISOString(),
    production_origin:PRODUCTION_ORIGIN,
    expected_runtime_sha:EXPECTED_RUNTIME_SHA || null,
    error:error?.message || String(error),
    details:error?.details || null
  };
  fs.writeFileSync(path.join(OUT_DIR,"dashboard-production-acceptance.json"),JSON.stringify(failure,null,2));
  console.error(JSON.stringify(failure,null,2));
  process.exitCode=1;
});
