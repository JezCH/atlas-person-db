(() => {
  "use strict";

  const entry = (value) => Object.freeze(value);
  const freezeRows = (rows) => Object.freeze(rows.map((row) => entry({
    ...row,
    left: row.left ? entry(row.left) : null,
    right: row.right ? entry(row.right) : null,
    evidence: Object.freeze([...(row.evidence || [])])
  })));

  window.ATLAS_POLITY_REVIEW_CANDIDATES = Object.freeze({
    schema: "atlas-polity-review-candidates/v2",
    generated_at: "2026-09-25",
    source_scope: "Current canonical Polity read + #977 POLITY_IDENTITY_EXHAUSTIVE_SIMILARITY_AUDIT checkpoint 5748136361 + terminal reconciliation of the prior 16/16 reviewed state-form merge program",
    active_frontier_source: Object.freeze({
      issue: 977,
      checkpoint_comment_id: 5748136361,
      priority_rule: "confirmed false-merge/relink defects first; resolved/superseded prior cases remain review history instead of active work"
    }),
    active_frontier: freezeRows([
      {
        id: "later-jin-houjin-houjin-collapse",
        kind: "repair_review",
        title: "Later Jin identity 동명이체 과통합",
        left: { name: "Later Jin", ko: "후진", polity_id: "0c1849ca-e4ae-572b-bfe3-0253aa08d83a" },
        right: { name: "Later Jin (936–947) / Later Jin (1616–1636)", ko: "후진(後晉) / 후금(後金)" },
        rationale: "한 UUID가 오대십국의 후진(936–947)과 여진의 후금(1616–1636)을 함께 담고 있습니다. 동명 영문 표기로 생긴 false merge이므로 identity 분리와 명칭 구분이 필요합니다.",
        suggested_action: "repair",
        status: "AUDIT_REPAIR_REQUIRED",
        evidence: ["#977 exhaustive similarity audit confirmed false merge", "후진(後晉)과 후금(後金)은 별도 identity로 분리", "명칭 충돌도 함께 해소"]
      },
      {
        id: "kingdom-of-serbia-medieval-modern-collapse",
        kind: "repair_review",
        title: "Kingdom of Serbia identity 시대 과통합",
        left: { name: "Kingdom of Serbia", ko: "세르비아 왕국", polity_id: "63c4d67f-2190-4b71-bde6-69d1cda80a3f" },
        right: { name: "Medieval Serbia / modern Kingdom of Serbia", ko: "중세 세르비아 / 근대 세르비아 왕국" },
        rationale: "중세 Stefan Dušan 시기와 근대 Peter I 시기가 한 UUID에 섞여 있습니다. 중세·근대 identity를 분리한 뒤 중세 Kingdom→Serbian Empire의 state-form 연속성은 별도로 검토해야 합니다.",
        suggested_action: "repair",
        status: "AUDIT_REPAIR_REQUIRED",
        evidence: ["#977 exhaustive similarity audit confirmed false merge", "중세와 근대 세르비아 왕국 분리 필요", "중세 Kingdom→Serbian Empire는 후속 경계 검토"]
      },
      {
        id: "egypt-ancient-modern-collapse",
        kind: "repair_review",
        title: "Egypt identity 고대·현대 과통합",
        left: { name: "Egypt", ko: "이집트", polity_id: "8c25246a-3d73-4df9-8e4a-b0c5ca97c241" },
        right: { name: "Ancient Egypt / modern Egyptian state family", ko: "고대 이집트 / 현대 이집트 국가계열" },
        rationale: "파라오·프톨레마이오스 선행 계열과 Nasser·Sadat의 현대 국가 Activity가 generic Egypt UUID에 함께 존재합니다. 고대/현대 family를 분리·재연결해야 합니다.",
        suggested_action: "repair",
        status: "AUDIT_REPAIR_REQUIRED",
        evidence: ["#977 exhaustive similarity audit confirmed false merge/relink", "현대 1953–1958 / UAR / post-1971 phases를 고대 Egypt와 분리", "family-level split/relink required"]
      },
      {
        id: "poland-medieval-modern-collapse",
        kind: "repair_review",
        title: "Poland identity 중세·현대 과통합",
        left: { name: "Poland", ko: "폴란드", polity_id: "c6a9be73-8769-4b74-a066-c29555f508ba" },
        right: { name: "Second Polish Republic / early Poland", ko: "폴란드 제2공화국 / 초기 폴란드" },
        rationale: "Mieszko I의 중세 행과 Roman Dmowski의 1923년 행이 같은 generic Poland UUID에 섞여 있습니다. Dmowski는 기존 Second Polish Republic으로 재연결하고 중세 행은 별도 초기 폴란드 identity를 검토해야 합니다.",
        suggested_action: "repair",
        status: "AUDIT_REPAIR_REQUIRED",
        evidence: ["#977 exhaustive similarity audit confirmed false merge/relink", "Dmowski → existing Second Polish Republic", "Mieszko I 계열은 별도 reviewed early-Poland identity 필요"]
      },
      {
        id: "germany-pre1945-frg-collapse",
        kind: "repair_review",
        title: "Germany identity 전전·현대 과통합",
        left: { name: "Germany", ko: "독일", polity_id: "5dee6535-9839-4c8b-8de5-b7519d41801d" },
        right: { name: "Federal Republic of Germany", ko: "독일연방공화국" },
        rationale: "1933–1945 독일 국가 행과 Angela Merkel 2005–2021 행이 generic Germany UUID에 함께 있고 Federal Republic of Germany가 별도로 존재합니다. Merkel을 FRG로 재조정하고 pre-1945 identity는 별도 검토해야 합니다.",
        suggested_action: "repair",
        status: "AUDIT_REPAIR_REQUIRED",
        evidence: ["#977 exhaustive similarity audit confirmed false merge/relink", "Merkel → existing Federal Republic of Germany", "pre-1945 Germany identity 별도 검토"]
      },
      {
        id: "ireland-prestate-modern-collapse",
        kind: "repair_review",
        title: "Ireland identity 전근대·현대 과통합",
        left: { name: "Ireland", ko: "아일랜드", polity_id: "c9490230-d6cb-4f6b-a3ed-8baa0248c37e" },
        right: { name: "Irish Free State / modern Ireland", ko: "아일랜드 자유국 / 현대 아일랜드" },
        rationale: "O'Connell의 pre-state 맥락과 Collins 혁명기, post-1937 국가가 generic Ireland에 섞여 있습니다. 전근대·혁명기 행을 먼저 분리/재연결한 뒤 Irish Free State→Ireland 통합을 검토해야 합니다.",
        suggested_action: "repair",
        status: "AUDIT_REPAIR_REQUIRED",
        evidence: ["#977 exhaustive similarity audit confirmed contamination", "pre-state rows split/relink 선행", "그 후 Irish Free State → modern Ireland state-form merge 검토"]
      },
      {
        id: "kingdom-of-italy-multi-era-collapse",
        kind: "repair_review",
        title: "Kingdom of Italy identity 과통합",
        left: { name: "Kingdom of Italy", ko: "이탈리아 왕국", polity_id: "88921412-76c8-431c-a6e6-8c43d5a8b94a" },
        right: { name: "Medieval / Napoleonic / 1861–1946 Kingdoms of Italy", ko: "중세·나폴레옹기·근대 이탈리아 왕국" },
        rationale: "Otto I·Frederick Barbarossa·Napoleon I·Victor Emmanuel II가 같은 UUID에 연결되어 서로 다른 시대의 동명 정치체가 하나로 뭉쳐 있습니다.",
        suggested_action: "repair",
        status: "AUDIT_REPAIR_REQUIRED",
        evidence: ["기존 REVIEWED_SPLIT_REQUIRED를 최신 전수감사에서도 재확인", "관측 범위 951–1946", "중세 / 나폴레옹기 / 1861–1946 세 identity 분리 필요"]
      }
    ]),
    resolved_frontier_history: freezeRows([
      {
        id: "han-han-character-collapse",
        kind: "repair_review",
        title: "Han identity 韓 / 漢 오결합",
        left: { name: "Han (Warring States)", ko: "한(韓)", polity_id: "46740a29-a891-5ff8-9804-0f8aba62e71e" },
        right: { name: "Western Han", ko: "전한", polity_id: "34fac2d0-ba70-53e6-8e5a-47a9cd6ddfec" },
        rationale: "전국시대 한(韓)과 한 왕조(漢)의 잘못된 결합을 수정했습니다. 장건 Activity는 기존 Western Han으로 재연결했고 전국시대 韓는 기존 UUID를 보존하면서 preferred name을 명확히 구분했습니다.",
        suggested_action: "repair",
        status: "PRODUCTION_APPLIED_REPAIR",
        reviewed_decision: "repair",
        locked: true,
        evidence: [
          "#1518 merged as b9bd23c9050ad1707bfc623024324126eb2394e1",
          "Correction Apply run 36120806758 SUCCESS",
          "Zhang Qian Activity d0f0408c-e9c7-4a00-9b12-3ad2f78cb6ab → Western Han 34fac2d0-ba70-53e6-8e5a-47a9cd6ddfec",
          "Warring States Han preferred names → Han (Warring States) / 한(韓)"
        ]
      }
    ]),
    decision_options: Object.freeze([
      entry({ code: "merge", label: "병합" }),
      entry({ code: "keep_left", label: "왼쪽 유지" }),
      entry({ code: "keep_right", label: "오른쪽 유지" }),
      entry({ code: "keep_both", label: "둘 다 유지" }),
      entry({ code: "retire_left", label: "왼쪽 폐기" }),
      entry({ code: "retire_right", label: "오른쪽 폐기" }),
      entry({ code: "split_required", label: "분리 필요" }),
      entry({ code: "repair", label: "재연결·분리 수정" }),
      entry({ code: "hold", label: "보류" })
    ]),
    confirmed_merges: freezeRows([
      {
        id: "ming-case-duplicate",
        kind: "confirmed_merge",
        title: "Ming Dynasty / Ming dynasty",
        left: { name: "Ming Dynasty", ko: "명나라", polity_id: "756460ea-0f77-519e-9e91-43dfb694926a" },
        right: { name: "Ming dynasty", ko: "명나라", polity_id: "14113865-1569-521a-bae5-8ae070f4817d" },
        rationale: "영문 대소문자만 다른 동일 명칭이며 같은 시대·같은 한국어 표기로 Production에 동시에 존재합니다.",
        suggested_action: "merge",
        status: "PRODUCTION_APPLIED_RETIRED",
        reviewed_decision: "merge",
        locked: true,
        evidence: ["Ming Dynasty Activity 5건", "Ming dynasty Activity 1건", "정화가 두 UUID에 동시에 연결됨"]
      },
      {
        id: "liao-case-duplicate",
        kind: "confirmed_merge",
        title: "Liao Dynasty / Liao dynasty",
        left: { name: "Liao Dynasty", ko: "요나라", polity_id: "c7414968-29fc-5749-bfda-bf4dab331dd8" },
        right: { name: "Liao dynasty", ko: "요", polity_id: "a1e5baa6-51e0-433e-8087-d800dd1cb3a2" },
        rationale: "동일 요 왕조가 대소문자 차이로 분리된 명백한 catalog 중복입니다.",
        suggested_action: "merge",
        status: "PRODUCTION_APPLIED_RETIRED",
        reviewed_decision: "merge",
        locked: true,
        evidence: ["Liao Dynasty Activity 3건", "Liao dynasty Activity 1건", "요 성종이 소문자 UUID에 단독 연결됨"]
      },
      {
        id: "shakya-reviewed-merge",
        kind: "confirmed_merge",
        title: "Shakya Republic / Shakya",
        left: { name: "Shakya Republic", ko: "샤카 공화국", polity_id: "6e2409ba-8361-5118-91af-3b6c66770fa5" },
        right: { name: "Shakya", ko: "샤카족", polity_id: "80810807-0abb-5255-b40c-1945f4073eb1" },
        rationale: "Stage 2 reviewed decision에서 동일 정치체 alias reconciliation으로 이미 merge 판정되었습니다.",
        suggested_action: "merge",
        status: "PRODUCTION_APPLIED_RETIRED",
        reviewed_decision: "merge",
        locked: true,
        evidence: ["기존 target_disposition = MERGE_TO_EXISTING_SURVIVOR", "Shakya UUID는 현재 Activity 0건"]
      },
      {
        id: "yuan-northern-yuan-reviewed-merge",
        kind: "confirmed_merge",
        title: "Yuan Dynasty / Northern Yuan",
        left: { name: "Yuan Dynasty", ko: "원나라", polity_id: "d035cbd8-e7b1-5947-8542-c7dd356d52bb" },
        right: { name: "Northern Yuan", ko: "북원", polity_id: "986380c3-cc31-50d5-bb0d-6cae5fae0660" },
        rationale: "후속 identity 재검토에서 1368년의 대규모 영토·정치 중심 붕괴를 catastrophic territorial rupture로 판정했습니다. 원과 북원은 별도 Polity identity를 유지합니다.",
        suggested_action: "keep_both",
        status: "SUPERSEDED_NO_WRITE",
        reviewed_decision: "keep_both",
        locked: true,
        evidence: ["기존 merge 제안은 후속 검토로 폐기", "Yuan / Northern Yuan 별도 identity 유지", "Spatial 의미도 별도 보존"]
      },
      {
        id: "haudenosaunee-iroquois-reviewed-merge",
        kind: "confirmed_merge",
        title: "Iroquois Confederacy / Haudenosaunee Confederacy",
        left: { name: "Iroquois Confederacy", ko: "이로쿼이 연맹", polity_id: "1fa78018-e3af-55c3-8b8e-1bf7ad1c4b08" },
        right: { name: "Haudenosaunee Confederacy", ko: "하우데노사우니 연맹", polity_id: "c591bebb-90a3-5a96-90c5-9870ddd7f637" },
        rationale: "기존 reviewed decision이 두 명칭을 하나의 Haudenosaunee/Iroquois 정치체 alias로 확정했습니다.",
        suggested_action: "merge",
        status: "PRODUCTION_APPLIED_RETIRED",
        reviewed_decision: "merge",
        locked: true,
        evidence: ["기존 target_disposition = MERGE_TO_EXISTING_SURVIVOR", "양쪽 현재 Activity 0건"]
      },
      {
        id: "russia-state-form-reviewed-merge",
        kind: "confirmed_merge",
        title: "Russian Empire / Tsardom of Russia",
        left: { name: "Russian Empire", ko: "러시아 제국", polity_id: "dd07fc4c-b3ac-59ac-bdf2-9cc190893327" },
        right: { name: "Tsardom of Russia", ko: "러시아 차르국", polity_id: "8e0c3472-867d-5165-89c2-cb7866f6a5ed" },
        rationale: "기존 reviewed model은 동일 stable Russia polity의 1721년 전후 state-form 변화로 확정했습니다.",
        suggested_action: "merge",
        status: "PRODUCTION_APPLIED_RETIRED",
        reviewed_decision: "merge",
        locked: true,
        evidence: ["Tsardom Activity 3건", "Russian Empire Activity 8건", "Peter I가 정확히 1721 경계를 연결"]
      },
      {
        id: "sweden-empire-reviewed-merge",
        kind: "confirmed_merge",
        title: "Sweden / Swedish Empire",
        left: { name: "Sweden", ko: "스웨덴", polity_id: "93613017-b4c4-5f82-8e96-3ce6b2d3a61e" },
        right: { name: "Swedish Empire", ko: "스웨덴 제국", polity_id: "efc86adb-7fc7-5efe-9c4d-7cd8e224890f" },
        rationale: "기존 reviewed model은 Swedish Empire를 별도 정치체가 아닌 temporal designation으로 확정했습니다.",
        suggested_action: "merge",
        status: "PRODUCTION_APPLIED_RETIRED",
        reviewed_decision: "merge",
        locked: true,
        evidence: ["Sweden Activity 13건", "Swedish Empire 현재 Activity 0건"]
      },
      {
        id: "japan-empire-reviewed-merge",
        kind: "confirmed_merge",
        title: "Japan / Empire of Japan",
        left: { name: "Japan", ko: "일본", polity_id: "e029b047-544a-52c7-8897-4e494ac72af4" },
        right: { name: "Empire of Japan", ko: "일본 제국", polity_id: "7f146e58-c3e9-5af7-8cb8-346f03cd7cf6" },
        rationale: "기존 reviewed model은 stable Japan identity와 temporal state-form을 분리해야 한다고 판정했습니다.",
        presentation_note: "동일 stable Japan identity로 정리하더라도 전쟁기 일본 제국과 전후·현대 일본의 국호·state-form·상징은 연대별로 분리 표시해야 합니다. 욱일기 계열은 national flag가 아니라 군기·군함기 계열이므로 national flag와 별도 symbol type으로 취급합니다.",
        suggested_action: "merge",
        status: "PRODUCTION_APPLIED_RETIRED",
        reviewed_decision: "merge",
        locked: true,
        evidence: ["Japan Activity 22건", "Empire of Japan Activity 2건", "1867–1944 구간이 generic Japan과 중첩"]
      },
      {
        id: "western-liao-qara-khitai-alias",
        kind: "confirmed_merge",
        title: "Western Liao / Qara Khitai (Western Liao)",
        left: { name: "Western Liao", ko: "서요", polity_id: "60d35355-b385-55d4-8d5c-f9b27cad29a3" },
        right: { name: "Qara Khitai (Western Liao)", ko: "서요(카라 키타이)", polity_id: "3e9c225a-a478-4509-8da2-43eb9ce35dfb" },
        rationale: "동일 서요/카라 키타이의 명칭 차이로 catalog가 이중화되어 있습니다.",
        suggested_action: "merge",
        status: "PRODUCTION_APPLIED_RETIRED",
        reviewed_decision: "merge",
        locked: true,
        evidence: ["Western Liao Activity 1건", "Qara Khitai UUID는 현재 Activity 0건", "후자 spatial binding 없음"]
      }
    ]),
    review_candidates: freezeRows([
      {
        id: "cordoba-emirate-caliphate",
        kind: "merge_review",
        title: "Emirate of Cordoba / Caliphate of Cordoba",
        left: { name: "Emirate of Cordoba", ko: "코르도바 토후국", polity_id: "dd89dd8d-f816-4a07-b5a3-a2556da90296" },
        right: { name: "Caliphate of Cordoba", ko: "코르도바 칼리파국", polity_id: "0a0ed67e-ab5b-4b43-8c3c-a32c32aa3653" },
        rationale: "Abd al-Rahman III가 929년을 경계로 양쪽에 이어져 state-form 전환 가능성이 매우 높습니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["Emirate 관측 822–929", "Caliphate 관측 929–961", "동일 인물 Abd al-Rahman III가 경계를 연결"]
      },
      {
        id: "hungary-principality-kingdom",
        kind: "merge_review",
        title: "Principality of Hungary / Kingdom of Hungary",
        left: { name: "Principality of Hungary", ko: "헝가리 대공국", polity_id: "09ff1776-171f-435a-a444-4b0463e48137" },
        right: { name: "Kingdom of Hungary", ko: "헝가리 왕국", polity_id: "b07ef629-2fd6-59f9-bac8-ec685b371aac" },
        rationale: "Stephen I가 1000년 전후 양쪽에 이어져 동일 정치체의 왕국 전환인지 검토 가치가 높습니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["Principality 관측 997–1000", "Kingdom 관측 1000–1944", "Stephen I가 경계를 연결"]
      },
      {
        id: "bulgaria-principality-kingdom",
        kind: "merge_review",
        title: "Principality of Bulgaria / Kingdom of Bulgaria",
        left: { name: "Principality of Bulgaria", ko: "불가리아 공국", polity_id: "4a92bbb3-6532-4dab-b515-837ad344ec6c" },
        right: { name: "Kingdom of Bulgaria", ko: "불가리아 왕국", polity_id: "c9c9ed4f-17ff-496a-a2b3-d949c631eb22" },
        rationale: "Ferdinand I가 1908년 국호·지위 전환 양쪽에 동일하게 연결됩니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["Principality 관측 1887–1908", "Kingdom 관측 1908–1918"]
      },
      {
        id: "montenegro-principality-kingdom",
        kind: "merge_review",
        title: "Principality of Montenegro / Kingdom of Montenegro",
        left: { name: "Principality of Montenegro", ko: "몬테네그로 공국", polity_id: "a7049680-e80e-40a0-9aec-4efeaeb0f301" },
        right: { name: "Kingdom of Montenegro", ko: "몬테네그로 왕국", polity_id: "71838f1f-0098-4ab1-bbc4-8679f1683c1d" },
        rationale: "Nikola I가 1910년 전환을 그대로 연결합니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["Principality 관측 1860–1910", "Kingdom 관측 1910–1918"]
      },
      {
        id: "friedland-principality-duchy",
        kind: "merge_review",
        title: "Principality of Friedland / Duchy of Friedland",
        left: { name: "Principality of Friedland", ko: "프리들란트 공국(후국)", polity_id: "d7c3910c-cd34-444c-80a7-6107b7d7a71c" },
        right: { name: "Duchy of Friedland", ko: "프리들란트 공작령", polity_id: "6d717245-4025-465e-bb66-9946b0e16481" },
        rationale: "Wallenstein의 동일 영지가 1627년 지위 승격 전후로 분리되어 있습니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["Principality 관측 1624–1627", "Duchy 관측 1627–1634"]
      },
      {
        id: "vietnam-state-republic",
        kind: "merge_review",
        title: "State of Vietnam / Republic of Vietnam",
        left: { name: "State of Vietnam", ko: "베트남국", polity_id: "90d03d94-41bc-42b6-b910-f6c0c498bd20" },
        right: { name: "Republic of Vietnam", ko: "베트남 공화국", polity_id: "4d6cea58-b611-47ba-96c4-b51c7bed1400" },
        rationale: "Ngô Đình Diệm이 1955년 전후 두 정치체에 연속 연결되어 동일 정치공동체의 체제 전환인지 검토가 필요합니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["State of Vietnam 관측 1954–1955", "Republic of Vietnam 관측 1955–1963"]
      },
      {
        id: "central-african-republic-empire",
        kind: "merge_review",
        title: "Central African Republic / Central African Empire",
        left: { name: "Central African Republic", ko: "중앙아프리카공화국", polity_id: "4470f274-7ead-4b70-9b54-78cd93cee4c5" },
        right: { name: "Central African Empire", ko: "중앙아프리카 제국", polity_id: "21c2fd7d-84ee-4674-9a7e-46db1be6266c" },
        rationale: "Bokassa가 1976년 전후 양쪽을 연결합니다. 국가 identity와 정체(state-form)를 분리할지 검토 대상입니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["Republic 관측 1966–1976", "Empire 관측 1976–1979"]
      },
      {
        id: "ecuador-state-republic",
        kind: "merge_review",
        title: "State of Ecuador / Republic of Ecuador",
        left: { name: "State of Ecuador", ko: "에콰도르국", polity_id: "29b6b4bd-f767-4995-9e36-d50ecba7db88" },
        right: { name: "Republic of Ecuador", ko: "에콰도르 공화국", polity_id: "a059470d-3985-4a0c-a3b0-e1de2f47e2f6" },
        rationale: "Juan José Flores가 양쪽에 연결되어 명칭·정체 수준 분리인지 확인해야 합니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["State 관측 1830–1834", "Republic 관측 1839–1845"]
      },
      {
        id: "romania-generic-kingdom",
        kind: "merge_review",
        title: "Romania / Kingdom of Romania",
        left: { name: "Romania", ko: "루마니아", polity_id: "bc585200-e306-45cc-ae5d-eb21935c7821" },
        right: { name: "Kingdom of Romania", ko: "루마니아 왕국", polity_id: "63c0aa8d-bc0b-42c5-9118-612b6c650646" },
        rationale: "Carol I가 generic Romania와 Kingdom of Romania 양쪽에 연결되어 identity/state-form 중복 가능성이 있습니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["Romania 관측 1866–1989", "Kingdom 관측 1881–1944", "Carol I가 양쪽에 존재"]
      },
      {
        id: "ostrogothic-confederation-kingdom",
        kind: "merge_review",
        title: "Ostrogothic Confederation / Ostrogothic Kingdom",
        left: { name: "Ostrogothic Confederation", ko: "동고트 정치연합", polity_id: "bcb090c2-7906-4c3e-91cf-99b02646764e" },
        right: { name: "Ostrogothic Kingdom", ko: "동고트 왕국", polity_id: "8cb0aec8-6228-4db6-88ad-584a21925ee1" },
        rationale: "Theodoric가 493년 경계를 연결하지만 이탈리아 정복 후 territorial polity 성립을 별도 identity로 볼 여지가 있어 자동 병합하지 않습니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["Confederation 관측 474–493", "Kingdom 관측 493–526", "동일 인물 Theodoric가 경계를 연결"]
      },
      {
        id: "austria-generic-republic",
        kind: "merge_review",
        title: "Austria / Republic of Austria",
        left: { name: "Austria", ko: "오스트리아", polity_id: "ebee3963-6246-4b8e-9730-574001ec247d" },
        right: { name: "Republic of Austria", ko: "오스트리아 공화국", polity_id: "02e66261-7798-4144-b298-9bc41ee2215b" },
        rationale: "현대 오스트리아 generic/formal 이름이 겹쳐 사용됩니다. 다른 Austria계 historical polities와 분리한 뒤 canonical 통합 여부를 검토해야 합니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["Austria 관측 1945–1950", "Republic of Austria 관측 1932–1992"]
      },
      {
        id: "latvia-generic-republic",
        kind: "merge_review",
        title: "Latvia / Republic of Latvia",
        left: { name: "Latvia", ko: "라트비아", polity_id: "3959991c-9512-41ab-8e0e-c718eee53633" },
        right: { name: "Republic of Latvia", ko: "라트비아 공화국", polity_id: "eaa3ad78-bb73-4812-b00a-1b4e160acd69" },
        rationale: "1920년대 같은 국가가 generic/formal 이름으로 이중화된 것으로 보입니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["Latvia 관측 1922–1927", "Republic 관측 1918–1940"]
      },
      {
        id: "greece-generic-kingdom",
        kind: "merge_review",
        title: "Greece / Kingdom of Greece",
        left: { name: "Greece", ko: "그리스", polity_id: "4dd77aef-9070-448e-b8da-425dfd0f4732" },
        right: { name: "Kingdom of Greece", ko: "그리스 왕국", polity_id: "829b5976-18f4-48e3-a35d-3c141858ce56" },
        rationale: "동일 시기 generic/formal 사용이 겹치므로 stable polity + temporal state-form 방식 적용 여부를 검토합니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["Greece 관측 1910–1933", "Kingdom 관측 1922–1952"]
      },
      {
        id: "denmark-generic-kingdom",
        kind: "merge_review",
        title: "Denmark / Kingdom of Denmark",
        left: { name: "Denmark", ko: "덴마크", polity_id: "c117fb82-4943-40d6-bc2d-740f0665665a" },
        right: { name: "Kingdom of Denmark", ko: "덴마크 왕국", polity_id: "da99e975-fba4-510b-bb1c-6937d443abf5" },
        rationale: "장기간 겹쳐 쓰이는 generic/formal 명칭입니다. 별도 UUID보다 하나의 stable Denmark identity가 맞는지 검토합니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["Kingdom 관측 958–1863", "Denmark 관측 1523–2024"]
      },
      {
        id: "norway-generic-kingdom",
        kind: "merge_review",
        title: "Norway / Kingdom of Norway",
        left: { name: "Norway", ko: "노르웨이", polity_id: "683037ec-b5e1-4373-986e-c63df8ea75c2" },
        right: { name: "Kingdom of Norway", ko: "노르웨이 왕국", polity_id: "b00cd071-3772-563e-9139-ca4947d5bd9b" },
        rationale: "중세 이후 동일 정치공동체에 generic/formal 이름이 병존하는 구간이 큽니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["Kingdom 관측 865–1397", "Norway 관측 1015–2026"]
      },
      {
        id: "france-generic-kingdom",
        kind: "merge_review",
        title: "France / Kingdom of France",
        left: { name: "France", ko: "프랑스", polity_id: "1eaa48b6-dc60-49d6-91c4-49db556f4ddf" },
        right: { name: "Kingdom of France", ko: "프랑스 왕국", polity_id: "2fcc634c-9806-5fe8-96fe-e4310124908a" },
        rationale: "1690–1705 Julie d'Aubigny Activity가 generic France를 사용해 동시대 Kingdom of France와 중첩됩니다.",
        suggested_action: "merge",
        status: "REVIEWED_MERGE_READY",
        reviewed_decision: "merge",
        evidence: ["Kingdom 관측 1226–1830", "France 관측 1690–1705"]
      }
    ]),
    split_candidates: freezeRows([
      {
        id: "israel-ancient-modern-collapse",
        kind: "split_review",
        title: "Israel identity 과통합",
        left: { name: "Israel", ko: "이스라엘", polity_id: "7c1bc8d0-03bb-49bb-8d58-f339e1543553" },
        right: { name: "Kingdom of Israel", ko: "이스라엘 왕국", polity_id: "89509d8c-67a9-54aa-bf30-a3c49b150ac1" },
        rationale: "현재 Israel UUID 하나에 고대 사사시대 인물과 현대 State of Israel 인물이 함께 연결되어 있어 이름 충돌에 의한 과통합 가능성이 높습니다.",
        suggested_action: "split_required",
        status: "PRODUCTION_APPLIED_SPLIT",
        reviewed_decision: "split_required",
        locked: true,
        evidence: ["Israel split Production 적용 완료", "Israel 관측 범위 약 기원전 1125년–1983년", "고대 Deborah·Barak·Gideon과 현대 David Ben-Gurion 계열이 같은 generic identity에 존재"]
      },
      {
        id: "kingdom-of-italy-multi-era-collapse",
        kind: "split_review",
        title: "Kingdom of Italy identity 과통합",
        left: { name: "Kingdom of Italy", ko: "이탈리아 왕국", polity_id: "88921412-76c8-431c-a6e6-8c43d5a8b94a" },
        right: { name: "여러 시대의 동명 정치체", ko: "중세·나폴레옹기·근대 이탈리아 왕국" },
        rationale: "같은 UUID에 Otto I·Frederick Barbarossa·Napoleon I·Victor Emmanuel II가 함께 연결되어 서로 다른 시대의 동명 정치체가 하나로 뭉친 것으로 보입니다.",
        suggested_action: "split_required",
        status: "REVIEWED_SPLIT_REQUIRED",
        reviewed_decision: "split_required",
        evidence: ["관측 범위 951–1946", "중세 이탈리아 왕국", "나폴레옹기 이탈리아 왕국", "1861–1946 이탈리아 왕국을 분리 검토 필요"]
      },
      {
        id: "kingdom-of-israel-internal-collapse",
        kind: "split_review",
        title: "Kingdom of Israel identity 내부 과통합",
        left: { name: "Kingdom of Israel", ko: "이스라엘 왕국", polity_id: "89509d8c-67a9-54aa-bf30-a3c49b150ac1" },
        right: { name: "United Monarchy / Northern Kingdom", ko: "통일왕국 계열 / 북이스라엘 왕국" },
        rationale: "현재 한 UUID가 사무엘·사울·다윗·솔로몬의 통일왕국 계열과 오므리·아합·예후의 후대 북이스라엘 왕국을 함께 담고 있어 별도 identity 분리 검토가 필요합니다.",
        suggested_action: "split_required",
        status: "PRODUCTION_APPLIED_SPLIT",
        reviewed_decision: "split_required",
        locked: true,
        evidence: ["Kingdom of Israel 내부 split Production 적용 완료", "통일왕국 계열: Samuel·Saul·David·Solomon", "후대 북왕국 계열: Omri·Ahab·Jehu", "Israel 고대/현대 분리 작업 전에 이 내부 과통합도 별도 판정 필요"]
      }
    ])
  });
})();