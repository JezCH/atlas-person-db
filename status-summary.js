(() => {
  "use strict";

  const style = document.createElement("style");
  style.textContent = `
    .admin-nav-link{display:grid;grid-template-columns:22px 1fr auto;text-decoration:none;color:#aeb9cb;border-radius:9px;padding:11px 12px;font-weight:700}
    .admin-nav-link:hover{color:#fff;background:#6572e83d}
    .mobile-admin-link{display:flex;align-items:center;gap:10px;text-decoration:none;color:#e9eef7;padding:12px;border-radius:10px;font-weight:800}
    .mobile-admin-link:hover{background:#6572e83d}
    .registration-summary{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 15px;margin-bottom:14px}
    .registration-summary-main{display:flex;align-items:center;gap:12px;min-width:0}
    .registration-summary-dot{width:11px;height:11px;border-radius:999px;flex:0 0 auto;background:#d39a22;box-shadow:0 0 0 5px #fff3d6}
    .registration-summary[data-state="ok"] .registration-summary-dot{background:#24955b;box-shadow:0 0 0 5px #e7f6ed}
    .registration-summary[data-state="error"] .registration-summary-dot{background:#c44750;box-shadow:0 0 0 5px #fde9eb}
    .registration-summary-title{font-weight:900;font-size:14px}
    .registration-summary-detail{margin-top:3px;color:#6f7888;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .registration-summary-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
    .registration-summary-link{border:1px solid #cfd6e1;border-radius:8px;padding:8px 11px;background:#fff;color:#172033;text-decoration:none;font-size:12px;font-weight:800}
    .registration-summary-link:disabled{opacity:.55;cursor:wait}
    @media(max-width:760px){
      .admin-nav-link{display:none}
      .registration-summary{align-items:center;gap:8px;min-height:44px;padding:7px 8px;margin-bottom:8px;border-radius:11px}
      .registration-summary-main{align-items:center;gap:8px;overflow:hidden}
      .registration-summary-dot{width:8px;height:8px;box-shadow:0 0 0 3px #fff3d6}
      .registration-summary[data-state="ok"] .registration-summary-dot{box-shadow:0 0 0 3px #e7f6ed}
      .registration-summary[data-state="error"] .registration-summary-dot{box-shadow:0 0 0 3px #fde9eb}
      .registration-summary-title{font-size:12px;line-height:1.2;white-space:nowrap}
      .registration-summary-detail{margin-top:1px;font-size:10px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100vw - 168px)}
      .registration-summary-actions{flex-direction:row;gap:4px}
      .registration-summary-link{display:grid;place-items:center;width:34px;height:34px;padding:0;border-radius:8px;font-size:0;text-align:center}
      #registrationSummaryRefresh::before{content:"↻";font-size:17px}
      .registration-summary-actions a::before{content:"⚙";font-size:15px}
    }
  `;
  document.head.appendChild(style);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function addAdminLinks() {
    const desktopNav = document.querySelector(".nav-list");
    if (desktopNav && !desktopNav.querySelector(".admin-nav-link")) {
      const link = document.createElement("a");
      link.className = "admin-nav-link";
      link.href = "./admin.html";
      link.innerHTML = "<span>⚙</span><span>데이터 관리자</span><small>검증</small>";
      desktopNav.appendChild(link);
    }
    const mobileNav = document.querySelector(".mobile-nav");
    if (mobileNav && !mobileNav.querySelector(".mobile-admin-link")) {
      const link = document.createElement("a");
      link.className = "mobile-admin-link";
      link.href = "./admin.html";
      link.innerHTML = "<span>⚙</span><span>데이터 관리자</span>";
      mobileNav.appendChild(link);
    }
  }

  function buildSummary() {
    const toolbar = document.querySelector(".toolbar");
    if (!toolbar || document.getElementById("registrationSummary")) return null;
    const section = document.createElement("section");
    section.id = "registrationSummary";
    section.className = "registration-summary card";
    section.dataset.state = "loading";
    section.innerHTML = `<div class="registration-summary-main"><span class="registration-summary-dot" aria-hidden="true"></span><div><div id="registrationSummaryTitle" class="registration-summary-title">실시간 DB 상태 확인 중</div><div id="registrationSummaryDetail" class="registration-summary-detail">Supabase의 현재 인물·활동 수를 조회하고 있습니다.</div></div></div><div class="registration-summary-actions"><button id="registrationSummaryRefresh" class="registration-summary-link" type="button" aria-label="DB 상태 다시 확인">다시 확인</button><a class="registration-summary-link" href="./admin.html" aria-label="관리자 페이지">관리자 페이지</a></div>`;
    toolbar.insertAdjacentElement("afterend", section);
    section.querySelector("#registrationSummaryRefresh").addEventListener("click", () => verifySummary("manual"));
    return section;
  }

  function personSet(rows, canonicalApi) {
    return new Set((rows || []).map((row) => canonicalApi.normalizeLookup(row.person_name)).filter(Boolean));
  }

  function snapshotSignature(rows, canonicalApi) {
    return [...new Set(rows.map(canonicalApi.activityKey))].sort().join("\n");
  }

  async function readStableDbRows(db, excludedNames, canonicalApi) {
    let previousSignature = null;
    let latestRows = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { data, error } = await db.from("person_politics").select("person_name,politic_name,activity_start,activity_end");
      if (error) throw error;
      latestRows = (data || [])
        .map(canonicalApi.normalizeRecord)
        .filter((row) => !excludedNames.has(canonicalApi.normalizeLookup(row.person_name)))
        .filter((row) => !canonicalApi.OBSOLETE_KEYS.has(canonicalApi.activityKey(row)));
      const signature = snapshotSignature(latestRows, canonicalApi);
      if (signature === previousSignature) return latestRows;
      previousSignature = signature;
      await sleep(300);
    }
    return latestRows;
  }

  let realtimeChannel = null;
  let realtimeTimer = null;
  let requestSerial = 0;
  let activeDb = null;

  async function verifySummary(source = "auto") {
    const serial = ++requestSerial;
    const box = document.getElementById("registrationSummary") || buildSummary();
    if (!box) return;
    const title = document.getElementById("registrationSummaryTitle");
    const detail = document.getElementById("registrationSummaryDetail");
    const refreshButton = document.getElementById("registrationSummaryRefresh");
    if (refreshButton) refreshButton.disabled = true;
    box.dataset.state = "loading";
    title.textContent = "실시간 DB 상태 확인 중";
    detail.textContent = source === "realtime" ? "DB 변경 완료를 기다린 뒤 안정된 값을 확인하고 있습니다." : "Supabase에서 동일한 결과가 연속 확인될 때까지 재검증합니다.";

    try {
      const config = window.ATLAS_CONFIG || {};
      const canonicalApi = window.ATLAS_CANONICAL_DATA;
      if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) throw new Error("Supabase 설정을 찾지 못했습니다.");
      if (!canonicalApi) throw new Error("ATLAS canonical data loader is not available.");

      const { rows: expectedRows, excludedNames } = await canonicalApi.loadCanonical();
      const db = activeDb || window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      activeDb = db;
      const dbRows = await readStableDbRows(db, excludedNames, canonicalApi);
      if (serial !== requestSerial) return;

      const expectedNames = personSet(expectedRows, canonicalApi);
      const expectedKeys = new Set(expectedRows.map(canonicalApi.activityKey));
      const dbNames = personSet(dbRows, canonicalApi);
      const dbKeys = new Set(dbRows.map(canonicalApi.activityKey));
      const missingPersons = [...expectedNames].filter((name) => !dbNames.has(name));
      const missingActivities = [...expectedKeys].filter((key) => !dbKeys.has(key));
      const extraPersons = [...dbNames].filter((name) => !expectedNames.has(name));
      const extraActivities = [...dbKeys].filter((key) => !expectedKeys.has(key));
      const ok = missingPersons.length === 0 && missingActivities.length === 0 && extraPersons.length === 0 && extraActivities.length === 0;

      box.dataset.state = ok ? "ok" : "error";
      title.textContent = ok ? "실시간 DB 정상" : "실시간 DB 확인 필요";
      detail.textContent = ok
        ? `${dbNames.size}명 · ${dbKeys.size}활동 · GitHub 일치`
        : `${dbNames.size}명 · ${dbKeys.size}활동 · 누락 ${missingPersons.length + missingActivities.length} · 추가 ${extraPersons.length + extraActivities.length}`;

      if (!realtimeChannel) {
        realtimeChannel = db.channel("atlas-person-politics-live-summary-v3")
          .on("postgres_changes", { event: "*", schema: "public", table: "person_politics" }, () => {
            clearTimeout(realtimeTimer);
            realtimeTimer = setTimeout(() => verifySummary("realtime"), 900);
          })
          .subscribe();
      }
    } catch (error) {
      if (serial !== requestSerial) return;
      console.error("ATLAS live summary failed", error);
      box.dataset.state = "error";
      title.textContent = "실시간 상태 확인 실패";
      detail.textContent = error?.message || "관리자 페이지에서 상세 검증을 실행하세요.";
    } finally {
      if (serial === requestSerial && refreshButton) refreshButton.disabled = false;
    }
  }

  function start() { addAdminLinks(); buildSummary(); verifySummary("initial"); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
