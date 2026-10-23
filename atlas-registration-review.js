(() => {
  "use strict";

  const dataStore=window.ATLAS_CLIENT_DATA_STORE;
  const QUEUE_REVIEW_LABELS=Object.freeze({
    PENDING:"검토 대기",IN_REVIEW:"검토 중",APPROVED:"승인됨",
    HOLD:"보류",REJECTED:"반려",DUPLICATE_EXISTING:"기등록 인물과 중복"
  });
  const QUEUE_ORIGIN_LABELS=Object.freeze({ reviewed_intake:"검토를 거쳐 접수" });
  function queueDomainLabel(value) {
    const code=String(value ?? "").trim();
    return !code ? "미분류" : (window.ATLAS_PERSON_DOMAIN_REGISTRY?.LABELS?.[code] || "분야 확인 필요");
  }
  function queuePriorityLabel(value) {
    const code=String(value ?? "").trim().toUpperCase();
    return !code ? "등급 미기록" : (["SSS","SS","S","A","B","C"].includes(code) ? code : "등급 확인 필요");
  }
  function queueReviewStateLabel(value) {
    const code=String(value ?? "").trim().toUpperCase();
    return !code ? "검토 상태 미기록" : (QUEUE_REVIEW_LABELS[code] || "검토 상태 확인 필요");
  }
  function queueOriginLabel(value) {
    const code=String(value ?? "").trim();
    return !code ? "출처 미기록" : (QUEUE_ORIGIN_LABELS[code] || "출처 확인 필요");
  }

  const QUEUE_URL="/api/atlas-read?__atlas_read_surface=registration-queue";
  const REFRESH_INTERVAL_MS=10000;
  let activeRoot=null;
  let refreshTimer=null;
  let requestSerial=0;
  let focusListenerRegistered=false;
  let queueRows=[];
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function number(value) {
    const numeric=Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString("ko-KR") : "—";
  }

  function dateTime(value) {
    if (!value) return "갱신시각 미상";
    const date=new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ko-KR");
  }

  async function getJson(url) {
    const response=await fetch(url,{ method:"GET",credentials:"same-origin",cache:"no-store",headers:{ accept:"application/json" } });
    let payload=null;
    try { payload=await response.json(); } catch {}
    if (!response.ok || payload?.ok !== true) throw new Error(payload?.code || payload?.error || `HTTP ${response.status}`);
    return payload;
  }

  function statCard(value,label,detail="") {
    return `<article class="registration-review-stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</article>`;
  }

  function registeredStats(payload) {
    const persons=Array.isArray(payload?.persons) ? payload.persons : [];
    const total=Number(payload?.summary?.total ?? persons.length);
    const historical=persons.filter((person)=>person?.historicity === "historical").length;
    const activities=persons.reduce((sum,person)=>sum+Number(person?.activity_count || 0),0);
    const nonTimeline=persons.filter((person)=>{
      const disposition=String(person?.timeline_disposition?.disposition || "").trim();
      return disposition && disposition !== "timeline";
    }).length;
    return { total,historical,activities,nonTimeline };
  }

  function renderRegistered(payload, queuePayload) {
    const host=activeRoot?.querySelector("#registrationRegisteredStats");
    if (!host) return;
    const stats=registeredStats(payload);
    const pending=queuePayload?.summary?.pending_count;
    host.innerHTML=[
      statCard(number(stats.total),"기등록 인물"),
      statCard(number(stats.historical),"역사적 실존"),
      statCard(number(stats.activities),"원본 등록 활동"),
      statCard(number(stats.nonTimeline),"비연대표 인물"),
      statCard(number(pending),"등록대기열","현재 미등록 후보")
    ].join("");
  }

  function renderQueue(payload) {
    queueRows=Array.isArray(payload?.candidates) ? payload.candidates : [];
    renderQueueTable();
  }

  function renderQueueTable() {
    const body=activeRoot?.querySelector("#registrationQueueBody");
    if (!body) return;
    const needle=String(activeRoot?.querySelector("#registrationQueueSearch")?.value || "").trim().toLocaleLowerCase("ko");
    const rows=needle
      ? queueRows.filter((row)=>[
          row?.name,row?.representative_domain,queueDomainLabel(row?.representative_domain),
          row?.priority,queuePriorityLabel(row?.legacy_priority || row?.priority),
          row?.review_state,queueReviewStateLabel(row?.review_state),row?.origin,queueOriginLabel(row?.origin),row?.candidate_id
        ].some((value)=>String(value || "").toLocaleLowerCase("ko").includes(needle)))
      : queueRows;
    if (!rows.length) {
      body.innerHTML='<tr><td colspan="6" class="registration-review-empty">표시할 등록대기 후보가 없습니다.</td></tr>';
      return;
    }
    body.innerHTML=rows.map((row)=>`<tr>
      <td class="registration-review-name" data-label="이름">${escapeHtml(row.name || "—")}</td>
      <td data-label="대표 분야">${escapeHtml(queueDomainLabel(row.representative_domain))}</td>
      <td data-label="우선순위">${escapeHtml(queuePriorityLabel(row.legacy_priority || row.priority))}</td>
      <td data-label="검토 상태">${escapeHtml(queueReviewStateLabel(row.review_state))}</td>
      <td data-label="출처">${escapeHtml(queueOriginLabel(row.origin))}</td>
      <td data-label="갱신"><time>${escapeHtml(row.updated_at ? dateTime(row.updated_at) : "—")}</time></td>
    </tr>`).join("");
  }

  function setStatus(message,state="idle") {
    const status=activeRoot?.querySelector("#registrationReviewStatus");
    if (!status) return;
    status.textContent=message;
    status.dataset.state=state;
  }

  async function refresh({ forcePersons=true }={}) {
    const root=activeRoot;
    if (!root?.isConnected) return;
    const serial=++requestSerial;
    const refreshButton=root.querySelector("#registrationReviewRefresh");
    if (refreshButton) refreshButton.disabled=true;
    setStatus("등록 현황을 불러오는 중","loading");
    try {
      if (!dataStore?.loadPersons) throw new Error("인물 조회 기능을 사용할 수 없습니다");
      const [persons,queue]=await Promise.all([
        dataStore.loadPersons({force:forcePersons}),
        getJson(QUEUE_URL)
      ]);
      if (serial !== requestSerial || root !== activeRoot) return;
      renderRegistered(persons,queue);
      renderQueue(queue);
      setStatus(`DB 최신 스냅샷 조회 · ${new Date().toLocaleTimeString("ko-KR")}`,"ready");
    } catch(error) {
      if (serial !== requestSerial || root !== activeRoot) return;
      console.error("ATLAS registration review refresh failed",error);
      setStatus("갱신 실패 · 데이터를 불러오지 못했습니다. 다시 시도해 주세요.","error");
    } finally {
      if (serial===requestSerial && refreshButton) refreshButton.disabled=false;
    }
  }

  function template() {
    return `<section class="registration-review">
      <section class="registration-review-section">
        <div class="registration-review-section-head registration-review-overview-head">
          <div><small>등록 현황</small><h3>등록 현황</h3></div>
          <div class="registration-review-head-actions"><span id="registrationReviewStatus" data-state="loading">불러오는 중</span><button id="registrationReviewRefresh" class="btn" type="button">새로고침</button></div>
        </div>
        <div id="registrationRegisteredStats" class="registration-review-stats">${statCard("—","기등록 인물")}${statCard("—","역사적 실존")}${statCard("—","원본 등록 활동")}${statCard("—","비연대표 인물")}${statCard("—","등록대기열","현재 미등록 후보")}</div>
      </section>
      <section class="registration-review-section">
        <div class="registration-review-section-head registration-review-queue-head">
          <div><small>등록 대기열</small><h3>등록대기열</h3></div>
          <label>검색<input id="registrationQueueSearch" type="search" placeholder="이름 · 분야 · 상태" /></label>
        </div>
        <div class="registration-review-table-wrap registration-review-queue-wrap">
          <table class="registration-review-table registration-review-queue-table">
            <thead><tr><th>이름</th><th>대표 분야</th><th>기존 등급</th><th>검토 상태</th><th>출처</th><th>갱신</th></tr></thead>
            <tbody id="registrationQueueBody"><tr><td colspan="6" class="registration-review-empty">불러오는 중</td></tr></tbody>
          </table>
        </div>
      </section>
    </section>`;
  }

  function mount(root) {
    if (!root) return;
    activeRoot=root;
    if (refreshTimer) clearInterval(refreshTimer);
    root.innerHTML=template();
    root.querySelector("#registrationReviewRefresh")?.addEventListener("click",()=>refresh({forcePersons:true}));
    root.querySelector("#registrationQueueSearch")?.addEventListener("input",renderQueueTable);
    refresh({forcePersons:true});
    if (!focusListenerRegistered) {
      window.addEventListener("focus",()=>refresh({ forcePersons:true }),{passive:true});
      focusListenerRegistered=true;
    }
    refreshTimer=setInterval(()=>{
      if (!activeRoot?.isConnected) {
        clearInterval(refreshTimer);
        refreshTimer=null;
        return;
      }
      if (activeRoot.querySelector("#registrationReviewStatus")?.dataset.state==="loading") return;
      refresh({forcePersons:true});
    },REFRESH_INTERVAL_MS);
  }

  window.ATLAS_REGISTRATION_REVIEW=Object.freeze({mount,refresh:()=>refresh({forcePersons:true})});
})();
