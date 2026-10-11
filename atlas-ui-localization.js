(() => {
  "use strict";

  const ENUMS = Object.freeze({
    relation: Object.freeze({
      rules: "통치",
      governs: "통치",
      serves: "복무",
      active_in: "활동",
      opposes: "대립",
      claims_rule: "통치권 주장"
    }),
    person_type: Object.freeze({
      historical:"역사 인물", legendary:"전설 인물", mythical:"신화 인물",
      mythological:"신화 인물", unknown:"인물 유형 미확정"
    }),
    name_type: Object.freeze({
      canonical:"기준 이름", display:"표시 이름", alias:"별칭",
      alternative:"대체 이름", regnal:"재위명"
    }),
    locale_name: Object.freeze({
      ko:"한국어", en:"영어", la:"라틴어", zh:"중국어", ja:"일본어",
      ar:"아랍어", fr:"프랑스어", de:"독일어", es:"스페인어",
      it:"이탈리아어", ru:"러시아어", pt:"포르투갈어",
      el:"그리스어", hi:"힌디어", fa:"페르시아어", tr:"튀르키예어"
    }),
    source_type: Object.freeze({
      book:"도서", article:"논문·기사", bibliographic_reference:"서지 자료",
      web_bibliographic_reference:"온라인 서지 자료",
      archival_document:"기록 보관 문서"
    }),
    relation_category: Object.freeze({
      authority:"통치·권한 관계"
    }),
    granularity: Object.freeze({year:"연 단위",month:"월 단위",day:"일 단위"}),
    calendar: Object.freeze({
      gregorian:"그레고리력", julian:"율리우스력",
      unspecified_historical:"역법 미특정", source_calendar:"출처 기록의 역법"
    }),
    period_basis: Object.freeze({
      reign: "재위",
      term: "임기",
      de_facto_rule: "실권 장악",
      military_activity: "군사 활동",
      religious_activity: "종교 활동",
      intellectual_activity: "학술 활동",
      artistic_activity: "예술 활동",
      general_activity: "주요 활동"
    }),
    chronology: Object.freeze({
      exact_as_recorded: null,
      reviewed_stage2_traditional_disputed: "연대 논쟁 있음",
      disputed: "연대 논쟁 있음",
      approximate: "연대 근사",
      inferred: "연대 추정",
      unknown: "연대 미확정"
    }),
    confidence: Object.freeze({
      legacy_asserted: null,
      well_established: "근거 확립",
      high: "신뢰도 높음",
      medium: "신뢰도 보통",
      low: "신뢰도 낮음",
      uncertain: "신뢰도 미확정",
      unknown: "신뢰도 미상"
    }),
    historicity: Object.freeze({
      historical: "역사적 실존",
      legendary: "전설",
      mythical: "신화",
      mythological: "신화",
      legendary_or_composite: "전설·복합 전승",
      legendary_possible_historical_core: "전설·역사적 핵심 가능",
      legendary_or_unverified: "전설·미검증",
      historical_tradition_uncertain_chronology: "역사 전승·연대 불확실",
      legendary_founder_tradition: "전설적 건국 전승",
      disputed: "역사성 논쟁",
      uncertain: "역사성 불확실",
      unknown: "역사성 미상"
    })
  });

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function enumLabel(domain, value, { fallback = "미확정" } = {}) {
    const code = text(value);
    if (!code) return fallback;
    if (Object.prototype.hasOwnProperty.call(ENUMS[domain] || {}, code)) {
      const label = ENUMS[domain][code];
      return label == null ? null : label;
    }
    return fallback;
  }

  function localizedName(entity, { fallback = "미상" } = {}) {
    if (!entity) return fallback;
    const names = Array.isArray(entity.names) ? entity.names : [];
    const koPreferred = names.find((row) => text(row?.locale) === "ko" && row?.is_preferred)?.name;
    const koAny = names.find((row) => text(row?.locale) === "ko")?.name;
    return text(entity.preferred_name_ko)
      || text(koPreferred)
      || text(koAny)
      || text(entity.display_name)
      || text(entity.canonical_name_en)
      || text(entity.source_label)
      || text(entity.name)
      || fallback;
  }

  window.ATLAS_UI_I18N = Object.freeze({
    locale: "ko",
    enums: ENUMS,
    enumLabel,
    localizedName
  });
})();