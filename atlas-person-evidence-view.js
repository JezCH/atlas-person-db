((root,factory)=>{
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.ATLAS_PERSON_EVIDENCE_VIEW=api;
})(typeof globalThis!=="undefined"?globalThis:this,()=>{
  "use strict";

  function text(value){ return value==null?"":String(value).trim(); }

  // Presentation-only labels. Evidence records and Admin retain the canonical enum.
  const EVIDENCE_LABELS=Object.freeze({
    granularity:Object.freeze({year:"연 단위",month:"월 단위",day:"일 단위"}),
    certainty:Object.freeze({exact:"정확",approximate:"근사",uncertain:"불확실"}),
    calendar:Object.freeze({gregorian:"그레고리력",julian:"율리우스력",unspecified_historical:"역법 미특정"}),
    chronology_status:Object.freeze({
      reviewed:"연대 검토됨",
      exact_as_recorded:"기록된 연대 그대로",
      reviewed_traditional_chronology_uncertain:"전통 연대 검토 · 불확실",
      TRADITIONAL_RETROSPECTIVE_UNCERTAIN:"전통적 후대 연대 · 불확실"
    }),
    confidence:Object.freeze({
      well_established:"근거 확립",
      legacy_asserted:"기존 기록에 따른 기재",
      likely:"가능성 높음",
      disputed:"이견 있음",
      reviewed:"검토됨",
      direct_asserted:"직접 명시된 주장"
    })
  });

  function humanEvidenceValue(kind,value){
    const raw=text(value);
    return raw ? (EVIDENCE_LABELS[kind]?.[raw] || raw) : "";
  }

  function boundaryMeta(boundary){
    if(!boundary) return Object.freeze([]);
    const rows=[
      ["granularity",text(boundary.granularity)],
      ["certainty",text(boundary.certainty)],
      ["calendar",text(boundary.calendar)]
    ].filter(([,value])=>value);
    return Object.freeze(rows.map(([key,value])=>Object.freeze({key,value})));
  }

  function evidenceForActivity(activity){
    const sources=Array.isArray(activity?.sources)?activity.sources:[];
    const periodBasis=text(activity?.period_basis?.display_name||activity?.period_basis?.code);
    return Object.freeze({
      source_count:sources.length,
      sources:Object.freeze(sources.slice()),
      period_basis:periodBasis||null,
      chronology_status:text(activity?.chronology_status)||null,
      confidence:text(activity?.confidence)||null,
      start:Object.freeze({
        boundary:activity?.start||null,
        meta:boundaryMeta(activity?.start)
      }),
      end:Object.freeze({
        boundary:activity?.end||null,
        meta:boundaryMeta(activity?.end)
      })
    });
  }

  function createRenderer({escapeHtml,boundaryLabel,sourceListHtml}={}){
    if(typeof escapeHtml!=="function"||typeof boundaryLabel!=="function"||typeof sourceListHtml!=="function"){
      throw new Error("ATLAS_PERSON_EVIDENCE_RENDERER_DEPENDENCY_MISSING");
    }

    const labelForMeta=Object.freeze({
      granularity:"정밀도",
      certainty:"확실성",
      calendar:"달력"
    });

    function rawValue(value,kind){
      const raw=text(value);
      if(!raw)return '<span class="person-evidence-missing">미기록</span>';
      const human=humanEvidenceValue(kind,raw);
      // Unknown or case-specific status codes are not guessed or flattened.
      return human===raw?escapeHtml(raw):`<span title="${escapeHtml(raw)}">${escapeHtml(human)}</span>`;
    }

    function boundaryHtml(label,row){
      const meta=row.meta.map((item)=>`<span><small>${labelForMeta[item.key]||escapeHtml(item.key)}</small><b>${rawValue(item.value,item.key)}</b></span>`).join("");
      return `<div class="person-evidence-boundary"><small>${escapeHtml(label)}</small><strong>${escapeHtml(boundaryLabel(row.boundary))}</strong>${meta?`<div class="person-evidence-boundary-meta">${meta}</div>`:""}</div>`;
    }

    function activityEvidenceHtml(activity){
      const evidence=evidenceForActivity(activity);
      const activityId=escapeHtml(activity?.id||"");
      const sourceLabel=`출처 ${evidence.source_count}건`;
      return `<details class="person-evidence-inspector" data-activity-evidence-id="${activityId}">
        <summary>
          <span><b>근거 보기</b><small>이 활동의 연대·기간·출처 근거</small></span>
          <span class="person-evidence-summary-badges"><i>${escapeHtml(sourceLabel)}</i>${evidence.chronology_status?`<i>${rawValue(evidence.chronology_status,"chronology_status")}</i>`:""}${evidence.confidence?`<i>${rawValue(evidence.confidence,"confidence")}</i>`:""}</span>
        </summary>
        <div class="person-evidence-body">
          <div class="person-evidence-facts">
            <div><small>기간 기준</small><strong>${rawValue(evidence.period_basis)}</strong></div>
            <div><small>연대 상태</small><strong>${rawValue(evidence.chronology_status,"chronology_status")}</strong></div>
            <div><small>신뢰도</small><strong>${rawValue(evidence.confidence,"confidence")}</strong></div>
          </div>
          <div class="person-evidence-boundaries">
            ${boundaryHtml("시작 경계",evidence.start)}
            ${boundaryHtml("종료 경계",evidence.end)}
          </div>
          <div class="person-evidence-sources">
            <div class="person-evidence-sources-head"><strong>출처</strong><span>${escapeHtml(String(evidence.source_count))}건</span></div>
            ${sourceListHtml(evidence.sources)}
          </div>
        </div>
      </details>`;
    }

    return Object.freeze({activityEvidenceHtml});
  }

  return Object.freeze({boundaryMeta,evidenceForActivity,humanEvidenceValue,createRenderer});
});
