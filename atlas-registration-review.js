(() => {
  "use strict";

  const dataStore=window.ATLAS_CLIENT_DATA_STORE;
  const QUEUE_URL="/api/atlas-read?__atlas_read_surface=registration-queue";
  const SIGNAL_URL="/api/atlas-read?__atlas_read_surface=youtube-person-signals";
  const REFRESH_INTERVAL_MS=10000;
  let activeRoot=null;
  let refreshTimer=null;
  let requestSerial=0;
  let minChannels=3;
  let queueRows=[];
  let signalRows=[];

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

  function renderSignals(payload) {
    signalRows=Array.isArray(payload?.rows) ? payload.rows : [];
    const snapshot=payload?.snapshot || null;
    const telemetry=activeRoot?.querySelector("#youtubeSignalTelemetry");
    if (telemetry) {
      const progress=payload?.progress || null;
      const segment=payload?.segment_snapshot || null;
      if (progress) {
        const lower=number(progress.unique_channel_lower_bound);
        const upper=number(progress.unique_channel_upper_bound);
        const exact=progress.exact_unique_channel_count == null ? null : number(progress.exact_unique_channel_count);
        const uniqueText=exact
          ? `전체 unique ${exact}채널`
          : `전체 unique ${lower}–${upper}채널 범위`;
        telemetry.innerHTML=`<strong>누적 처리 ${number(progress.gross_success_channel_rows)} 성공 채널행 · ${number(progress.gross_video_rows)} 영상행</strong><span>batch001–007 global ${number(progress.baseline_unique_channel_count)}채널/${number(progress.baseline_video_count)}영상 + batch008–011 segment ${number(progress.supplemental_success_channel_count)}성공/${number(progress.supplemental_selected_channel_count)}선정 · ${uniqueText} · baseline Channel ID 미보존으로 cross-dedupe 미완료 · 다음 ${escapeHtml(progress.next_batch || "미정")}</span>`;
      } else if (snapshot) {
        telemetry.innerHTML=`<strong>${number(snapshot.channel_count)}개 채널 · ${number(snapshot.video_count)}개 영상</strong><span>스냅샷 ${escapeHtml(dateTime(snapshot.generated_at))} · ${escapeHtml(snapshot.parser_version || "parser 미상")}</span>`;
      } else {
        telemetry.innerHTML="<strong>아직 YouTube 신호 데이터가 없습니다.</strong>";
      }
      if (snapshot && segment && progress) {
        telemetry.innerHTML += `<span>신호표 기준: global ${number(snapshot.channel_count)}채널 snapshot · 별도 segment snapshot ${number(segment.channel_count)}채널은 총량으로 대체하지 않음</span>`;
      }
    }
    const count=activeRoot?.querySelector("#youtubeSignalVisibleCount");
    const bounded=payload?.ranking_scope==="cross_segment_bounds";
    if (count) count.textContent=`${bounded ? "기준선 전체" : "전체"} ${number(payload?.available_count || 0)}명 · 상세 ${number(payload?.stored_count ?? signalRows.length)}행 저장${bounded ? " (양 구간 결합)" : ""} · 현재 ${number(signalRows.length)}행 표시`;
    renderSignalThresholds(snapshot);
    const body=activeRoot?.querySelector("#youtubeSignalBody");
    if (!body) return;
    if (!signalRows.length) {
      body.innerHTML='<tr><td colspan="4" class="registration-review-empty">현재 조건의 반복 인물 신호가 없습니다.</td></tr>';
      return;
    }
    const maxChannels=Math.max(1,...signalRows.map((row)=>Number(row?.distinct_channel_count || 0)));
    const scoped=(lower,high)=>Number(high)>Number(lower) ? `${number(lower)}–${number(high)}` : number(lower);
    body.innerHTML=signalRows.map((row)=>{
      const channels=Math.max(0,Number(row?.distinct_channel_count || 0));
      const strength=Math.max(0,Math.min(100,(channels/maxChannels)*100));
      const upper=Number(row?.channel_count_upper_bound ?? channels);
      const channelText=upper>channels ? `${number(channels)}–${number(upper)}` : number(channels);
      const scopeDetail=bounded ? `<small class="registration-review-scope-detail">기존 ${scoped(row.baseline_channel_count,row.baseline_channel_upper_bound)} · 추가 ${scoped(row.supplemental_channel_count,row.supplemental_channel_upper_bound)}</small>` : "";
      return `<tr class="registration-review-signal-row" style="--signal-strength:${strength.toFixed(2)}%">
        <td class="registration-review-rank" data-label="순위">${number(row.rank)}</td>
        <td class="registration-review-name" data-label="인물">${escapeHtml(row.raw_name)}${scopeDetail}</td>
        <td class="registration-review-number" data-label="채널">${channelText}</td>
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
        getJson(`${SIGNAL_URL}&min_channels=${encodeURIComponent(minChannels)}&limit=300`)
      ]);
      if (serial !== requestSerial || root !== activeRoot) return;
      renderRegistered(persons,queue);
      renderQueue(queue);
      renderSignals(signals);
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
      const signals=await getJson(`${SIGNAL_URL}&min_channels=${encodeURIComponent(minChannels)}&limit=300`);
      if (serial !== requestSerial || root !== activeRoot) return;
      renderSignals(signals);
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
          <div><small>YOUTUBE DISCOVERY SIGNAL</small><h3>유튜브 반복 인물 신호</h3><p>서로 다른 채널이 같은 raw 인물명을 단독 주제로 다룬 횟수입니다. 화면은 10초마다 DB를 다시 읽습니다. 현재 수집기는 아직 batch publish 방식이며 live incremental 전환 전입니다. <strong>발굴 신호일 뿐 등록 근거나 역사적 증거가 아닙니다.</strong> batch001–007과 batch008 이후의 인물 신호를 함께 반영합니다. 기존 채널 ID가 없어 중복 제거가 불가능한 경우 <strong>저장된 상세 신호에 한해</strong> 채널 수를 하한–상한 범위로 표시하며, 순위는 하한 기준 잠정 순위입니다. 기존 기준선의 상세 자료는 전체 집계보다 적게 보존되어 있습니다. 영상 수는 구간별 영상행 합계로 중복될 수 있습니다.</p></div>
        </div>
        <div class="registration-review-signal-toolbar">
          <div id="youtubeSignalThresholds" class="registration-review-thresholds" aria-label="최소 채널 수"></div>
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
            <thead><tr><th>순위</th><th>인물 raw 이름</th><th>채널 수 범위</th><th>영상행</th></tr></thead>
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
    root.querySelector("#registrationReviewRefresh")?.addEventListener("click",()=>refresh({ forcePersons:true }));
    root.querySelector("#registrationQueueSearch")?.addEventListener("input",renderQueueTable);
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
      refresh({ forcePersons:true });
    },REFRESH_INTERVAL_MS);
  }

  window.ATLAS_REGISTRATION_REVIEW=Object.freeze({ mount,refresh:()=>refresh({ forcePersons:true }) });
})();
