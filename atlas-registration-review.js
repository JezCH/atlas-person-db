(() => {
  "use strict";

  const dataStore=window.ATLAS_CLIENT_DATA_STORE;
  const QUEUE_URL="/api/atlas-read?__atlas_read_surface=registration-queue";
  const SIGNAL_URL="/api/atlas-read?__atlas_read_surface=youtube-person-signals";
  const REFRESH_INTERVAL_MS=10000;
  const LIVING_URL="/api/atlas-read?__atlas_read_surface=youtube-person-living";
  let activeRoot=null;
  let refreshTimer=null;
  let requestSerial=0;
  let minChannels=3;
  let excludeRegistered=false;
  let excludeLiving=false;
  const livingEvidence=new Map();
  let livingEvidenceUnavailableUntil=0;
  let queueRows=[];
  let signalRows=[];
  let personIdentityIndex=null;
  let queueIdentityIndex=null;

  // The same exact-identity rule used by the registration queue: do not
  // equate partial names or infer an unregistered Person from an absent alias.
  function identityKey(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .toLowerCase()
      .replaceAll("æ","ae").replaceAll("œ","oe").replaceAll("ß","ss")
      .replace(/[\u0300-\u036f]/g,"")
      .normalize("NFC") // Recompose Korean Hangul after stripping Latin diacritics.
      .replace(/[^a-z0-9가-힣]/g,"");
  }

  function identityIndex(rows, aliases, idField) {
    const index=new Map();
    for (const [position,row] of rows.entries()) {
      const id=String(row?.[idField] ?? position);
      for (const alias of aliases(row)) {
        if (typeof alias!=="string") continue;
        const key=identityKey(alias);
        if (!key) continue;
        if (!index.has(key)) index.set(key,new Set());
        index.get(key).add(id);
      }
    }
    return index;
  }

  function prepareSignalIdentities(personPayload,queuePayload) {
    const persons=Array.isArray(personPayload?.persons) ? personPayload.persons : [];
    personIdentityIndex=identityIndex(persons,person=>[
      person?.canonical_name_en,person?.preferred_name_ko,person?.display_name,
      ...(Array.isArray(person?.names) ? person.names.map(name=>name?.name) : [])
    ],"id");
    // The queue API resolves each reviewed alias to an existing Person UUID.
    // Never mark a raw label registered merely because an alias was listed.
    const validPersonIds=new Set(persons.map(person=>String(person?.id||"")).filter(Boolean));
    for(const alias of queuePayload?.reviewed_person_aliases || []) {
      const id=String(alias?.person_id||"");
      const key=identityKey(alias?.alias_name);
      if(!key||!validPersonIds.has(id)) continue;
      if(!personIdentityIndex.has(key)) personIdentityIndex.set(key,new Set());
      personIdentityIndex.get(key).add(id);
    }
    queueIdentityIndex=identityIndex(queuePayload?.candidates || [],candidate=>{
      const metadata=candidate?.review_metadata || {};
      return [
        ...(typeof candidate?.name==="string" ? candidate.name.split(/\s*[|/]\s*/) : []),
        ...(Array.isArray(metadata.lookup_names) ? metadata.lookup_names : []),
        metadata.display_name_ko
      ];
    },"candidate_id");
  }

  function signalRegistrationBadges(name) {
    if (!personIdentityIndex || !queueIdentityIndex) {
      return '<span class="registration-review-signal-identity" data-status="unknown">등록 대조 중</span>';
    }
    const key=identityKey(name);
    const matches=key ? (personIdentityIndex.get(key)?.size || 0) : 0;
    if (matches>1) return '<span class="registration-review-signal-identity" data-status="ambiguous">동명이인 확인</span>';
    if (matches===1) return '<span class="registration-review-signal-identity" data-status="registered">기등록</span>';
    const pending=key ? (queueIdentityIndex.get(key)?.size || 0) : 0;
    const queueLabel=pending>1 ? "대기열 복수 후보" : pending===1 ? "대기열 등재" : "대기열 미등재";
    return `<span class="registration-review-signal-identity" data-status="unmatched">기등록 일치 없음</span><span class="registration-review-signal-identity" data-status="${pending===1 ? "queued" : pending>1 ? "ambiguous" : "unqueued"}">${queueLabel}</span>`;
  }


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
      statCard(number(stats.total),"기등록 Person"),
      statCard(number(stats.historical),"historical"),
      statCard(number(stats.activities),"Authoring Activity"),
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
          row?.name,row?.representative_domain,row?.priority,row?.review_state,row?.origin,row?.candidate_id
        ].some((value)=>String(value || "").toLocaleLowerCase("ko").includes(needle)))
      : queueRows;
    if (!rows.length) {
      body.innerHTML='<tr><td colspan="6" class="registration-review-empty">표시할 등록대기 후보가 없습니다.</td></tr>';
      return;
    }
    body.innerHTML=rows.map((row)=>`<tr>
      <td class="registration-review-name" data-label="이름">${escapeHtml(row.name || "—")}</td>
      <td data-label="대표 분야">${escapeHtml(row.representative_domain || "미분류")}</td>
      <td data-label="우선순위">${escapeHtml(row.legacy_priority || row.priority || "—")}</td>
      <td data-label="검토 상태">${escapeHtml(row.review_state || "—")}</td>
      <td data-label="출처">${escapeHtml(row.origin || "—")}</td>
      <td data-label="갱신"><time>${escapeHtml(row.updated_at ? dateTime(row.updated_at) : "—")}</time></td>
    </tr>`).join("");
  }

  function renderSignalThresholds(snapshot) {
    const host=activeRoot?.querySelector("#youtubeSignalThresholds");
    if (!host) return;
    const counts=snapshot?.threshold_counts || {};
    host.innerHTML=[3,5,10,15,20].map((threshold)=>{
      const count=counts[String(threshold)] ?? counts[`>=${threshold}`] ?? null;
      return `<button type="button" data-min-channels="${threshold}" class="${threshold===minChannels ? "is-active" : ""}">${threshold}+ 채널${count == null ? "" : ` · ${number(count)}명`}</button>`;
    }).join("");
  }

  function matchesRegistered(name) {
    const key=identityKey(name);
    return Boolean(key && (personIdentityIndex?.get(key)?.size || 0)===1);
  }

  function signalQuery(limit,offset=0) {
    return SIGNAL_URL+"&min_channels="+encodeURIComponent(minChannels)+"&limit="+limit+"&offset="+offset;
  }

  async function ensureLivingEvidence(names) {
    if(Date.now()<livingEvidenceUnavailableUntil) return true;
    const missing=[...new Set(names)].filter(name=>name && (!livingEvidence.has(name)||livingEvidence.get(name).expires_at<=Date.now()));
    let unavailable=false;
    for(let index=0;index<missing.length;index+=25) {
      try {
        const payload=await getJson(LIVING_URL+"&names="+encodeURIComponent(JSON.stringify(missing.slice(index,index+25))));
        if(!Array.isArray(payload.rows)) throw new Error("INVALID_LIVING_EVIDENCE_RESPONSE");
        for(const row of payload.rows) {
          if(typeof row?.name==="string" && ["living_likely","deceased","unknown"].includes(row?.status)) {
            livingEvidence.set(row.name,{status:row.status,expires_at:Date.now()+60*60*1000});
          }
        }
      } catch(error) {
        unavailable=true;
        livingEvidenceUnavailableUntil=Date.now()+60000;
        console.warn("ATLAS living evidence unavailable; leaving unknown people visible",error);
        break;
      }
    }
    return unavailable;
  }

  async function collectVisibleSignals(initial) {
    if(!excludeRegistered && !excludeLiving) return initial;
    const visible=[];
    const pageSize=1000;
    let offset=0;
    let scanned=0;
    let evidenceUnavailable=false;
    let payload=initial;
    for(let page=0;page<11;page++) {
      const rows=Array.isArray(payload.rows) ? payload.rows : [];
      scanned+=rows.length;
      const candidates=rows.filter(row=>!excludeRegistered || !matchesRegistered(row.raw_name));
      for(let i=0;i<candidates.length && visible.length<300;i+=25) {
        const batch=candidates.slice(i,i+25);
        if(excludeLiving && await ensureLivingEvidence(batch.map(row=>row.raw_name))) evidenceUnavailable=true;
        for(const row of batch) {
          if(excludeLiving && livingEvidence.get(row.raw_name)?.status==="living_likely") continue;
          visible.push(row);
          if(visible.length===300) break;
        }
      }
      if(visible.length>=300||rows.length<pageSize||offset+rows.length>=Number(initial.stored_count||initial.available_count||0)) break;
      offset+=rows.length;
      payload=await getJson(signalQuery(pageSize,offset));
    }
    return {...initial,rows:visible,filtered_checked_count:scanned,filter_evidence_unavailable:evidenceUnavailable};
  }

  function filterRequestLimit() { return excludeRegistered||excludeLiving ? 1000 : 300; }

  function renderSignals(payload) {
    signalRows=Array.isArray(payload?.rows) ? payload.rows : [];
    const snapshot=payload?.snapshot || null;
    const telemetry=activeRoot?.querySelector("#youtubeSignalTelemetry");
    if(telemetry) {
      telemetry.innerHTML=snapshot
        ? `<strong>누적 ${number(snapshot.channel_count)}개 채널 · ${number(snapshot.video_count)}개 영상</strong><span>Channel ID 중복 제거 · ${escapeHtml(dateTime(snapshot.generated_at))} · 다음 ${escapeHtml(snapshot.source_state?.next_batch || "수집 대기")}</span>`
        : "<strong>아직 YouTube 수집 데이터가 없습니다.</strong>";
    }
    const count=activeRoot?.querySelector("#youtubeSignalVisibleCount");
    if(count) count.textContent=(excludeRegistered||excludeLiving)
      ? `상위 ${number(payload?.filtered_checked_count ?? signalRows.length)}명 확인 · 조건 일치 ${number(signalRows.length)}명 표시${excludeLiving ? " · 생존 미확인 포함" : ""}${payload?.filter_evidence_unavailable ? " · 생존 조회 실패(제외 불완전)" : ""}`
      : `전체 ${number(payload?.available_count ?? 0)}명 · 현재 ${number(signalRows.length)}명 표시`;
    renderSignalThresholds(snapshot);
    const body=activeRoot?.querySelector("#youtubeSignalBody");
    if(!body) return;
    if(!signalRows.length) {
      body.innerHTML='<tr><td colspan="4" class="registration-review-empty">현재 필터 조건에 맞는 인물이 없습니다.</td></tr>';
      return;
    }
    const maxChannels=Math.max(1,...signalRows.map(row=>Number(row?.distinct_channel_count || 0)));
    body.innerHTML=signalRows.map(row=>{
      const channels=Math.max(0,Number(row?.distinct_channel_count || 0));
      const strength=Math.min(100,(channels/maxChannels)*100);
      return `<tr class="registration-review-signal-row" style="--signal-strength:${strength.toFixed(2)}%">
        <td class="registration-review-rank" data-label="순위">${number(row.rank)}</td>
        <td class="registration-review-name" data-label="인물"><span class="registration-review-signal-raw-name">${escapeHtml(row.raw_name)}</span>${signalRegistrationBadges(row.raw_name)}</td>
        <td class="registration-review-number" data-label="채널">${number(row.distinct_channel_count)}</td>
        <td class="registration-review-number" data-label="영상">${number(row.video_count)}</td>
        <td class="registration-review-signal-bar" aria-hidden="true"><span></span></td>
      </tr>`;
    }).join("");
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
    setStatus("최신 등록·YouTube 신호를 불러오는 중","loading");
    try {
      if (!dataStore?.loadPersons) throw new Error("Person Runtime store unavailable");
      const [persons,queue,signals]=await Promise.all([
        dataStore.loadPersons({ force:forcePersons }),
        getJson(QUEUE_URL),
        getJson(signalQuery(filterRequestLimit()))
      ]);
      if (serial !== requestSerial || root !== activeRoot) return;
      prepareSignalIdentities(persons,queue);
      renderRegistered(persons,queue);
      renderQueue(queue);
      const filtered=await collectVisibleSignals(signals);
      if(serial!==requestSerial||root!==activeRoot) return;
      renderSignals(filtered);
      setStatus(`DB 최신 스냅샷 조회 · ${new Date().toLocaleTimeString("ko-KR")}`,"ready");
    } catch (error) {
      if (serial !== requestSerial || root !== activeRoot) return;
      console.error("ATLAS registration review refresh failed",error);
      setStatus(`갱신 실패 · ${error?.message || error}`,"error");
    } finally {
      if (serial === requestSerial && refreshButton) refreshButton.disabled=false;
    }
  }

  async function refreshSignalsOnly() {
    const root=activeRoot;
    if (!root?.isConnected) return;
    const serial=++requestSerial;
    setStatus("YouTube 신호 조건 갱신 중","loading");
    try {
      const signals=await getJson(signalQuery(filterRequestLimit()));
      if (serial !== requestSerial || root !== activeRoot) return;
      const filtered=await collectVisibleSignals(signals);
      if(serial!==requestSerial||root!==activeRoot) return;
      renderSignals(filtered);
      setStatus(`DB 최신 스냅샷 조회 · ${new Date().toLocaleTimeString("ko-KR")}`,"ready");
    } catch (error) {
      if (serial !== requestSerial || root !== activeRoot) return;
      setStatus(`YouTube 신호 갱신 실패 · ${error?.message || error}`,"error");
    }
  }

  function template() {
    return `<section class="registration-review">
      <section class="registration-review-section">
        <div class="registration-review-section-head registration-review-overview-head">
          <div><small>REGISTRATION</small><h3>등록 현황</h3></div>
          <div class="registration-review-head-actions"><span id="registrationReviewStatus" data-state="loading">불러오는 중</span><button id="registrationReviewRefresh" class="btn" type="button">새로고침</button></div>
        </div>
        <div id="registrationRegisteredStats" class="registration-review-stats">${statCard("—","기등록 Person")}${statCard("—","historical")}${statCard("—","Authoring Activity")}${statCard("—","비연대표 인물")}${statCard("—","등록대기열","현재 미등록 후보")}</div>
      </section>

      <section class="registration-review-section">
        <div class="registration-review-section-head registration-review-signal-head">
          <div><small>YOUTUBE DISCOVERY SIGNAL</small><h3>유튜브 반복 인물 신호</h3><p>수집된 모든 배치는 하나의 Channel ID 기반 누적 데이터로 관리합니다. 각 인물의 채널 수는 중복을 제거한 고유 채널 수입니다. 화면은 10초마다 최신 DB 집계를 확인합니다. 등록 상태는 Person의 이름·별칭과 검증된 동일인 별칭을 현재 등록된 Person ID에 연결해 대조합니다. 일치 없음은 실제 미등록을 확정하지 않습니다. 생존 제외는 Wikidata의 출생·사망 기록을 참고한 추정치이며 미확인 인물은 유지됩니다. <strong>발굴 신호일 뿐 등록 근거나 역사적 증거가 아닙니다.</strong></p></div>
        </div>
        <div class="registration-review-signal-toolbar">
          <div id="youtubeSignalThresholds" class="registration-review-thresholds" aria-label="최소 채널 수"></div>
          <div id="youtubeSignalFilters" class="registration-review-signal-filters" aria-label="유튜브 인물 필터">
            <label><input type="checkbox" id="youtubeExcludeRegistered">기등록 제외</label>
            <label><input type="checkbox" id="youtubeExcludeLiving">생존 추정 인물 제외</label>
          </div>
          <div class="registration-review-signal-meta">
            <div id="youtubeSignalTelemetry" class="registration-review-telemetry"><strong>스냅샷 확인 중</strong></div>
            <span id="youtubeSignalVisibleCount" class="registration-review-signal-visible">—</span>
          </div>
        </div>
        <div class="registration-review-table-wrap registration-review-signal-wrap">
          <table class="registration-review-table registration-review-signal-table">
            <colgroup>
              <col class="registration-review-signal-col-rank" />
              <col class="registration-review-signal-col-name" />
              <col class="registration-review-signal-col-channels" />
              <col class="registration-review-signal-col-videos" />
            </colgroup>
            <thead><tr><th>순위</th><th>인물 raw 이름</th><th>고유 채널</th><th>영상</th></tr></thead>
            <tbody id="youtubeSignalBody"><tr><td colspan="4" class="registration-review-empty">불러오는 중</td></tr></tbody>
          </table>
        </div>
      </section>

      <section class="registration-review-section">
        <div class="registration-review-section-head registration-review-queue-head"><div><small>REGISTRATION QUEUE</small><h3>등록대기열</h3></div><label>검색<input id="registrationQueueSearch" type="search" placeholder="이름 · 분야 · 상태" /></label></div>
        <div class="registration-review-table-wrap registration-review-queue-wrap">
          <table class="registration-review-table registration-review-queue-table">
            <thead><tr><th>이름</th><th>대표 분야</th><th>legacy 우선순위</th><th>검토 상태</th><th>출처</th><th>갱신</th></tr></thead>
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
    root.querySelector("#youtubeExcludeRegistered").checked=excludeRegistered;
    root.querySelector("#youtubeExcludeLiving").checked=excludeLiving;
    root.querySelector("#registrationReviewRefresh")?.addEventListener("click",()=>refresh({ forcePersons:true }));
    root.querySelector("#registrationQueueSearch")?.addEventListener("input",renderQueueTable);
    root.querySelector("#youtubeSignalFilters")?.addEventListener("change",(event)=>{
      if(event.target?.id==="youtubeExcludeRegistered") excludeRegistered=event.target.checked;
      else if(event.target?.id==="youtubeExcludeLiving") excludeLiving=event.target.checked;
      else return;
      if(personIdentityIndex) refreshSignalsOnly();
      else refresh({forcePersons:true});
    });
    root.querySelector("#youtubeSignalThresholds")?.addEventListener("click",(event)=>{
      const button=event.target.closest("[data-min-channels]");
      if (!button) return;
      const next=Number(button.dataset.minChannels);
      if (!Number.isInteger(next) || next < 3 || next === minChannels) return;
      minChannels=next;
      refreshSignalsOnly();
    });
    refresh({ forcePersons:true });
    window.addEventListener("focus",()=>refresh({ forcePersons:true }),{ passive:true });
    refreshTimer=setInterval(()=>{
      if (!activeRoot?.isConnected) {
        clearInterval(refreshTimer);
        refreshTimer=null;
        return;
      }
      // A live evidence request may outlast 10 seconds; never invalidate it
      // with an automatic refresh while the filter is still resolving.
      if (activeRoot.querySelector("#registrationReviewStatus")?.dataset.state==="loading") return;
      refresh({ forcePersons:true });
    },REFRESH_INTERVAL_MS);
  }

  window.ATLAS_REGISTRATION_REVIEW=Object.freeze({ mount,refresh:()=>refresh({ forcePersons:true }) });
})();
