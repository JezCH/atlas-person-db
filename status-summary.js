(() => {
  "use strict";

  const dataStore = window.ATLAS_CLIENT_DATA_STORE;

  const style = document.createElement("style");
  style.textContent = `
    .admin-nav-link{display:grid;grid-template-columns:22px 1fr auto;text-decoration:none;color:#aeb9cb;border-radius:9px;padding:11px 12px;font-weight:700}
    .admin-nav-link:hover{color:#fff;background:#6572e83d}
    .mobile-admin-link{display:flex;align-items:center;gap:10px;text-decoration:none;color:#e9eef7;padding:12px;border-radius:10px;font-weight:800}
    .mobile-admin-link:hover{background:#6572e83d}
    .registration-summary{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 12px;margin-bottom:12px;border-color:#30373c;background:#15191c;color:#d8d2c5;box-shadow:inset 0 1px 0 rgba(255,255,255,.018)}
    .registration-summary-main{display:flex;align-items:center;gap:12px;min-width:0}
    .registration-summary-dot{width:9px;height:9px;border-radius:999px;flex:0 0 auto;background:#d3a84a;box-shadow:0 0 0 4px rgba(211,168,74,.13)}
    .registration-summary[data-state="ok"] .registration-summary-dot{background:#4ea36d;box-shadow:0 0 0 4px rgba(78,163,109,.13)}
    .registration-summary[data-state="error"] .registration-summary-dot{background:#c95a5a;box-shadow:0 0 0 4px rgba(201,90,90,.13)}
    .registration-summary-title{color:#d8d2c5;font-weight:850;font-size:13px;letter-spacing:.01em}
    .registration-summary-detail{margin-top:3px;color:#7f888d;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .registration-summary-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
    .registration-summary-link{border:1px solid #394147;border-radius:6px;padding:7px 10px;background:#171c20;color:#cfc8b8;text-decoration:none;font-size:11px;font-weight:800}
    .registration-summary-link:hover{border-color:#6f6652;background:#1b2024;color:#f0ece4}
    .registration-summary-link:focus-visible{outline:1px solid rgba(208,188,145,.62);outline-offset:2px}
    .registration-summary-link:disabled{opacity:.55;cursor:wait}
    @media(max-width:760px){
      .admin-nav-link{display:none}
      .registration-summary{width:100%;max-width:100%;min-width:0;align-items:center;gap:5px;min-height:28px;padding:3px 5px;margin-bottom:3px;border-radius:8px}
      .registration-summary[data-state="ok"]{display:none}
      .registration-summary-main{flex:1 1 auto;min-width:0;align-items:center;gap:6px;overflow:hidden}
      .registration-summary-main>div{display:block;min-width:0;width:100%}
      .registration-summary-dot{width:6px;height:6px;box-shadow:0 0 0 2px #fff3d6}
      .registration-summary[data-state="ok"] .registration-summary-dot{box-shadow:0 0 0 2px #e7f6ed}
      .registration-summary[data-state="error"] .registration-summary-dot{box-shadow:0 0 0 2px #fde9eb}
      .registration-summary-title{overflow:hidden;font-size:10px;line-height:1.1;white-space:nowrap;text-overflow:ellipsis}
      .registration-summary-detail{display:none}
      .registration-summary-actions{flex:0 0 auto;flex-direction:row;gap:2px}
      .registration-summary-link{display:grid;place-items:center;width:27px;height:27px;padding:0;border-radius:6px;font-size:0;text-align:center}
      #registrationSummaryRefresh::before{content:"↻";font-size:14px}
      .registration-summary-actions a::before{content:"⚙";font-size:12px}
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
    const toolbar = document.querySelector("#personMainView .person-main-toolbar");
    if (!toolbar || document.getElementById("registrationSummary")) return null;
    const section = document.createElement("section");
    section.id = "registrationSummary";
    section.className = "registration-summary card";
    section.dataset.state = "loading";
    section.innerHTML = `<div class="registration-summary-main"><span class="registration-summary-dot" aria-hidden="true"></span><div><div id="registrationSummaryTitle" class="registration-summary-title">Normalized V2 상태 확인 중</div><div id="registrationSummaryDetail" class="registration-summary-detail">서버 direct read API로 현재 활동 데이터를 확인하고 있습니다.</div></div></div><div class="registration-summary-actions"><button id="registrationSummaryRefresh" class="registration-summary-link" type="button" aria-label="V2 DB 상태 다시 확인">다시 확인</button><a class="registration-summary-link" href="./admin.html" aria-label="관리자 페이지">관리자 페이지</a></div>`;
    toolbar.insertAdjacentElement("afterend", section);
    section.querySelector("#registrationSummaryRefresh").addEventListener("click", () => verifySummary({ force:true }));
    return section;
  }

  let requestSerial = 0;

  async function verifySummary({ force = false } = {}) {
    const serial = ++requestSerial;
    const box = document.getElementById("registrationSummary") || buildSummary();
    if (!box) return;
    const title = document.getElementById("registrationSummaryTitle");
    const detail = document.getElementById("registrationSummaryDetail");
    const refreshButton = document.getElementById("registrationSummaryRefresh");
    if (refreshButton) refreshButton.disabled = true;
    box.dataset.state = "loading";
    title.textContent = "Normalized V2 상태 확인 중";
    detail.textContent = "shared Person Runtime 기준 원본에서 현재 활동 레코드를 확인하고 있습니다.";

    try {
      if (!dataStore?.loadPersons) throw new Error("shared Person Runtime store를 찾지 못했습니다.");
      const result = await dataStore.loadPersons({ force });
      if (serial !== requestSerial) return;
      const persons = Array.isArray(result?.persons) ? result.persons : [];
      const activityCount = persons.reduce((sum, person) => sum + Number(person?.activity_count || 0), 0);
      box.dataset.state = "ok";
      title.textContent = "Person Runtime 정상";
      detail.textContent = `${activityCount}개 활동 레코드 · shared Person Runtime 연결됨`;
    } catch (error) {
      if (serial !== requestSerial) return;
      console.error("ATLAS normalized V2 summary failed", error);
      box.dataset.state = "error";
      title.textContent = "V2 DB 확인 실패";
      detail.textContent = error?.message || "shared Person Runtime 기준 원본을 확인하세요.";
    } finally {
      if (serial === requestSerial && refreshButton) refreshButton.disabled = false;
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
