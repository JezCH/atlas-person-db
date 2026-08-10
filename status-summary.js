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
      .registration-summary{align-items:center;gap:6px;min-height:34px;padding:5px 6px;margin-bottom:6px;border-radius:9px}
      .registration-summary-main{align-items:center;gap:7px;overflow:hidden}
      .registration-summary-main>div{display:flex;align-items:center;gap:7px;min-width:0}
      .registration-summary-dot{width:7px;height:7px;box-shadow:0 0 0 2px #fff3d6}
      .registration-summary[data-state="ok"] .registration-summary-dot{box-shadow:0 0 0 2px #e7f6ed}
      .registration-summary[data-state="error"] .registration-summary-dot{box-shadow:0 0 0 2px #fde9eb}
      .registration-summary-title{font-size:11px;line-height:1.1;white-space:nowrap}
      .registration-summary-detail{margin:0;font-size:9px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100vw - 196px)}
      .registration-summary-actions{flex-direction:row;gap:3px}
      .registration-summary-link{display:grid;place-items:center;width:30px;height:30px;padding:0;border-radius:7px;font-size:0;text-align:center}
      #registrationSummaryRefresh::before{content:"↻";font-size:15px}
      .registration-summary-actions a::before{content:"⚙";font-size:13px}
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
    section.innerHTML = `<div class="registration-summary-main"><span class="registration-summary-dot" aria-hidden="true"></span><div><div id="registrationSummaryTitle" class="registration-summary-title">Normalized V2 상태 확인 중</div><div id="registrationSummaryDetail" class="registration-summary-detail">서버 direct read API로 현재 활동 데이터를 확인하고 있습니다.</div></div></div><div class="registration-summary-actions"><button id="registrationSummaryRefresh" class="registration-summary-link" type="button" aria-label="V2 DB 상태 다시 확인">다시 확인</button><a class="registration-summary-link" href="./admin.html" aria-label="관리자 페이지">관리자 페이지</a></div>`;
    toolbar.insertAdjacentElement("afterend", section);
    section.querySelector("#registrationSummaryRefresh").addEventListener("click", verifySummary);
    return section;
  }

  let requestSerial = 0;

  async function verifySummary() {
    const serial = ++requestSerial;
    const box = document.getElementById("registrationSummary") || buildSummary();
    if (!box) return;
    const title = document.getElementById("registrationSummaryTitle");
    const detail = document.getElementById("registrationSummaryDetail");
    const refreshButton = document.getElementById("registrationSummaryRefresh");
    if (refreshButton) refreshButton.disabled = true;
    box.dataset.state = "loading";
    title.textContent = "Normalized V2 상태 확인 중";
    detail.textContent = "서버 direct read API에서 현재 활동 레코드를 조회하고 있습니다.";

    try {
      if (!window.AtlasReader?.loadPersonPolitics) throw new Error("V2 reader 모듈을 찾지 못했습니다.");
      const outcome = await window.AtlasReader.loadPersonPolitics();
      if (serial !== requestSerial) return;
      if (outcome?.error) throw outcome.error;
      const rows = Array.isArray(outcome?.data) ? outcome.data : [];
      box.dataset.state = "ok";
      title.textContent = "Normalized V2 정상";
      detail.textContent = `${rows.length}개 활동 레코드 · server direct read 연결됨`;
    } catch (error) {
      if (serial !== requestSerial) return;
      console.error("ATLAS normalized V2 summary failed", error);
      box.dataset.state = "error";
      title.textContent = "V2 DB 확인 실패";
      detail.textContent = error?.message || "서버 direct read API를 확인하세요.";
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
