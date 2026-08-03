(() => {
  "use strict";

  const config = window.ATLAS_CONFIG || {};
  if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return;
  const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

  const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const looseNormalize = (value) => normalize(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9가-힣]/g, "");
  const activityKey = (row) => [normalize(row.person_name), normalize(row.politic_name), Number(row.activity_start), Number(row.activity_end)].join("\u0001");

  // 지도 기준상 복수 정치체의 동시 관계가 정상임을 이미 검토한 인물.
  // 이 목록은 오류를 숨기는 용도가 아니라, 검토 완료된 동시 통치/동군연합 사례를 별도 분류하는 용도다.
  const acceptedConcurrentPersons = new Set([
    "charles v",
    "cnut the great",
    "philip ii of spain",
    "simon bolivar",
    "nzinga mbande"
  ]);

  function panelHtml() {
    return `
      <section class="panel" id="identityLookupPanel">
        <div class="panel-head">
          <div>
            <h2>인물 등록 여부 확인</h2>
            <p>대화 기억이 아니라 Supabase의 canonical registry와 실제 활동행을 직접 조회합니다.</p>
          </div>
        </div>
        <div class="actions">
          <input id="identityLookupInput" type="search" placeholder="예: Askia Muhammad / 아스키아 무함마드" style="flex:1;min-width:240px;padding:12px;border:1px solid #cfd6e1;border-radius:8px" />
          <button id="identityLookupButton" class="button primary" type="button">DB에서 확인</button>
        </div>
        <pre id="identityLookupResult" class="result" aria-live="polite">검색어를 입력하세요.</pre>
      </section>

      <section class="panel" id="integrityAuditPanel">
        <div class="panel-head">
          <div>
            <h2>중복·명칭 무결성 검사</h2>
            <p>정확 중복, 표기 변형, 동일 정치체 기간 충돌, 정상 전환과 복수 통치를 구분합니다.</p>
          </div>
          <button id="integrityAuditButton" class="button primary" type="button">중복 검사 실행</button>
        </div>
        <pre id="integrityAuditResult" class="result" aria-live="polite">검사 대기 중</pre>
      </section>`;
  }

  function installPanels() {
    if (document.getElementById("identityLookupPanel")) return;
    const firstPanel = document.querySelector("main .panel");
    if (!firstPanel) return;
    firstPanel.insertAdjacentHTML("beforebegin", panelHtml());
    document.getElementById("identityLookupButton").addEventListener("click", lookupIdentity);
    document.getElementById("identityLookupInput").addEventListener("keydown", (event) => {
      if (event.key === "Enter") lookupIdentity();
    });
    document.getElementById("integrityAuditButton").addEventListener("click", auditIntegrity);
  }

  async function lookupIdentity() {
    const input = document.getElementById("identityLookupInput");
    const output = document.getElementById("identityLookupResult");
    const name = input.value.trim();
    if (!name) {
      output.dataset.type = "error";
      output.textContent = "인물명을 입력하세요.";
      return;
    }
    output.dataset.type = "info";
    output.textContent = "Supabase에서 확인 중...";

    try {
      let canonical = null;
      const { data: resolved, error: rpcError } = await db.rpc("resolve_person_identity", { input_name: name });
      if (!rpcError && resolved?.length) canonical = resolved[0];

      const candidates = new Set([name]);
      if (canonical?.canonical_name) candidates.add(canonical.canonical_name);
      const { data: rows, error } = await db.from("person_politics").select("id,person_name,politic_name,activity_start,activity_end,role,period_basis");
      if (error) throw error;
      const matched = (rows || []).filter((row) => [...candidates].some((candidate) => normalize(row.person_name) === normalize(candidate)));

      if (!matched.length && !canonical) {
        output.dataset.type = "error";
        output.textContent = `미등록: ${name}\n\n현재 DB와 alias registry에서 일치 항목을 찾지 못했습니다.`;
        return;
      }

      const canonicalName = canonical?.canonical_name || matched[0]?.person_name || name;
      const lines = [
        "등록됨 ✅",
        `Canonical name: ${canonicalName}`,
        canonical?.matched_alias ? `Matched alias: ${canonical.matched_alias}` : null,
        `Activity rows: ${matched.length}`,
        "",
        ...matched.map((row) => `- ${row.person_name} | ${row.politic_name} | ${row.activity_start}–${row.activity_end}`)
      ].filter(Boolean);
      output.dataset.type = "success";
      output.textContent = lines.join("\n");
    } catch (error) {
      output.dataset.type = "error";
      output.textContent = `조회 실패: ${error.message}`;
    }
  }

  function exactDuplicates(rows) {
    const grouped = new Map();
    for (const row of rows) {
      const key = activityKey(row);
      const bucket = grouped.get(key) || [];
      bucket.push(row);
      grouped.set(key, bucket);
    }
    return [...grouped.values()].filter((bucket) => bucket.length > 1);
  }

  function nameVariants(rows) {
    const grouped = new Map();
    for (const row of rows) {
      const key = normalize(row.person_name);
      const bucket = grouped.get(key) || new Set();
      bucket.add(row.person_name);
      grouped.set(key, bucket);
    }
    return [...grouped.entries()].filter(([, variants]) => variants.size > 1);
  }

  function looseNameCandidates(rows) {
    const grouped = new Map();
    for (const row of rows) {
      const key = looseNormalize(row.person_name);
      if (!key) continue;
      const bucket = grouped.get(key) || new Set();
      bucket.add(row.person_name);
      grouped.set(key, bucket);
    }
    return [...grouped.entries()].filter(([, variants]) => variants.size > 1);
  }

  function classifyPeriodRelations(rows) {
    const byPerson = new Map();
    for (const row of rows) {
      const key = normalize(row.person_name);
      const bucket = byPerson.get(key) || [];
      bucket.push(row);
      byPerson.set(key, bucket);
    }

    const samePolityConflicts = [];
    const boundaryTransitions = [];
    const acceptedConcurrent = [];
    const unresolvedConcurrent = [];

    for (const [personKey, bucket] of byPerson.entries()) {
      for (let i = 0; i < bucket.length; i += 1) {
        for (let j = i + 1; j < bucket.length; j += 1) {
          const a = bucket[i];
          const b = bucket[j];
          const overlapStart = Math.max(Number(a.activity_start), Number(b.activity_start));
          const overlapEnd = Math.min(Number(a.activity_end), Number(b.activity_end));
          if (overlapStart > overlapEnd || activityKey(a) === activityKey(b)) continue;

          if (normalize(a.politic_name) === normalize(b.politic_name)) {
            samePolityConflicts.push([a, b]);
            continue;
          }

          // 종료연도와 다음 시작연도가 같은 경우는 연 단위 자료에서 흔한 정상 전환이다.
          const touchesAtBoundary = Number(a.activity_end) === Number(b.activity_start) || Number(b.activity_end) === Number(a.activity_start);
          if (touchesAtBoundary && overlapStart === overlapEnd) {
            boundaryTransitions.push([a, b]);
            continue;
          }

          if (acceptedConcurrentPersons.has(personKey)) acceptedConcurrent.push([a, b]);
          else unresolvedConcurrent.push([a, b]);
        }
      }
    }

    return { samePolityConflicts, boundaryTransitions, acceptedConcurrent, unresolvedConcurrent };
  }

  const relationLine = ([a, b]) => `- ${a.person_name}: ${a.politic_name} ${a.activity_start}–${a.activity_end} ↔ ${b.politic_name} ${b.activity_start}–${b.activity_end}`;

  async function auditIntegrity() {
    const button = document.getElementById("integrityAuditButton");
    const output = document.getElementById("integrityAuditResult");
    button.disabled = true;
    output.dataset.type = "info";
    output.textContent = "실제 Supabase 데이터를 검사 중...";

    try {
      const { data: rows, error } = await db.from("person_politics").select("id,person_name,politic_name,activity_start,activity_end");
      if (error) throw error;
      const actual = rows || [];
      const duplicates = exactDuplicates(actual);
      const variants = nameVariants(actual);
      const looseCandidates = looseNameCandidates(actual);
      const relations = classifyPeriodRelations(actual);

      const hardFailureCount = duplicates.length + variants.length + relations.samePolityConflicts.length;
      const reviewCount = looseCandidates.length + relations.unresolvedConcurrent.length;
      const status = hardFailureCount > 0 ? "FAIL ❌" : reviewCount > 0 ? "PASS WITH REVIEW ⚠️" : "PASS ✅";

      const lines = [
        "ATLAS DB Integrity Audit — LIVE",
        "",
        `전체 활동행: ${actual.length}`,
        `고유 인물: ${new Set(actual.map((row) => normalize(row.person_name))).size}`,
        `정확 중복 묶음: ${duplicates.length}`,
        `대소문자·공백 표기 변형: ${variants.length}`,
        `유사 인물명 후보: ${looseCandidates.length}`,
        `동일 정치체 기간 충돌: ${relations.samePolityConflicts.length}`,
        `정상 정치체 전환: ${relations.boundaryTransitions.length}`,
        `검토 완료 복수 통치: ${relations.acceptedConcurrent.length}`,
        `미분류 복수 정치체: ${relations.unresolvedConcurrent.length}`,
        "",
        `Status: ${status}`
      ];

      if (duplicates.length) {
        lines.push("", "[오류 — 정확 중복 활동행]");
        duplicates.forEach((bucket) => lines.push(`- ${bucket[0].person_name} | ${bucket[0].politic_name} | ${bucket[0].activity_start}–${bucket[0].activity_end} | IDs ${bucket.map((row) => row.id).join(", ")}`));
      }
      if (variants.length) {
        lines.push("", "[오류 — 동일 정규화명 표기 변형]");
        variants.forEach(([, names]) => lines.push(`- ${[...names].join(" / ")}`));
      }
      if (relations.samePolityConflicts.length) {
        lines.push("", "[오류 — 동일 인물·동일 정치체 기간 중첩]");
        relations.samePolityConflicts.forEach((pair) => lines.push(relationLine(pair)));
      }
      if (looseCandidates.length) {
        lines.push("", "[검토 — 구두점·악센트 제거 시 같은 인물명 후보]");
        looseCandidates.forEach(([, names]) => lines.push(`- ${[...names].join(" / ")}`));
      }
      if (relations.unresolvedConcurrent.length) {
        lines.push("", "[검토 — 아직 분류되지 않은 복수 정치체 관계]");
        relations.unresolvedConcurrent.forEach((pair) => lines.push(relationLine(pair)));
      }
      if (relations.acceptedConcurrent.length) {
        lines.push("", "[정상 — 검토 완료된 동시 통치·동군연합]");
        relations.acceptedConcurrent.forEach((pair) => lines.push(relationLine(pair)));
      }
      if (relations.boundaryTransitions.length) {
        lines.push("", "[정상 — 같은 연도에 정치체가 전환된 관계]");
        relations.boundaryTransitions.forEach((pair) => lines.push(relationLine(pair)));
      }

      output.dataset.type = hardFailureCount > 0 ? "error" : reviewCount > 0 ? "info" : "success";
      output.textContent = lines.join("\n");
    } catch (error) {
      output.dataset.type = "error";
      output.textContent = `검사 실패: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installPanels, { once: true });
  else installPanels();
})();
