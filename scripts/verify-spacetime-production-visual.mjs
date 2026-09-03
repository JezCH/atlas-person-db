import fs from "node:fs";
import path from "node:path";

const DEBUG_URL = process.env.ATLAS_CDP_URL || "http://127.0.0.1:9222";
const PRODUCTION_URL = process.env.ATLAS_PRODUCTION_URL || "https://atlas-person-db.vercel.app/#atlas-spacetime";
const EXPECTED_RUNTIME_SHA = process.env.ATLAS_EXPECTED_RUNTIME_SHA || "d8e8fa3f56419223bb3a67427de9b68cb0ea10a8";
const OUT_DIR = process.env.ATLAS_VISUAL_OUT_DIR || "artifacts/spacetime-visual-acceptance";
const VIEWPORT = Object.freeze({ width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
const EXPECTED_REVIEWED_PLACE_COUNT = 5;

fs.mkdirSync(OUT_DIR, { recursive: true });

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
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
      this.ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      this.ws.addEventListener("error", (event) => { clearTimeout(timer); reject(event.error || new Error("CDP websocket error")); }, { once: true });
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
    return () => this.listeners.get(method)?.delete(fn);
  }
  call(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
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
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Runtime.evaluate failed");
  }
  return result.result?.value;
}

async function waitFor(client, expression, timeoutMs = 60000, intervalMs = 250) {
  const started = Date.now();
  let lastValue;
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
  const result = await client.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, Buffer.from(result.data, "base64"));
  return file;
}

function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function normalizedBandGeometry(rows) {
  const total = Math.max(...rows.map((row) => Number(row.left) + Number(row.width)));
  return rows.map((row) => ({
    text: row.text,
    left: Number(row.left) / total,
    width: Number(row.width) / total
  }));
}

function assertNormalizedGeometryInvariant(a, b, label) {
  assert(a.length === b.length, `${label} band count changed across zoom`, { a, b });
  const na = normalizedBandGeometry(a);
  const nb = normalizedBandGeometry(b);
  for (let i = 0; i < na.length; i++) {
    assert(na[i].text === nb[i].text, `${label} identity/order changed across zoom`, { a:na[i], b:nb[i] });
    assert(Math.abs(na[i].left - nb[i].left) < 2e-5, `${label} normalized left changed across zoom`, { a:na[i], b:nb[i] });
    assert(Math.abs(na[i].width - nb[i].width) < 2e-5, `${label} normalized width changed across zoom`, { a:na[i], b:nb[i] });
  }
}

const overlapCode = `
(elements) => {
  const rows = elements
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && Number(style.opacity) > 0.02 &&
        r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
    })
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, text:(el.textContent||"").trim() };
    });
  const overlaps = [];
  for (let i=0;i<rows.length;i++) for (let j=i+1;j<rows.length;j++) {
    const a=rows[i], b=rows[j];
    const w=Math.min(a.right,b.right)-Math.max(a.left,b.left);
    const h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
    if (w > 0.5 && h > 0.5) overlaps.push({a:a.text,b:b.text,w,h});
  }
  return { count:overlaps.length, overlaps };
}`;

const bandContainmentCode = `
(labels,bands,rails) => {
  const bandMap = new Map(bands.map((el) => {
    const left = parseFloat(el.style.left);
    const width = parseFloat(el.style.width);
    return [el.dataset.spacetimeBand || "", { left, right:left+width, width }];
  }).filter(([code,row]) => code && Number.isFinite(row.left) && Number.isFinite(row.width)));
  const labelViolations = labels.map((el) => {
    const band = bandMap.get(el.dataset.spacetimeBand || "");
    const left = parseFloat(el.style.left), width = parseFloat(el.style.width);
    if (!band || !Number.isFinite(left) || !Number.isFinite(width)) return null;
    return left < band.left - 0.5 || left + width > band.right + 0.5
      ? { text:(el.textContent||"").trim(), band:el.dataset.spacetimeBand, left, width, band_left:band.left, band_right:band.right }
      : null;
  }).filter(Boolean);
  const corridorRails = rails.filter((el) => el.dataset.spacetimeRailBasis === "presentation_corridor");
  const railViolations = corridorRails.map((el) => {
    const band = bandMap.get(el.dataset.spacetimeBand || "");
    const x = parseFloat(el.style.left);
    if (!band || !Number.isFinite(x)) return null;
    return x < band.left - 0.5 || x > band.left + band.width * 0.45 + 0.5
      ? { band:el.dataset.spacetimeBand, x, band_left:band.left, band_width:band.width }
      : null;
  }).filter(Boolean);
  return {
    label_violation_count:labelViolations.length,
    label_violations:labelViolations,
    corridor_rail_count:corridorRails.length,
    rail_violation_count:railViolations.length,
    rail_violations:railViolations
  };
}`;

