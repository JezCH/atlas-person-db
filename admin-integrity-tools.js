(() => {
  "use strict";

  const config = window.ATLAS_CONFIG || {};
  if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return;

  const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const compact = (value) => String(value ?? "").trim();
  const normalized = (value) => compact(value).toLowerCase().replace(/\s+/g, " ");

  function displayPerson(name) {
    const map = window.ATLAS_LOCALES?.ko?.persons || {};
    return hasOwn(map, name) ? compact(map[name]) : compact(name);
  }

  function displayPolity(name) {
    const map = window.ATLAS_LOCALES?.ko?.polities || {};
    return hasOwn(map, name) ? compact(map[name]) : compact(name);
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
    for (const name of [...new Set(rawRows.map((row) => compact(row.person_name)).filter(Boolean))]) {
      canonicalByName.set(name, await resolveCanonical(name));
    }

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

  function groupByExactValue(rows, valueOf) {
    const map = new Map();
    for (const row of rows) {
      const value = valueOf(row);
      if (!map.has(value)) map.set(value, []);
      map.get(value).push(row);
    }
    return [...map.values()].filter((bucket) => bucket.length > 1);
  }

  function findRawExactDuplicates(rows) {
    return groupByExactValue(rows, (row) => JSON.stringify([
      row.rawPerson,
      row.rawPolity,
      row.start,
      row.end
    ]));
  }

  function findCanonicalExactDuplicates(rows) {
    return groupByExactValue(rows, (row) => JSON.stringify([
      row.canonicalPerson,
      row.rawPolity,
      row.start,
      row.end
    ]));
  }

  function findSameDisplayNames(rows) {
    return groupByExactValue(rows, (row) => row.displayPerson);
  }

  function findAliasGroups(rows) {
    return groupByExactValue(rows, (row) => row.canonicalPerson)
      .filter((bucket) => new Set(bucket.map((row) => row.rawPerson)).size > 1);
  }

  function findDuplicatePersonRegistrations(rows) {
    return groupByExactValue(rows, (row) => JSON.stringify([
      row.displayPerson,
      row.displayPolity,
      row.start,
      row.end
    ]));
  }

  function findUnlocalizedRows(rows) {
    return rows.filter((row) => row.displayPerson === row.rawPerson);
  }

  function findPotentialAliasDuplicates(rows) {
    const unlocalized = findUnlocalizedRows(rows);
    const candidates = [];
    for (let i = 0; i < unlocalized.length; i += 1) {
      for (let j = i + 1; j < unlocalized.length; j += 1) {
        const a = unlocalized[i];
        const b = unlocalized[j];
        const sameRenderedContext = a.displayPolity === b.displayPolity && a.start === b.start && a.end === b.end;
        const sameCanonical = normalized(a.canonicalPerson) === normalized(b.canonicalPerson);
        if (sameRenderedContext && sameCanonical) candidates.push([a, b]);
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

  function classifyCanonicalRelations(rows) {
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
        <div class="panel-head">
          <div>
            <h2>인물 등록 여부 확인</h2>
            <p>Supabase canonical registry와 실제 활동행을 직접 조회합니다.</p>
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
            <p>한국어 표시 중복, 미번역 행, canonical 중복을 각각 독립 검사합니다.</p>
          </div>
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
      const { data, error } = await db.from("person_politics")
        .select("id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes");
      if (error) throw error;

      const rows = await buildRows(data || []);
      const queryKey = normalized(query);
      const matches = rows.filter((row) => [
        row.rawPerson,
        row.canonicalPerson,
        row.displayPerson
      ].some((value) => normalized(value) === queryKey));

      if (!matches.length) {
        output.dataset.type = "error";
        output.textContent = `미등록: ${query}`;
        return;
      }

      output.dataset.type = "success";
      output.textContent = [
        "등록됨 ✅",
        `Activity rows: ${matches.length}`,
        "",
        ...matches.map((row) => `- ${rowLine(row)}`)
      ].join("\n");
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
    output.textContent = "한국어 표시명과 canonical 기준을 함께 검사 중...";

    try {
      const { data, error } = await db.from("person_politics")
        .select("id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes");
      if (error) throw error;

      const rows = await buildRows(data || []);
      const rawDuplicates = findRawExactDuplicates(rows);
      const canonicalDuplicates = findCanonicalExactDuplicates(rows);
      const duplicateRegistrations = findDuplicatePersonRegistrations(rows);
      const sameDisplayNames = findSameDisplayNames(rows);
      const aliases = findAliasGroups(rows);
      const unlocalizedRows = findUnlocalizedRows(rows);
      const potentialAliasDuplicates = findPotentialAliasDuplicates(rows);
      const relations = classifyCanonicalRelations(rows);

      const hardFailures = rawDuplicates.length + canonicalDuplicates.length + duplicateRegistrations.length + potentialAliasDuplicates.length + relations.samePolityConflicts.length;
      const reviewItems = sameDisplayNames.length + aliases.length + unlocalizedRows.length + relations.unresolvedConcurrent.length;
      const status = hardFailures > 0 ? "FAIL ❌" : reviewItems > 0 ? "PASS WITH REVIEW ⚠️" : "PASS ✅";

      const lines = [
        "ATLAS DB Integrity Audit — LIVE",
        "",
        `전체 활동행: ${rows.length}`,
        `고유 원본 저장명: ${new Set(rows.map((row) => row.rawPerson)).size}`,
        `고유 canonical 인물: ${new Set(rows.map((row) => row.canonicalPerson)).size}`,
        `원본 저장명 정확 중복 묶음: ${rawDuplicates.length}`,
        `canonical 정확 중복 묶음: ${canonicalDuplicates.length}`,
        `동일 인물 중복 등록 후보: ${duplicateRegistrations.length}`,
        `한국어 동일 인물명 그룹: ${sameDisplayNames.length}`,
        `한국어 미번역 활동행: ${unlocalizedRows.length}`,
        `미번역 canonical 중복 후보: ${potentialAliasDuplicates.length}`,
        `alias/canonical 통합 후보: ${aliases.length}`,
        `동일 canonical 인물·정치체 기간 충돌: ${relations.samePolityConflicts.length}`,
        `정상 정치체 전환: ${relations.transitions.length}`,
        `검토 완료 복수 통치: ${relations.acceptedConcurrent.length}`,
        `미분류 복수 정치체: ${relations.unresolvedConcurrent.length}`,
        "",
        `Status: ${status}`
      ];

      if (rawDuplicates.length) {
        lines.push("", "[오류 — 원본 저장명·정치체·기간 정확 중복]");
        rawDuplicates.forEach((bucket) => lines.push(`- ${bucket.map(rowLine).join(" ↔ ")}`));
      }

      if (canonicalDuplicates.length) {
        lines.push("", "[오류 — canonical 인물·정치체·기간 정확 중복]");
        canonicalDuplicates.forEach((bucket) => lines.push(`- ${bucket.map(rowLine).join(" ↔ ")}`));
      }

      if (duplicateRegistrations.length) {
        lines.push("", "[오류 — 일반 화면 기준 동일 인물 중복 등록]");
        duplicateRegistrations.forEach((bucket) => {
          lines.push(`- ${bucket[0].displayPerson}: ${bucket.map(rowLine).join(" ↔ ")}`);
        });
      }

      if (potentialAliasDuplicates.length) {
        lines.push("", "[오류 — 미번역 원본명은 다르지만 canonical·정치체·기간이 같은 후보]");
        potentialAliasDuplicates.forEach((pair) => lines.push(`- ${pair.map(rowLine).join(" ↔ ")}`));
      }

      if (sameDisplayNames.length) {
        lines.push("", "[검토 — 한국어 표시명이 같은 모든 활동행]");
        sameDisplayNames.forEach((bucket) => {
          lines.push(`- ${bucket[0].displayPerson}: ${bucket.map(rowLine).join(" ↔ ")}`);
        });
      }

      if (unlocalizedRows.length) {
        lines.push("", "[검토 — 한국어 로케일이 없어 원본 영문명으로 표시되는 활동행]");
        unlocalizedRows.forEach((row) => lines.push(`- ${rowLine(row)}`));
      }

      if (aliases.length) {
        lines.push("", "[검토 — 서로 다른 원본명이 같은 canonical 인물로 통합됨]");
        aliases.forEach((bucket) => lines.push(`- ${bucket.map(rowLine).join(" ↔ ")}`));
      }

      if (relations.samePolityConflicts.length) {
        lines.push("", "[오류 — 동일 canonical 인물·동일 정치체 기간 중첩]");
        relations.samePolityConflicts.forEach((pair) => lines.push(relationLine(pair)));
      }

      if (relations.unresolvedConcurrent.length) {
        lines.push("", "[검토 — 미분류 복수 정치체]");
        relations.unresolvedConcurrent.forEach((pair) => lines.push(relationLine(pair)));
      }

      if (relations.acceptedConcurrent.length) {
        lines.push("", "[정상 — 검토 완료 복수 통치·동군연합]");
        relations.acceptedConcurrent.forEach((pair) => lines.push(relationLine(pair)));
      }

      if (relations.transitions.length) {
        lines.push("", "[정상 — 같은 연도 정치체 전환]");
        relations.transitions.forEach((pair) => lines.push(relationLine(pair)));
      }

      output.dataset.type = hardFailures > 0 ? "error" : reviewItems > 0 ? "info" : "success";
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