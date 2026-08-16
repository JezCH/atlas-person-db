(() => {
  "use strict";

  const LOCALE = "ko";

  const FIXED_TEXT = Object.freeze({
    "ATLAS Authoring": "ATLAS 편집",
    "Authoring System": "편집 시스템",
    "Dashboard": "대시보드",
    "Persons": "인물",
    "Polities": "정치체",
    "Places": "장소",
    "Events": "사건",
    "Sources": "출처",
    "Geometry": "지리 형상",
    "ATLAS Authoring v0.5": "ATLAS 편집 v0.5",
    "PERSON DATASET": "인물 데이터셋",
    "SELECTED RECORD": "선택한 레코드",
    "RECORD EDITOR": "레코드 편집",
    "HISTORICAL PERSONS": "역사 인물",
    "OTHER / UNCERTAIN HISTORICITY": "전설·신화·역사성 미확정",
    "PERSON DETAIL": "인물 상세",
    "Person 출처": "인물 출처",
    "Activity 출처": "활동 출처",
    "Person 상세정보를 불러오는 중입니다.": "인물 상세정보를 불러오는 중입니다.",
    "등록된 Activity 없음": "등록된 활동 없음",
    "ATLAS ADMIN V2": "ATLAS 관리자 V2",
    "ADMIN SESSION": "관리자 세션",
    "PHASE 9 · REVIEW DOMAIN": "9단계 · 검토 영역",
    "SYSTEM / STATUS · READ ONLY": "시스템 / 상태 · 읽기 전용",
    "OBJECT INSPECTOR · READ ONLY": "객체 검사기 · 읽기 전용",
    "UUID Object Inspector": "UUID 객체 검사기",
    "Object kind": "객체 종류",
    "IDENTITY AUTHORING": "식별자 등록",
    "Person": "인물",
    "Polity": "정치체",
    "Role": "역할",
    "Person type": "인물 유형",
    "Polity type": "정치체 유형",
    "Historicity": "역사성",
    "Role code": "역할 코드",
    "Category": "분류",
    "Identity authoring 준비됨": "식별자 등록 준비됨",
    "Persons로 돌아가기": "인물 화면으로 돌아가기",
    "System Status": "시스템 현황"
  });

  const PHRASES = Object.freeze([
    ["normalized v2 identity", "정규화 v2 식별자"],
    ["normalized identity", "정규화 식별자"],
    ["authoritative UUID", "기준 UUID"],
    ["authoritative historicity", "기준 역사성"],
    ["physical Person 병합", "실제 인물 병합"],
    ["Person UUID", "인물 UUID"],
    ["Person + Polity + Relation + Role/NULL + Period basis", "인물 + 정치체 + 관계 + 역할/없음 + 기간 기준"],
    ["Person/Polity", "인물/정치체"],
    ["Person·Polity·Role", "인물·정치체·역할"],
    ["Person, Activity, Polity, Role, Period Basis, Relation Type, Source", "인물, 활동, 정치체, 역할, 기간 기준, 관계 유형, 출처"],
    ["source UUID/key/hash/bytes", "출처 UUID/키/해시/바이트"],
    ["provenance locator", "출처 추적 위치자"],
    ["object 종류", "객체 종류"],
    ["System Status", "시스템 현황"],
    ["Object Inspector", "객체 검사기"],
    ["Inspector", "검사기"],
    ["read only", "읽기 전용"],
    ["READ ONLY", "읽기 전용"],
    ["row count", "행 수"],
    ["authoring", "편집"],
    ["Authoring", "편집"],
    ["readiness", "준비 상태"],
    ["lifecycle", "수명주기"],
    ["identity", "식별자"],
    ["Identity", "식별자"],
    ["fingerprint", "지문값"],
    ["secret", "비밀값"]
  ]);

  const ENUMS = Object.freeze({
    relation: Object.freeze({
      rules: "통치",
      governs: "통치",
      serves: "복무",
      active_in: "활동",
      opposes: "대립",
      claims_rule: "통치권 주장"
    }),
    relation_category: Object.freeze({
      political: "정치",
      governance: "통치",
      service: "복무",
      activity: "활동",
      opposition: "대립",
      claim: "통치권 주장"
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
      exact_as_recorded: "기록 그대로",
      reviewed_stage2_traditional_disputed: "전승 연대 논쟁 있음",
      disputed: "연대 논쟁 있음",
      approximate: "연대 근사",
      inferred: "연대 추정",
      unknown: "연대 미확정"
    }),
    confidence: Object.freeze({
      legacy_asserted: "기존 기록",
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
      mythological: "신화",
      mythical: "신화",
      mixed: "역사·전승 혼합",
      disputed: "역사성 논쟁",
      uncertain: "역사성 미확정",
      unknown: "역사성 미상"
    }),
    person_type: Object.freeze({
      historical: "역사 인물",
      person: "인물",
      legendary: "전설 인물",
      mythological: "신화 인물",
      mythical: "신화 인물"
    }),
    granularity: Object.freeze({
      year: "연도 단위",
      month: "월 단위",
      day: "일 단위",
      range: "기간 단위",
      unknown: "단위 미상"
    }),
    certainty: Object.freeze({
      exact: "정확",
      approximate: "근사",
      circa: "약",
      inferred: "추정",
      uncertain: "불확실",
      disputed: "논쟁 있음",
      unknown: "미상"
    }),
    calendar: Object.freeze({
      gregorian: "그레고리력",
      proleptic_gregorian: "역산 그레고리력",
      julian: "율리우스력",
      proleptic_julian: "역산 율리우스력",
      historical: "당대 달력",
      unknown: "달력 미상"
    }),
    source_type: Object.freeze({
      primary: "1차 사료",
      secondary: "2차 문헌",
      tertiary: "3차 자료",
      book: "단행본",
      journal_article: "학술 논문",
      article: "논문·기사",
      website: "웹 자료",
      web: "웹 자료",
      encyclopedia: "백과사전",
      database: "데이터베이스",
      archival: "기록물",
      inscription: "비문",
      chronicle: "연대기",
      document: "문서",
      other: "기타 자료"
    }),
    decision: Object.freeze({
      ALL: "전체",
      OPEN: "미판정",
      MERGE: "병합 승인",
      KEEP_SEPARATE: "별개",
      REVIEW: "추가 검토"
    }),
    locale: Object.freeze({
      ko: "한국어",
      en: "영어",
      la: "라틴어",
      ar: "아랍어",
      zh: "중국어",
      ja: "일본어",
      fr: "프랑스어",
      de: "독일어",
      es: "스페인어",
      ru: "러시아어"
    }),
    name_type: Object.freeze({
      preferred: "대표명",
      canonical: "기준명",
      alternate: "별칭",
      alias: "별칭",
      birth: "출생명",
      regnal: "군주명",
      native: "현지명",
      transliteration: "음역명"
    })
  });

  function raw(value) {
    return value == null ? "" : String(value).trim();
  }

  function enumLabel(domain, value, { fallback = "미확정", diagnostic = false } = {}) {
    const code = raw(value);
    if (!code) return fallback;
    const label = ENUMS[domain]?.[code] || null;
    if (diagnostic) return label ? `${label} (${code})` : `기타 (${code})`;
    return label || fallback;
  }

  function localizedName(entity, { fallback = "미상" } = {}) {
    if (!entity) return fallback;
    const names = Array.isArray(entity.names) ? entity.names : [];
    const ko = names.find((row) => raw(row?.locale) === LOCALE && row?.is_preferred)?.name
      || names.find((row) => raw(row?.locale) === LOCALE)?.name;
    return raw(entity.preferred_name_ko)
      || raw(ko)
      || raw(entity.display_name)
      || raw(entity.canonical_name_en)
      || raw(entity.source_label)
      || raw(entity.name)
      || fallback;
  }

  function localizedFacet(entity, domain, fallback) {
    if (!entity) return entity;
    const display = domain === "relation"
      ? enumLabel("relation", entity.code, { fallback: localizedName(entity, { fallback }) })
      : localizedName(entity, { fallback });
    return Object.freeze({ ...entity, display_name: display });
  }

  function localizedActivity(activity) {
    if (!activity || typeof activity !== "object") return activity;
    return Object.freeze({
      ...activity,
      polity: localizedFacet(activity.polity, "polity", "정치체 미상"),
      relation: localizedFacet(activity.relation, "relation", "관계 미확정"),
      role: localizedFacet(activity.role, "role", "역할 미지정"),
      period_basis: localizedFacet(activity.period_basis, "period_basis", "기간 기준 미상")
    });
  }

  function localizedPerson(person) {
    if (!person || typeof person !== "object") return person;
    const activities = Array.isArray(person.activities) ? person.activities.map(localizedActivity) : person.activities;
    const summaries = Array.isArray(person.activity_summaries) ? person.activity_summaries.map(localizedActivity) : person.activity_summaries;
    const facets = person.facets ? Object.freeze({
      polities: Object.freeze((person.facets.polities || []).map((row) => localizedFacet(row, "polity", "정치체 미상"))),
      relations: Object.freeze((person.facets.relations || []).map((row) => localizedFacet(row, "relation", "관계 미확정"))),
      roles: Object.freeze((person.facets.roles || []).map((row) => localizedFacet(row, "role", "역할 미지정"))),
      period_bases: Object.freeze((person.facets.period_bases || []).map((row) => localizedFacet(row, "period_basis", "기간 기준 미상")))
    }) : person.facets;
    return Object.freeze({
      ...person,
      display_name: localizedName(person, { fallback: "이름 미상" }),
      activities: activities ? Object.freeze(activities) : activities,
      activity_summaries: summaries ? Object.freeze(summaries) : summaries,
      facets
    });
  }

  function patchPersonReader() {
    const reader = window.ATLAS_PERSON_BROWSER_READER;
    if (!reader || reader.__atlasLocalized) return;
    const originalList = reader.listPersons?.bind(reader);
    const originalRead = reader.readPerson?.bind(reader);
    if (typeof originalList !== "function" || typeof originalRead !== "function") return;

    const wrapped = Object.freeze({
      ...reader,
      __atlasLocalized: true,
      async listPersons(options) {
        const result = await originalList(options);
        const persons = Object.freeze((result.persons || []).map(localizedPerson));
        return Object.freeze({
          ...result,
          persons,
          groups: reader.partitionByHistoricity(persons),
          facet_catalog: reader.facetCatalog(persons)
        });
      },
      async readPerson(personId, options) {
        const result = await originalRead(personId, options);
        return Object.freeze({ ...result, person: localizedPerson(result.person) });
      }
    });
    window.ATLAS_PERSON_BROWSER_READER = wrapped;
  }

  function replaceFixedText(value) {
    let output = raw(value);
    if (!output) return output;
    if (FIXED_TEXT[output]) return FIXED_TEXT[output];
    for (const [source, target] of PHRASES) output = output.replaceAll(source, target);
    output = output
      .replace(/^Activity\s+(\d+)건$/i, "활동 $1건")
      .replace(/\bActivity\s+(\d+)건\b/g, "활동 $1건")
      .replace(/historicity 값/g, "역사성 값")
      .replace(/semantic filter/g, "의미 필터")
      .replace(/sources\s+(\d+)/gi, "출처 $1")
      .replace(/\bpreferred\b/g, "대표명");
    return output;
  }

  function localizeSemanticElement(element) {
    if (!(element instanceof Element)) return;
    const text = raw(element.textContent);
    if (!text) return;

    if (element.matches(".person-historicity")) {
      const code = text.replace(/^historicity\s+/i, "");
      element.textContent = enumLabel("historicity", code, { fallback: "역사성 미확정" });
      element.dataset.atlasRawValue = code;
      return;
    }
    if (element.matches(".person-type-badge, .person-card-top > span:last-child")) {
      const code = text.replace(/^Person\s+/i, "").replace(/^type\s+/i, "");
      element.textContent = enumLabel("person_type", code, { fallback: "인물 유형 미확정" });
      element.dataset.atlasRawValue = code;
      return;
    }
    if (element.matches(".person-relation-badge")) {
      element.textContent = enumLabel("relation", text, { fallback: text === "relation 미상" ? "관계 미확정" : "관계 미확정" });
      element.dataset.atlasRawValue = text;
      return;
    }
    if (element.matches(".person-source-type")) {
      element.textContent = enumLabel("source_type", text, { fallback: "기타 자료" });
      element.dataset.atlasRawValue = text;
      return;
    }
    if (element.matches(".person-activity-meta, .person-card-activity > small")) {
      const chunks = text.split("·").map((item) => item.trim()).filter(Boolean).map((item) => {
        const [prefix, ...rest] = item.split(":");
        const value = rest.join(":").trim();
        if (/^chronology$/i.test(prefix.trim())) return `연대: ${enumLabel("chronology", value, { fallback: "연대 미확정" })}`;
        if (/^confidence$/i.test(prefix.trim())) return `신뢰도: ${enumLabel("confidence", value, { fallback: "신뢰도 미확정" })}`;
        if (/^relation category$/i.test(prefix.trim())) return `관계 분류: ${enumLabel("relation_category", value, { fallback: "기타" })}`;
        return replaceFixedText(item);
      });
      element.textContent = chunks.join(" · ");
      return;
    }
    if (element.matches(".person-activity-dates dd small")) {
      const values = text.split("·").map((item) => item.trim()).filter(Boolean);
      element.textContent = values.map((value) =>
        ENUMS.granularity[value] || ENUMS.certainty[value] || ENUMS.calendar[value] || "미확정"
      ).join(" · ");
      return;
    }
    if (element.matches(".person-name-chips small")) {
      const values = text.split("·").map((item) => item.trim()).filter(Boolean);
      element.textContent = values.map((value) => ENUMS.locale[value] || ENUMS.name_type[value] || (value === "preferred" ? "대표명" : value)).join(" · ");
    }
  }

  function shouldSkipTextNode(node) {
    const parent = node.parentElement;
    return !parent || parent.closest("script, style, code, pre, textarea") || parent.matches("input, option");
  }

  function localizeTextNode(node) {
    if (!(node instanceof Text) || shouldSkipTextNode(node)) return;
    const original = node.nodeValue;
    const trimmed = raw(original);
    if (!trimmed) return;
    const translated = replaceFixedText(trimmed);
    if (translated !== trimmed) node.nodeValue = original.replace(trimmed, translated);
  }

  function apply(root = document) {
    if (!root) return;
    if (root === document || root instanceof Element) {
      const scope = root === document ? document : root;
      if (scope.querySelectorAll) {
        scope.querySelectorAll(".person-historicity, .person-type-badge, .person-card-top > span:last-child, .person-relation-badge, .person-source-type, .person-activity-meta, .person-card-activity > small, .person-activity-dates dd small, .person-name-chips small").forEach(localizeSemanticElement);
      }
      if (root instanceof Element) localizeSemanticElement(root);
    }
    const walker = document.createTreeWalker(root === document ? document.body : root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(localizeTextNode);
    document.title = replaceFixedText(document.title);
  }

  function observe() {
    if (!document.body) return;
    apply(document);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") localizeTextNode(mutation.target);
        for (const node of mutation.addedNodes || []) {
          if (node instanceof Text) localizeTextNode(node);
          else if (node instanceof Element) apply(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  window.ATLAS_UI_I18N = Object.freeze({
    locale: LOCALE,
    fixedText: FIXED_TEXT,
    enums: ENUMS,
    enumLabel,
    localizedName,
    localizedActivity,
    localizedPerson,
    replaceFixedText,
    apply,
    diagnostic(domain, value) {
      return enumLabel(domain, value, { diagnostic: true, fallback: "미확정" });
    }
  });

  patchPersonReader();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", observe, { once: true });
  else observe();
})();