async function collect500(client) {
  return evaluate(client, `(() => {
    const q=(s)=>document.querySelector(s);
    const qa=(s)=>[...document.querySelectorAll(s)];
    const rect=(el)=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const style=(el)=>getComputedStyle(el);
    const macro=qa(".spacetime-region-head-layer.is-macro .spacetime-region-head-band").map(el=>({left:parseFloat(el.style.left),width:parseFloat(el.style.width),text:(el.textContent||"").trim()}));
    const sub=qa(".spacetime-region-head-layer.is-subregion .spacetime-region-head-band").map(el=>({left:parseFloat(el.style.left),width:parseFloat(el.style.width),text:(el.textContent||"").trim()}));
    const workspace=q(".spacetime-workspace"), frame=q(".spacetime-frame"), inspector=q("#spacetimeInspector");
    const placeLayer=q(".spacetime-region-head-layer.is-place");
    const header=q(".spacetime-region-head"), corner=q(".spacetime-sticky-corner"), scroll=q(".spacetime-scroll");
    const labelOverlap=(${overlapCode})(qa(".spacetime-track-label"));
    const bandContainment=(${bandContainmentCode})(qa(".spacetime-track-label"),qa(".spacetime-region-head-band[data-spacetime-band]"),qa(".spacetime-track-rail"));
    return {
      viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
      zoom:(q("#spacetimeCameraZoomValue")?.textContent||"").trim(),
      spatialStage:qa(".spacetime-status-row span").map(x=>(x.textContent||"").trim()).find(x=>x.endsWith("공간축"))||null,
      placeOpacity:Number(style(placeLayer).opacity),
      placeMarkerCount:qa(".spacetime-place-head-marker").length,
      placeVisibleCount:Number(style(placeLayer).opacity) > 0.02 ? qa(".spacetime-place-head-marker").filter(el=>Number(style(el).opacity) > 0.02).length : 0,
      macro, sub,
      workspaceRect:rect(workspace),
      frameRect:rect(frame),
      inspectorRect:rect(inspector),
      workspaceGrid:style(workspace).gridTemplateColumns,
      inspectorPosition:style(inspector).position,
      headerHeight:rect(header).height,
      cornerWidth:rect(corner).width,
      cornerHeight:rect(corner).height,
      scrollHeight:rect(scroll).height,
      scrollOverflowX:style(scroll).overflowX,
      scrollOverflowY:style(scroll).overflowY,
      labelOverlap,
      bandContainment
    };
  })()`);
}

async function collect800(client, geometry500) {
  return evaluate(client, `(() => {
    const q=(s)=>document.querySelector(s);
    const qa=(s)=>[...document.querySelectorAll(s)];
    const style=(el)=>getComputedStyle(el);
    const rect=(el)=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,text:(el.textContent||"").trim()};};
    const macro=qa(".spacetime-region-head-layer.is-macro .spacetime-region-head-band").map(el=>({left:parseFloat(el.style.left),width:parseFloat(el.style.width),text:(el.textContent||"").trim()}));
    const sub=qa(".spacetime-region-head-layer.is-subregion .spacetime-region-head-band").map(el=>({left:parseFloat(el.style.left),width:parseFloat(el.style.width),text:(el.textContent||"").trim()}));
    const placeLayer=q(".spacetime-region-head-layer.is-place");
    const markers=qa(".spacetime-place-head-marker");
    const placeOverlap=(${overlapCode})(markers);
    const labelOverlap=(${overlapCode})(qa(".spacetime-track-label"));
    const bandContainment=(${bandContainmentCode})(qa(".spacetime-track-label"),qa(".spacetime-region-head-band[data-spacetime-band]"),qa(".spacetime-track-rail"));
    return {
      zoom:(q("#spacetimeCameraZoomValue")?.textContent||"").trim(),
      spatialStage:qa(".spacetime-status-row span").map(x=>(x.textContent||"").trim()).find(x=>x.endsWith("공간축"))||null,
      placeOpacity:Number(style(placeLayer).opacity),
      placeMarkerCount:markers.length,
      placeMarkers:markers.map(rect),
      placeOverlap,
      labelOverlap,
      bandContainment,
      macro,sub,
      uncertaintyCount:qa(".spacetime-spatial-uncertainty").length,
      geometry500:${JSON.stringify(geometry500)}
    };
  })()`);
}

