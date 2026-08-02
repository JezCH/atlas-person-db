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
    @media(max-width:760px){.admin-nav-link{display:none}.registration-summary{align-items:flex-start;padding:12px;margin-bottom:12px}.registration-summary-main{align-items:flex-start}.registration-summary-detail{white-space:normal;line-height:1.45}.registration-summary-actions{flex-direction:column;align-items:stretch}.registration-summary-link{padding:7px 9px;text-align:center}}
  `;
  document.head.appendChild(style);

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
    section.innerHTML = `<div class="registration-summary-main"><span class="registration-summary-dot" aria-hidden="true"></span><div><div id="registrationSummaryTitle" class="registration-summary-title">실시간 DB 상태 확인 중</div><div id="registrationSummaryDetail" class="registration-summary-detail">Supabase의 현재 인물·활동 수를 조회하고 있습니다.</div></div></div><div class="registration-summary-actions"><button id="registrationSummaryRefresh" class="registration-summary-link" type="button">다시 확인</button><a class="registration-summary-link" href="./admin.html">관리자 페이지</a></div>`;
    toolbar.insertAdjacentElement("afterend", section);
    section.querySelector("#registrationSummaryRefresh").addEventListener("click", verifySummary);
    return section;
  }

  const activityKey = (row) => [row.person_name, row.politic_name, Number(row.activity_start), Number(row.activity_end)].join("|").toLowerCase();
  const personSet = (rows) => new Set((rows || []).map((row) => String(row.person_name || "").trim().toLowerCase()).filter(Boolean));

  async function fetchJson(path) {
    const response = await fetch(`${path}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} 불러오기 실패 (${response.status})`);
    return response.json();
  }

  async function verifySummary() {
    const box = document.getElementById("registrationSummary") || buildSummary();
    if (!box) return;
    const title = document.getElementById("registrationSummaryTitle");
    const detail = document.getElementById("registrationSummaryDetail");
    box.dataset.state = "loading";
    title.textContent = "실시간 DB 상태 확인 중";
    detail.textContent = "Supabase의 현재 인물·활동 수를 조회하고 있습니다.";

    try {
      const config = window.ATLAS_CONFIG || {};
      if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) throw new Error("Supabase 설정을 찾지 못했습니다.");

      const [base, supplement1, supplement2, supplement3, nonTimeline] = await Promise.all([
        fetchJson("./pending-records.json"),
        fetchJson("./pending-records-supplement.json"),
        fetchJson("./pending-records-supplement-2.json"),
        fetchJson("./pending-records-supplement-3.json"),
        fetchJson("./non-timeline-persons.json")
      ]);

      const excluded = new Set((nonTimeline || []).map((item) => String(item.person_name || "").trim().toLowerCase()).filter(Boolean));
      const expectedRows = [base, supplement1, supplement2, supplement3]
        .flatMap((rows) => Array.isArray(rows) ? rows : [])
        .filter((row) => !excluded.has(String(row.person_name || "").trim().toLowerCase()));

      const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      const { data: dbRows, error } = await db.from("person_politics").select("person_name,politic_name,activity_start,activity_end");
      if (error) throw error;

      const expectedNames = personSet(expectedRows);
      const expectedKeys = new Set(expectedRows.map(activityKey));
      const dbNames = personSet(dbRows);
      const dbKeys = new Set((dbRows || []).map(activityKey));
      const missingPersons = [...expectedNames].filter((name) => !dbNames.has(name));
      const missingActivities = [...expectedKeys].filter((key) => !dbKeys.has(key));
      const extraPersons = [...dbNames].filter((name) => !expectedNames.has(name) && !excluded.has(name));
      const ok = missingPersons.length === 0 && missingActivities.length === 0;

      box.dataset.state = ok ? "ok" : "error";
      title.textContent = ok ? "실시간 DB 정상" : "실시간 DB 확인 필요";
      detail.textContent = ok
        ? `현재 DB 인물 ${dbNames.size}명 · 활동 ${dbRows.length}개 · GitHub 기준 ${expectedNames.size}명/${expectedKeys.size}개 · 추가 DB 인물 ${extraPersons.length}명`
        : `현재 DB 인물 ${dbNames.size}명 · 활동 ${dbRows.length}개 · 누락 인물 ${missingPersons.length}명 · 누락 활동 ${missingActivities.length}개`;
    } catch (error) {
      console.error("ATLAS live summary failed", error);
      box.dataset.state = "error";
      title.textContent = "실시간 상태 확인 실패";
      detail.textContent = error?.message || "관리자 페이지에서 상세 검증을 실행하세요.";
    }
  }

  function start() { addAdminLinks(); buildSummary(); verifySummary(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
