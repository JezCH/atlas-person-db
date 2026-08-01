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
    @media(max-width:760px){
      .admin-nav-link{display:none}
      .registration-summary{align-items:flex-start;padding:12px;margin-bottom:12px}
      .registration-summary-main{align-items:flex-start}
      .registration-summary-detail{white-space:normal;line-height:1.45}
      .registration-summary-actions{flex-direction:column;align-items:stretch}
      .registration-summary-link{padding:7px 9px;text-align:center}
    }
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
    section.innerHTML = `
      <div class="registration-summary-main">
        <span class="registration-summary-dot" aria-hidden="true"></span>
        <div>
          <div id="registrationSummaryTitle" class="registration-summary-title">등록 상태 확인 중</div>
          <div id="registrationSummaryDetail" class="registration-summary-detail">기대 명단, GitHub 기준 데이터, Supabase 실제 데이터를 비교하고 있습니다.</div>
        </div>
      </div>
      <div class="registration-summary-actions">
        <button id="registrationSummaryRefresh" class="registration-summary-link" type="button">다시 확인</button>
        <a class="registration-summary-link" href="./admin.html">관리자 페이지</a>
      </div>`;
    toolbar.insertAdjacentElement("afterend", section);
    section.querySelector("#registrationSummaryRefresh").addEventListener("click", verifySummary);
    return section;
  }

  const personSet = (rows) => new Set((rows || []).map((row) => String(row.person_name || "").trim()).filter(Boolean));
  const activityKey = (row) => [row.person_name, row.politic_name, Number(row.activity_start), Number(row.activity_end)].join("|");

  async function verifySummary() {
    const box = document.getElementById("registrationSummary") || buildSummary();
    if (!box) return;
    const title = document.getElementById("registrationSummaryTitle");
    const detail = document.getElementById("registrationSummaryDetail");
    box.dataset.state = "loading";
    title.textContent = "등록 상태 확인 중";
    detail.textContent = "기대 명단, GitHub 기준 데이터, Supabase 실제 데이터를 비교하고 있습니다.";

    try {
      const [expectedResponse, pendingResponse] = await Promise.all([
        fetch(`./expected-persons.json?v=${Date.now()}`, { cache: "no-store" }),
        fetch(`./pending-records.json?v=${Date.now()}`, { cache: "no-store" })
      ]);
      if (!expectedResponse.ok || !pendingResponse.ok) throw new Error("기준 데이터 파일을 읽지 못했습니다.");

      const expected = await expectedResponse.json();
      const pending = await pendingResponse.json();
      const config = window.ATLAS_CONFIG || {};
      if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) throw new Error("Supabase 설정을 찾지 못했습니다.");

      const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      const { data: dbRows, error } = await db.from("person_politics").select("person_name,politic_name,activity_start,activity_end");
      if (error) throw error;

      const expectedNames = new Set((expected || []).map((item) => typeof item === "string" ? item : item.person_name).filter(Boolean));
      const pendingNames = personSet(pending);
      const dbNames = personSet(dbRows);
      const pendingKeys = new Set((pending || []).map(activityKey));
      const dbKeys = new Set((dbRows || []).map(activityKey));

      const missingPending = [...expectedNames].filter((name) => !pendingNames.has(name));
      const missingDb = [...expectedNames].filter((name) => !dbNames.has(name));
      const missingActivities = [...pendingKeys].filter((key) => !dbKeys.has(key));
      const ok = missingPending.length === 0 && missingDb.length === 0 && missingActivities.length === 0;

      box.dataset.state = ok ? "ok" : "error";
      title.textContent = ok ? "전체 등록 정상" : "등록 누락 확인 필요";
      detail.textContent = ok
        ? `인물 ${expectedNames.size}명 · 활동 ${pendingKeys.size}개가 GitHub와 Supabase에 모두 등록되어 있습니다.`
        : `GitHub 누락 ${missingPending.length}명 · DB 누락 ${missingDb.length}명 · 활동행 누락 ${missingActivities.length}개`;
    } catch (error) {
      console.error("ATLAS public verification failed", error);
      box.dataset.state = "error";
      title.textContent = "등록 상태 확인 실패";
      detail.textContent = error?.message || "관리자 페이지에서 상세 검증을 실행하세요.";
    }
  }

  function start() {
    addAdminLinks();
    buildSummary();
    verifySummary();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