async function main() {
  const pages = await jsonFetch(`${DEBUG_URL}/json/list`);
  const page = pages.find((item) => item.type === "page") || pages[0];
  if (!page?.webSocketDebuggerUrl) throw new Error("No Chrome page target found");
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
  await client.call("Emulation.setDeviceMetricsOverride", VIEWPORT);
  client.on("Runtime.consoleAPICalled", (params) => {
    if (params.type === "error") consoleErrors.push(params.args?.map((a) => a.value ?? a.description ?? "").join(" ") || "console.error");
  });
  client.on("Runtime.exceptionThrown", (params) => exceptions.push(params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || "runtime exception"));
  client.on("Log.entryAdded", (params) => {
    if (params.entry?.level === "error") consoleErrors.push(params.entry.text || "Log.entryAdded error");
  });
  client.on("Network.requestWillBeSent", (params) => {
    if (params.requestId && params.request?.url) requestUrls.set(params.requestId, params.request.url);
  });
  client.on("Network.responseReceived", (params) => {
    if (Number(params.response?.status) >= 400) {
      resourceErrors.push({ url: params.response.url, status: Number(params.response.status), type: params.type || null });
    }
  });
  client.on("Network.loadingFailed", (params) => {
    const url = requestUrls.get(params.requestId) || null;
    resourceErrors.push({ url, status: null, type: params.type || null, error: params.errorText || "loadingFailed", blocked_reason: params.blockedReason || null });
  });

  try {
    await client.call("Page.navigate", { url: PRODUCTION_URL });
    await waitFor(client, "document.readyState === 'complete'", 45000);
    await waitFor(client, "Boolean(document.querySelector('#personSpacetimeMount .spacetime-frame'))", 90000);

    // The historical world opens at the top of the full range, which may legitimately
    // contain no virtualized Person labels. Focus the first real searchable Person,
    // then clear the query so acceptance runs on the unfiltered world around that era.
    const focused = await evaluate(client, `(() => {
      const input=document.querySelector('#spacetimeSearch');
      if (!input) return false;
      input.value='a';
      input.dispatchEvent(new Event('input',{bubbles:true}));
      return true;
    })()`);
    assert(focused, "Spacetime search input was not available");
    await waitFor(client, "document.querySelectorAll('[data-spacetime-search-result]').length > 0", 30000);
    await evaluate(client, "document.querySelector('[data-spacetime-search-result]')?.click()");
    await waitFor(client, "Boolean(document.querySelector('#spacetimeInspector:not(.is-empty)'))", 30000);
    await sleep(700);
    await evaluate(client, `(() => {
      const input=document.querySelector('#spacetimeSearch');
      if (!input) return false;
      input.value='';
      input.dispatchEvent(new Event('input',{bubbles:true}));
      return true;
    })()`);
    await waitFor(client, "document.querySelectorAll('.spacetime-track-label').length > 0", 30000);
    await sleep(1200);

    const live = await evaluate(client, `(() => ({
      href:location.href,
      title:document.title,
      navLoaded:Boolean(document.querySelector('script[src*="atlas-main-authority-nav.js"]')),
      viewLoaded:Boolean(window.ATLAS_PERSON_SPACETIME_VIEW),
      semanticLoaded:Boolean(window.ATLAS_PERSON_SPACETIME_SEMANTIC_AXIS),
      bodyTextLength:document.body.innerText.trim().length,
      errorOverlay:Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay'))
    }))()`);
    assert(live.navLoaded, "Production did not load the ATLAS authority navigation runtime", live);
    assert(live.viewLoaded && live.semanticLoaded, "Production spacetime runtime modules were not loaded", live);
    assert(live.bodyTextLength > 500, "Production page appears blank or incomplete", live);
    assert(!live.errorOverlay, "Framework error overlay detected", live);

    await evaluate(client, "document.querySelector('#spacetimeCameraZoomReset')?.click()");
    await waitFor(client, "document.querySelector('#spacetimeCameraZoomValue')?.textContent?.trim() === '500%'", 10000);
    await sleep(600);
    const at500 = await collect500(client);
    assert(at500.viewport.width === 1600 && at500.viewport.height === 1000, "Unexpected visual acceptance viewport", at500.viewport);
    assert(at500.zoom === "500%", "Readable-floor zoom is not 500%", at500);
    assert(at500.placeOpacity === 0, "Reviewed Place layer must be hidden at the 500% floor", at500);
    assert(at500.placeMarkerCount === EXPECTED_REVIEWED_PLACE_COUNT, "Unexpected reviewed Place registry count at 500%", at500);
    assert(at500.placeVisibleCount === 0, "Reviewed Place markers are visibly leaking into 500%", at500);
    assert(at500.inspectorPosition === "sticky", "Person/Activity inspector is not sticky", at500);
    assert(at500.frameRect.right <= at500.inspectorRect.left + 0.5, "Map and inspector overlap at desktop viewport", at500);
    assert(Math.abs(at500.headerHeight - 36) < 0.75, "Space header height drifted from 36px", at500);
    assert(Math.abs(at500.cornerWidth - 140) < 0.75, "Shared axis width drifted from 140px", at500);
    assert(Math.abs(at500.cornerHeight - 36) < 0.75, "Shared corner height drifted from 36px", at500);
    assert(at500.labelOverlap.count === 0, "Visible Person labels overlap at 500%", at500.labelOverlap);
    assert(at500.bandContainment.label_violation_count === 0, "Person labels escape their reviewed presentation bands at 500%", at500.bandContainment);
    assert(at500.bandContainment.rail_violation_count === 0, "Presentation rails drift back toward band centers at 500%", at500.bandContainment);
    await screenshot(client, "spacetime-500.png");

    for (let i=0;i<3;i++) {
      await evaluate(client, "document.querySelector('#spacetimeCameraZoomIn')?.click()");
      await sleep(350);
    }
    await waitFor(client, "document.querySelector('#spacetimeCameraZoomValue')?.textContent?.trim() === '800%'", 10000);
    await sleep(800);

    let uncertaintyCount = await evaluate(client, "document.querySelectorAll('.spacetime-spatial-uncertainty').length");
    if (!uncertaintyCount) {
      await evaluate(client, `(() => {
        const s=document.querySelector('.spacetime-scroll');
        if (!s) return false;
        s.scrollTop=Math.max(0,(s.scrollHeight-s.clientHeight)*0.5);
        s.dispatchEvent(new Event('scroll',{bubbles:true}));
        return true;
      })()`);
      await sleep(1000);
      uncertaintyCount = await evaluate(client, "document.querySelectorAll('.spacetime-spatial-uncertainty').length");
    }

    const at800 = await collect800(client, { macro:at500.macro, sub:at500.sub });
    at800.uncertaintyCount = uncertaintyCount;
    assert(at800.zoom === "800%", "Maximum visual zoom is not 800%", at800);
    assert(at800.placeOpacity > 0.99, "Reviewed Place layer is not fully visible at 800%", at800);
    assert(at800.placeMarkerCount === EXPECTED_REVIEWED_PLACE_COUNT, "Unexpected reviewed Place marker count at 800%", at800);
    assert(at800.placeOverlap.count === 0, "Reviewed Place header markers overlap at 800%", at800.placeOverlap);
    assert(at800.labelOverlap.count === 0, "Visible Person labels overlap at 800%", at800.labelOverlap);
    assert(at800.bandContainment.label_violation_count === 0, "Person labels escape their reviewed presentation bands at 800%", at800.bandContainment);
    assert(at800.bandContainment.rail_violation_count === 0, "Presentation rails drift back toward band centers at 800%", at800.bandContainment);
    assertNormalizedGeometryInvariant(at500.macro, at800.macro, "Macroregion");
    assertNormalizedGeometryInvariant(at500.sub, at800.sub, "Subregion");
    assert(at800.uncertaintyCount > 0, "No C6 spatial uncertainty evidence was rendered in the inspected 800% viewport", at800);
    await screenshot(client, "spacetime-800.png");

    await waitFor(client, "document.querySelectorAll('.spacetime-track-label').length > 0", 10000);
    const personSelected = await evaluate(client, `(() => {
      const label=document.querySelector('.spacetime-track-label');
      if (!label) return false;
      label.click();
      return true;
    })()`);
    assert(personSelected, "No Person label was available for interaction acceptance");
    await waitFor(client, "Boolean(document.querySelector('#spacetimeInspector:not(.is-empty)'))", 10000);
    await waitFor(client, "document.querySelectorAll('[data-spacetime-inspector-activity]').length > 0", 10000);

    const activitySelected = await evaluate(client, `(() => {
      const button=[...document.querySelectorAll('[data-spacetime-inspector-activity]')].find((el)=>!el.disabled);
      if (!button) return false;
      button.click();
      return true;
    })()`);
    assert(activitySelected, "No inspectable Activity was available for interaction acceptance");
    await waitFor(client, "Boolean(document.querySelector('.spacetime-meanwhile-line.is-activity-linked'))", 10000);
    await waitFor(client, "Boolean(document.querySelector('#spacetimeInspector output'))", 10000);
    await sleep(500);

    const interaction = await evaluate(client, `(() => {
      const q=(s)=>document.querySelector(s);
      const line=q('.spacetime-meanwhile-line.is-activity-linked');
      const canvas=q('.spacetime-canvas');
      const lr=line.getBoundingClientRect(), cr=canvas.getBoundingClientRect();
      return {
        inspectorEmpty:q('#spacetimeInspector')?.classList.contains('is-empty') ?? true,
        selectedActivityButtons:document.querySelectorAll('.spacetime-inspector-activity.is-selected').length,
        selectedOutput:(q('#spacetimeInspector output')?.textContent||'').trim(),
        meanwhileText:(q('.spacetime-meanwhile:not(.is-empty)')?.textContent||'').replace(/\\s+/g,' ').trim(),
        linkedLine:Boolean(line),
        lineWidth:lr.width,
        canvasWidth:cr.width,
        lineWithinCanvas:lr.left >= cr.left - 1 && lr.right <= cr.right + 1
      };
    })()`);
    assert(!interaction.inspectorEmpty, "Sticky inspector did not populate after Person selection", interaction);
    assert(interaction.selectedActivityButtons === 1, "Activity selection state is ambiguous", interaction);
    assert(/선택 Activity 중간 시점/.test(interaction.selectedOutput), "Inspector does not show Activity midpoint selection", interaction);
    assert(/MEANWHILE/.test(interaction.meanwhileText) && /선택 Activity 중간 시점/.test(interaction.meanwhileText), "Activity selection did not drive Meanwhile", interaction);
    assert(interaction.linkedLine && interaction.lineWithinCanvas, "Activity-linked Meanwhile line is missing or outside the canvas", interaction);
    assert(Math.abs(interaction.lineWidth - interaction.canvasWidth) < 2, "Meanwhile line is not full-width", interaction);
    await screenshot(client, "spacetime-activity-meanwhile.png");

    await sleep(500);
    const ignorableResource = (item) => {
      try {
        const pathname = new URL(item?.url || "", PRODUCTION_URL).pathname;
        return pathname === "/favicon.ico" || pathname === "/apple-touch-icon.png";
      } catch { return false; }
    };
    const nonIgnorableResourceErrors = resourceErrors.filter((item) => !ignorableResource(item));
    const genericNetworkConsoleError = (msg) => /^Failed to load resource: the server responded with a status of 404/i.test(msg);
    const filteredConsoleErrors = consoleErrors.filter((msg) => {
      if (/favicon/i.test(msg)) return false;
      if (genericNetworkConsoleError(msg) && nonIgnorableResourceErrors.length === 0) return false;
      return true;
    });
    assert(exceptions.length === 0, "Runtime exceptions detected during visual acceptance", exceptions);
    assert(nonIgnorableResourceErrors.length === 0, "Non-ignorable resource failures detected during visual acceptance", nonIgnorableResourceErrors);
    assert(filteredConsoleErrors.length === 0, "Console errors detected during visual acceptance", { console_errors:filteredConsoleErrors, resource_errors:resourceErrors });

    const report = {
      schema:"atlas-spacetime-production-visual-acceptance/v1",
      production_url:PRODUCTION_URL,
      expected_runtime_sha:EXPECTED_RUNTIME_SHA,
      viewport:VIEWPORT,
      checked_at:new Date().toISOString(),
      live,
      at_500_percent:at500,
      at_800_percent:at800,
      interaction,
      console_errors:filteredConsoleErrors,
      resource_errors:resourceErrors,
      runtime_exceptions:exceptions,
      screenshots:["spacetime-500.png","spacetime-800.png","spacetime-activity-meanwhile.png"],
      status:"PASS"
    };
    fs.writeFileSync(path.join(OUT_DIR,"visual-acceptance.json"), JSON.stringify(report,null,2)+"\n");
    console.log("ATLAS_SPACETIME_PRODUCTION_VISUAL_ACCEPTANCE_PASS");
    console.log(JSON.stringify(report,null,2));
  } finally {
    client.close();
  }
}

main().catch((error) => {
  const failure = {
    schema:"atlas-spacetime-production-visual-acceptance/v1",
    production_url:PRODUCTION_URL,
    expected_runtime_sha:EXPECTED_RUNTIME_SHA,
    checked_at:new Date().toISOString(),
    status:"FAIL",
    error:error?.message || String(error),
    details:error?.details || null
  };
  fs.writeFileSync(path.join(OUT_DIR,"visual-acceptance.json"), JSON.stringify(failure,null,2)+"\n");
  console.error("ATLAS_SPACETIME_PRODUCTION_VISUAL_ACCEPTANCE_FAIL");
  console.error(JSON.stringify(failure,null,2));
  process.exitCode=1;
});
