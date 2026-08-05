(() => {
  "use strict";

  const config = window.ATLAS_CONFIG || {};
  if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return;

  const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  const compact = (value) => String(value ?? "").trim();
  const normalized = (value) => compact(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ko-KR");

  function personMap() {
    return window.ATLAS_LOCALES?.ko?.persons || {};
  }

  function polityMap() {
    return window.ATLAS_LOCALES?.ko?.polities || {};
  }

  function displayPerson(name) {
    const raw = compact(name);
    const map = personMap();
    return compact(map[raw] || raw);
  }

  function displayPolity(name) {
    const raw = compact(name);
    const map = polityMap();
    return compact(map[raw] || raw);
  }

  async function resolveCanonical(name) {
    try {
      const { data, error } = await db.rpc("resolve_person_identity", { input_name: name });
      if (!error && Array.isArray(data) && data[0]?.canonical_name) return compact(data[0].canonical_name);
    } catch (_) {}
    return compact(name);
  }

  async function buildRows(rawRows) {
    const canonicalByName = new Map();
    const uniqueNames = [...new Set(rawRows.map((row) => compact(row.person_name)).filter(Boolean))];
    for (const name of uniqueNames) canonicalByName.set(name, await resolveCanonical(name));

    return rawRows.map((row) => ({
      id: row.id,
      rawPerson: compact(row.person_name),
      canonicalPerson: canonicalByName.get(compact(row.person_name)) || compact(row.person_name),
      displayPerson: displayPerson(row.person_name),
      rawPolity: compact(row.politic_name),
      displayPolity: displayPolity(row.politic_name),
      start: Number(row.activity_start),
      end: Number(row.activity_end),
      role: compact(row.role),
      periodBasis: compact(row.period_basis),
      notes: compact(row.notes)
    }));
  }

  function groupBy(rows, keyOf) {
    const groups = new Map();
    for (const row of rows) {
      const key = keyOf(row);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    return [...groups.values()].filter((group) => group.length > 1);
  }

  function rawExactDuplicates(rows) {
    return groupBy(rows, (row) => JSON.stringify([row.rawPerson, row.rawPolity, row.start, row.end]));
  }

  function canonicalExactDuplicates(rows) {
    return groupBy(rows, (row) => JSON.stringify([row.canonicalPerson, row.rawPolity, row.start, row.end]));
  }

  function koreanNameDuplicateCandidates(rows) {
    return groupBy(rows, (row) => normalized(row.displayPerson))
      .filter((group) => new Set(group.map((row) => normalized(row.rawPerson))).size > 1);
  }

  function legitimateMultiActivityGroups(rows) {
    return groupBy(rows, (row) => normalized(row.displayPerson))
      .filter((group) => new Set(group.map((row) => normalized(row.rawPerson))).size === 1);
  }

  function stripEnglishQualifier(value) {
    return normalized(value)
      .replace(/\s+of\s+.+$/u, "")
      .replace(/\s+the\s+(?:great|elder|younger|conqueror|navigator|terrible|bold|wise|lionheart)$/u, "")
      .trim();
  }

  function stripKoreanQualifier(value) {
    return normalized(value)
      .replace(/\s*(?:왕비|왕후|여왕|황후|황제|왕|대왕|공주|태후|섭정|장군|성인)$/u, "")
      .trim();
  }

  function samePeriodAndPolity(a, b) {
    return normalized(a.rawPolity) === normalized(b.rawPolity)
      && a.start === b.start
      && a.end === b.end;
  }

  function qualifiedNameDuplicateCandidates(rows) {
    const candidates = [];
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        const a = rows[i];
        const b = rows[j];
        if (!samePeriodAndPolity(a, b)) continue;
        if (normalized(a.rawPerson) === normalized(b.rawPerson)) continue;
        if (normalized(a.displayPerson) === normalized(b.displayPerson)) continue;

        const englishBaseA = stripEnglishQualifier(a.rawPerson);
        const englishBaseB = stripEnglishQualifier(b.rawPerson);
        const koreanBaseA = stripKoreanQualifier(a.displayPerson);
        const koreanBaseB = stripKoreanQualifier(b.displayPerson);

        const englishMatch = englishBaseA && englishBaseA === englishBaseB;
        const koreanMatch = koreanBaseA && koreanBaseA === koreanBaseB;
        if (englishMatch && koreanMatch) candidates.push([a, b]);
      }
    }
    return candidates;
  }

  const acceptedConcurrentPeople = new Set([
    "charles v",
    "cnut the great",
    "philip ii of spain",
    "simon bolivar",
    "nzinga mbande"
  ]);

  function classifyRelations(rows) {
    const samePolityConflicts = [];
    const transitions = [];
    const acceptedConcurrent = [];
    const unresolvedConcurrent = [];

    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        const a = rows[i];
        const b = rows[j];
        if (a.canonicalPerson !== b.canonicalPerson) continue;
        if (a.rawPolity === b.rawPolity && a.start === b.start && a.end === b.end) continue;

        const overlapStart = Math.max(a.start, b.start);
        const overlapEnd = Math.min(a.end, b.end);
        if (overlapStart > overlapEnd) continue;

        if (a.rawPolity === b.rawPolity) {
          samePolityConflicts.push([a, b]);
          continue;
        }

        const boundaryTouch = overlapStart === overlapEnd && (a.end === b.start || b.end === a.start);
        if (boundaryTouch) {
          transitions.push([a, b]);
          continue;
        }

        if (acceptedConcurrentPeople.has(normalized(a.canonicalPerson))) acceptedConcurrent.push([a, b]);
        else unresolvedConcurrent.push([a, b]);
      }
    }

    return { samePolityConflicts, transitions, acceptedConcurrent, unresolvedConcurrent };
  }

  function rowLine(row) {
    return `${row.rawPerson} → ${row.canonicalPerson} | ${row.displayPerson} | ${row.displayPolity} | ${row.start}–${row.end} | ${row.role || "—"} | ID ${row.id}`;
  }

  function relationLine([a, b]) {
    return `- ${a.displayPerson} [${a.rawPerson} → ${a.canonicalPerson}] : ${a.displayPolity} ${a.start}–${a.end} ↔ ${b.displayPolity} ${b.start}–${b.end}`;
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.readOnly = true;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    if (!copied) throw new Error("클립보드 복사에 실패했습니다.");
  }

  function panelHtml() {
    return `
      <section class="panel" id="identityLookupPanel">
        <div class="panel-head"><div><h2>인물 등록 여부 확인</h2><p>원본명·canonical·한국어 표시명을 조회합니다.</p></div></div>
        <div class="actions">
          <input id="identityLookupInput" type="search" placeholder="예: 예카테리나 2세 / Catherine II" style="flex:1;min-width:240px;padding:12px;border:1px solid #cfd6e1;border-radius:8px" />
          <button id="identityLookupButton" class="button primary" type="button">DB에서 확인</button>
        </div>
        <pre id="identityLookupResult" class="result" aria-live="polite">검색어를 입력하세요.</pre>
      </section>
      <section class="panel" id="integrityAuditPanel">
        <div class="panel-head">
          <div><h2>중복·명칭 무결성 검사</h2><p>한국어 정확 일치와 칭호·지명 설명어 차이를 각각 검사합니다.</p></div>
          <div class="actions">
            <button id="integrityAuditButton" class="button primary" type="button">중복 검사 실행</button>
            <button id="integrityAuditCopyButton" class="button secondary" type="button" disabled>결과 복사</button>
          </div>
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
    document.getElementById("integrityAuditCopyButton").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const oldLabel = button.textContent;
      const text = document.getElementById("integrityAuditResult").textContent.trim();
      try {
        await copyText(text);
        button.textContent = "복사됨 ✓";
      } catch (_) {
        button.textContent = "복사 실패";
      } finally {
        setTimeout(() => { button.textContent = oldLabel; }, 1400);
      }
    });
  }

  async function fetchRows() {
    const { data, error } = await db.from("person_politics")
      .select("id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes");
    if (error) throw error;
    return buildRows(data || []);
  }

  async function lookupIdentity() {
    const input = document.getElementById("identityLookupInput");
    const output = document.getElementById("identityLookupResult");
    const query = compact(input.value);
    if (!query) {
      output.dataset.type = "error";
      output.textContent = "인물명을 입력하세요.";
      return;
    }

    output.dataset.type = "info";
    output.textContent = "Supabase에서 확인 중...";
    try {
      const rows = await fetchRows();
      const queryKey = normalized(query);
      const matches = rows.filter((row) => [row.rawPerson, row.canonicalPerson, row.displayPerson]
        .some((value) => normalized(value) === queryKey));

      if (!matches.length) {
        output.dataset.type = "error";
        output.textContent = `미등록: ${query}`;
        return;
      }

      output.dataset.type = "success";
      output.textContent = ["등록됨 ✅", `Activity rows: ${matches.length}`, "", ...matches.map((row) => `- ${rowLine(row)}`)].join("\n");
    } catch (error) {
      output.dataset.type = "error";
      output.textContent = `조회 실패: ${error.message}`;
    }
  }

  async function auditIntegrity() {
    const button = document.getElementById("integrityAuditButton");
    const copyButton = document.getElementById("integrityAuditCopyButton");
    const output = document.getElementById("integrityAuditResult");
    button.disabled = true;
    copyButton.disabled = true;
    output.dataset.type = "info";
    output.textContent = "한국어 표시명과 설명어 차이를 검사 중...";

    try {
      const rows = await fetchRows();
      const rawDuplicates = rawExactDuplicates(rows);
      const canonicalDuplicates = canonicalExactDuplicates(rows);
      const koreanDuplicates = koreanNameDuplicateCandidates(rows);
      const qualifiedDuplicates = qualifiedNameDuplicateCandidates(rows);
      const legitimateMultiRows = legitimateMultiActivityGroups(rows);
      const relations = classifyRelations(rows);

      const hardFailures = rawDuplicates.length + canonicalDuplicates.length + koreanDuplicates.length + qualifiedDuplicates.length + relations.samePolityConflicts.length;
      const reviewItems = relations.unresolvedConcurrent.length;
      const status = hardFailures ? "FAIL ❌" : reviewItems ? "PASS WITH REVIEW ⚠️" : "PASS ✅";

      const lines = [
        "ATLAS DB Integrity Audit — LIVE",
        "",
        `전체 활동행: ${rows.length}`,
        `고유 원본 저장명: ${new Set(rows.map((row) => row.rawPerson)).size}`,
        `고유 canonical 인물: ${new Set(rows.map((row) => row.canonicalPerson)).size}`,
        `원본 저장명 정확 중복 묶음: ${rawDuplicates.length}`,
        `canonical 정확 중복 묶음: ${canonicalDuplicates.length}`,
        `한국어명 기준 중복 등록 후보: ${koreanDuplicates.length}`,
        `칭호·지명 설명어 중복 후보: ${qualifiedDuplicates.length}`,
        `정상 복수 활동행 그룹: ${legitimateMultiRows.length}`,
        `동일 canonical 인물·정치체 기간 충돌: ${relations.samePolityConflicts.length}`,
        `정상 정치체 전환: ${relations.transitions.length}`,
        `검토 완료 복수 통치: ${relations.acceptedConcurrent.length}`,
        `미분류 복수 정치체: ${relations.unresolvedConcurrent.length}`,
        "",
        `Status: ${status}`
      ];

      if (koreanDuplicates.length) {
        lines.push("", "[오류 — 한국어 표시명이 같지만 원본 저장명이 다른 중복 등록 후보]");
        koreanDuplicates.forEach((group) => lines.push(`- ${group[0].displayPerson}: ${group.map(rowLine).join(" ↔ ")}`));
      }
      if (qualifiedDuplicates.length) {
        lines.push("", "[오류 — 칭호·지명 설명어만 다른 동일 인물 중복 후보]");
        qualifiedDuplicates.forEach((pair) => lines.push(`- ${pair.map(rowLine).join(" ↔ ")}`));
      }
      if (rawDuplicates.length) {
        lines.push("", "[오류 — 원본 저장명·정치체·기간 정확 중복]");
        rawDuplicates.forEach((group) => lines.push(`- ${group.map(rowLine).join(" ↔ ")}`));
      }
      if (canonicalDuplicates.length) {
        lines.push("", "[오류 — canonical 인물·정치체·기간 정확 중복]");
        canonicalDuplicates.forEach((group) => lines.push(`- ${group.map(rowLine).join(" ↔ ")}`));
      }
      if (relations.samePolityConflicts.length) {
        lines.push("", "[오류 — 동일 canonical 인물·동일 정치체 기간 중첩]", ...relations.samePolityConflicts.map(relationLine));
      }
      if (relations.unresolvedConcurrent.length) {
        lines.push("", "[검토 — 미분류 복수 정치체]", ...relations.unresolvedConcurrent.map(relationLine));
      }
      if (relations.acceptedConcurrent.length) {
        lines.push("", "[정상 — 검토 완료 복수 통치·동군연합]", ...relations.acceptedConcurrent.map(relationLine));
      }
      if (relations.transitions.length) {
        lines.push("", "[정상 — 같은 연도 정치체 전환]", ...relations.transitions.map(relationLine));
      }

      output.dataset.type = hardFailures ? "error" : reviewItems ? "info" : "success";
      output.textContent = lines.join("\n");
      copyButton.disabled = false;
    } catch (error) {
      output.dataset.type = "error";
      output.textContent = `검사 실패: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  }

  installPanels();
})();
