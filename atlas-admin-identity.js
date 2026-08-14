(() => {
  "use strict";

  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = "./atlas-admin-identity.css?v=20260811-maintenance-m1";
  document.head.appendChild(style);

  const endpoint = "/api/atlas-identity";
  const authoringEndpoint = "/api/atlas-authoring";
  const result = document.getElementById("identityResult");

  function value(id) { return String(document.getElementById(id)?.value || "").normalize("NFC").trim().replace(/\s+/g, " "); }
  function checked(id) { return document.getElementById(id)?.checked === true; }
  function setResult(message, type = "info") { if (!result) return; result.textContent = message; result.dataset.type = type; }

  async function submit(operation, payload, button) {
    if (button) button.disabled = true;
    setResult("저장 중...");
    try {
      const response = await fetch(endpoint, { method:"POST", credentials:"same-origin", cache:"no-store", headers:{"content-type":"application/json",accept:"application/json"}, body:JSON.stringify({operation,payload}) });
      let body=null; try { body=await response.json(); } catch { body=null; }
      if (!response.ok || body?.ok !== true || body?.outcome?.committed !== true) throw new Error(body?.error || `identity mutation failed (${response.status})`);
      const outcome=body.outcome; const key=outcome.canonical_key || outcome.code || "";
      setResult([`${outcome.entity} 저장 완료${outcome.replay ? " (동일 요청 재사용)" : ""}`,`UUID: ${outcome.id}`,key ? `Key: ${key}` : ""].filter(Boolean).join("\n"),"success");
    } catch (error) { setResult(error.message || String(error),"error"); }
    finally { if (button) button.disabled=false; }
  }

  document.getElementById("createPersonForm")?.addEventListener("submit",event=>{event.preventDefault();submit("create_person",{canonical_name_en:value("personCanonicalNameEn"),display_name_ko:value("personDisplayNameKo"),canonical_key:value("personCanonicalKey")||null,person_type:value("personType")||"historical",historicity:value("personHistoricity")||"historical",allow_display_name_collision:checked("personAllowKoCollision")},event.submitter);});
  document.getElementById("createPolityForm")?.addEventListener("submit",event=>{event.preventDefault();submit("create_polity",{canonical_name_en:value("polityCanonicalNameEn"),display_name_ko:value("polityDisplayNameKo"),canonical_key:value("polityCanonicalKey")||null,polity_type:value("polityType")||"historical_polity",historicity:value("polityHistoricity")||"historical",allow_display_name_collision:checked("polityAllowKoCollision")},event.submitter);});
  document.getElementById("createRoleForm")?.addEventListener("submit",event=>{event.preventDefault();submit("create_role",{code:value("roleCode"),source_label:value("roleSourceLabel"),display_name_ko:value("roleDisplayNameKo"),category:value("roleCategory")},event.submitter);});

  function insertHumanAuthoringPanel() {
    const identityTitle=document.getElementById("identity-title");
    const identityPanel=identityTitle?.closest(".panel");
    if (!identityPanel || document.getElementById("humanAuthoringForm")) return;
    const panel=document.createElement("section");
    panel.className="panel";
    panel.setAttribute("aria-labelledby","human-authoring-title");
    panel.innerHTML=`
      <div class="panel-head"><div><p class="status-label">NORMAL AUTHORING · STAGE 2 NATIVE</p><h2 id="human-authoring-title">일반 신규 인물 등록</h2><p>UUID나 JSON을 입력하지 않습니다. 기존 Person·Polity·Role은 정확히 재사용하고, 없으면 같은 트랜잭션 안에서 생성한 뒤 Relation·기간·Source provenance를 Stage 2 semantic-key v2로 저장합니다.</p></div></div>
      <form id="humanAuthoringForm" class="identity-form">
        <div class="identity-two"><label>인물 영문명<input id="humanPersonEn" required /></label><label>인물 한국어명<input id="humanPersonKo" required /></label></div>
        <div class="identity-two"><label>정치체 영문명<input id="humanPolityEn" required /></label><label>정치체 한국어명<input id="humanPolityKo" required /></label></div>
        <div class="identity-two"><label>관계<select id="humanRelation" required><option value="">선택</option><option value="rules">rules · 통치</option><option value="governs">governs · 정부권한</option><option value="serves">serves · 공직/군직 복무</option><option value="active_in">active_in · 해당 정치체에서 활동</option><option value="opposes">opposes · 해당 정치체에 저항</option><option value="claims_rule">claims_rule · 통치권 주장</option></select></label><label>Period basis<select id="humanPeriodBasis" required><option value="">불러오는 중...</option></select></label></div>
        <div class="identity-two"><label>Role 영문명 <small>역할이 없으면 비움</small><input id="humanRoleEn" placeholder="예: Sultan" /></label><label>Role 한국어명 <small>새 Role일 때 사용</small><input id="humanRoleKo" placeholder="예: 술탄" /></label></div>
        <div class="identity-two"><label>시작 연도<input id="humanStartYear" type="number" required /></label><label>종료 연도<input id="humanEndYear" type="number" required /></label></div>
        <div class="identity-two"><label>날짜 확실성<select id="humanCertainty" required><option value="exact">exact</option><option value="approximate">approximate</option><option value="uncertain">uncertain</option></select></label><label>근거 신뢰도<select id="humanConfidence" required><option value="well_established">Well established</option><option value="likely">Likely</option><option value="speculative">Speculative</option><option value="disputed">Disputed</option><option value="unknown">Unknown</option></select></label></div>
        <label>출처 제목<input id="humanSourceTitle" required /></label><label>출처 URL<input id="humanSourceUrl" type="url" required /></label><label>인용/근거 메모 <small>비우면 출처 제목을 사용</small><input id="humanSourceCitation" /></label><label>활동 메모<textarea id="humanNotes" rows="3"></textarea></label>
        <button class="button primary" type="submit">Person + Activity + Source 한 번에 등록</button>
      </form><pre id="humanAuthoringResult" class="result" aria-live="polite">카탈로그를 불러오는 중...</pre>`;
    identityPanel.parentNode.insertBefore(panel,identityPanel);
  }

  async function loadHumanCatalogs() {
    const output=document.getElementById("humanAuthoringResult"); const select=document.getElementById("humanPeriodBasis"); if(!output||!select)return;
    try {
      const response=await fetch(authoringEndpoint,{method:"GET",credentials:"same-origin",cache:"no-store",headers:{accept:"application/json"}}); const body=await response.json();
      if(!response.ok||body?.ok!==true||body?.ready!==true)throw new Error(body?.code||`catalog load failed (${response.status})`);
      select.innerHTML='<option value="">선택</option>'; for(const code of body.catalogs?.period_bases||[]){const option=document.createElement("option");option.value=code;option.textContent=code;select.appendChild(option);} if([...select.options].some(option=>option.value==="reign"))select.value="reign"; output.textContent="일반 신규등록 준비됨";
    } catch(error){output.textContent=`카탈로그 로드 실패: ${error.message}`;output.dataset.type="error";}
  }

  let humanRequestId=null;
  function requestId(){if(!humanRequestId)humanRequestId=`admin:${crypto.randomUUID()}`;return humanRequestId;}
  async function submitHumanAuthoring(event){
    event.preventDefault(); const button=event.submitter; const output=document.getElementById("humanAuthoringResult"); if(button)button.disabled=true; if(output){output.textContent="Person · Polity · Role · Source · Activity를 하나의 트랜잭션으로 저장 중...";output.dataset.type="info";}
    const certainty=value("humanCertainty");
    const payload={schema:"atlas-human-authoring/v1",request_id:requestId(),person:{canonical_name_en:value("humanPersonEn"),display_name_ko:value("humanPersonKo")},polity:{canonical_name_en:value("humanPolityEn"),display_name_ko:value("humanPolityKo")},activity:{relation_type:value("humanRelation"),period_basis:value("humanPeriodBasis"),role:value("humanRoleEn")||null,role_display_name_ko:value("humanRoleKo")||null,start_year:Number(value("humanStartYear")),end_year:Number(value("humanEndYear")),start_certainty:certainty,end_certainty:certainty,confidence:value("humanConfidence"),chronology_status:"reviewed",notes:value("humanNotes")||null},sources:[{title:value("humanSourceTitle"),canonical_url:value("humanSourceUrl"),citation_text:value("humanSourceCitation")||null,source_type:"web_bibliographic_reference"}]};
    try{if(payload.activity.start_year===0||payload.activity.end_year===0)throw new Error("역사 연도 0은 사용할 수 없습니다.");const response=await fetch(authoringEndpoint,{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify(payload)});let body=null;try{body=await response.json();}catch{body=null;}if(!response.ok||body?.ok!==true||body?.committed!==true)throw new Error(body?.code||`authoring failed (${response.status})`);if(output){output.textContent=[`등록 완료${body.replay?" (동일 요청 재검증)":""}`,`Person UUID: ${body.person_id}`,`Polity UUID: ${body.polity_id}`,body.role_id?`Role UUID: ${body.role_id}`:"Role: 없음",`Activity UUID: ${body.relationship_id}`,`Source UUID: ${(body.source_ids||[]).join(", ")}`].join("\n");output.dataset.type="success";}humanRequestId=null;}catch(error){if(output){output.textContent=error.message||String(error);output.dataset.type="error";}}finally{if(button)button.disabled=false;}
  }

  insertHumanAuthoringPanel();
  document.getElementById("humanAuthoringForm")?.addEventListener("submit",submitHumanAuthoring);
  loadHumanCatalogs();
})();
