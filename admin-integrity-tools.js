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

  function localeMap(type) {
    return window.ATLAS_LOCALES?.ko?.[type] || {};
  }

  function displayPerson(value) {
    return localeMap("persons")[value] || value || "";
  }

  function displayPolitic(value) {
    return localeMap("polities")[value] || value || "";
  }

  const acceptedConcurrentPersons = new Set([
    "charles v",
    "cnut the great",
    "philip ii of spain",
    "simon bolivar",
    "nzinga mbande"
  ]);

  async function resolveCanonicalNames(rows) {
    const uniqueNames = [...new Set(rows.map((row) => row.person_name).filter(Boolean))];
    const resolved = new Map();

    for (const name of uniqueNames) {
      let canonicalName = name;
      try {
        const { data, error } = await db.rpc("resolve_person_identity", { input_name: name });
        if (!error && Array.isArray(data) && data.length && data[0]?.canonical_name) {
          canonicalName = data[0].canonical_name;
        }
      } catch (_) {
        canonicalName = name;
      }
      resolved.set(name, canonicalName);
    }

    return rows.map((row) => ({ ...row, __canonical_person_name: resolved.get(row.person_name) || row.person_name }));
  }

  function canonicalPersonName(row) {
    return row.__canonical_person_name || row.person_name || "";
  }

  function canonicalPersonKey(row) {
    return looseNormalize(canonicalPersonName(row));
  }

  function rawPersonKey(row) {
    return looseNormalize(row.person_name);
  }

  function canonicalPolityKey(row) {
    return looseNormalize(row.politic_name);
  }

  function canonicalActivityKey(row) {
    return [canonicalPersonKey(row), canonicalPolityKey(row), Number(row.activity_start), Number(row.activity_end)].join("\u0001");
  }

  function rawActivityKey(row) {
    return [rawPersonKey(row), canonicalPolityKey(row), Number(row.activity_start), Number(row.activity_end)].join("\u0001");
  }

  function displayNameKey(row) {
    return looseNormalize(displayPerson(row.person_name));
  }

  function displayPolityKey(row) {
    return looseNormalize(displayPolitic(row.politic_name));
  }

  function renderedActivityKey(row) {
    return [displayNameKey(row), displayPolityKey(row), Number(row.activity_start), Number(row.activity_end)].join("\u0001");
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("클립보드 복사에 실패했습니다.");
  }

  async function copyResult(outputId, button) {
    const output = document.getElementById(outputId);
    const text = String(output?.textContent || "").trim();
    if (!text) return;
    const originalLabel = button.textContent;
    try {
      await copyText(text);
      button.textContent = "복사됨 ✓";
    } catch (error) {
      console.error("Audit result copy failed", error);
      button.textContent = "복사 실패";
    } finally {
      window.setTimeout(() => { button.textContent = originalLabel; }, 1400);
    }
  }

  function panelHtml() {
    return `
      <section class="panel" id="identityLookupPanel">
        <div class="panel-head"><div><h2>인물 등록 여부 확인</h2><p>Supabase canonical registry와 실제 활동행을 직접 조회합니다.</p></div></div>
        <div class="actions"><input id="identityLookupInput" type="search" placeholder="예: Askia Muhammad / 아스키아 무함마드" style="flex:1;min-width:240px;padding:12px;border:1px solid #cfd6e1;border-radius:8px" /><button id="identityLookupButton" class="button primary" type="button">DB에서 확인</button></div>
        <pre id="identityLookupResult" class="result" aria-live="polite">검색어를 입력하세요.</pre>
      </section>
      <section class="panel" id="integrityAuditPanel">
        <div class="panel-head"><div><h2>중복·명칭 무결성 검사</h2><p>원본 저장명, 화면 표시명, canonical registry를 각각 독립적으로 검사합니다.</p></div><div class="actions"><button id="integrityAuditButton" class="button primary" type="button">중복 검사 실행</button><button id="integrityAuditCopyButton" class="button secondary" type="button" disabled>결과 복사</button></div></div>
        <pre id="integrityAuditResult" class="result" aria-live="polite">검사 대기 중</pre>
      </section>`;
  }

  function installPanels() {
    if (document.getElementById("identityLookupPanel")) return;
    const firstPanel = document.querySelector("main .panel");
    if (!firstPanel) return;
    firstPanel.insertAdjacentHTML("beforebegin", panelHtml());
    document.getElementById("identityLookupButton").addEventListener("click", lookupIdentity);
    document.getElementById("identityLookupInput").addEventListener("keydown", (event) => { if (event.key === "Enter") lookupIdentity(); });
    document.getElementById("integrityAuditButton").addEventListener("click", auditIntegrity);
    document.getElementById("integrityAuditCopyButton").addEventListener("click", (event) => copyResult("integrityAuditResult", event.currentTarget));
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
      const { data: rows, error } = await db.from("person_politics").select("id,person_name,politic_name,activity_start,activity_end,role,period_basis");
      if (error) throw error;
      const queryKey = looseNormalize(name);
      const matched = (rows || []).filter((row) => {
        const values = [row.person_name, displayPerson(row.person_name), canonical?.canonical_name, canonical?.matched_alias];
        return values.some((value) => value && looseNormalize(value) === queryKey);
      });
      if (!matched.length && !canonical) {
        output.dataset.type = "error";
        output.textContent = `미등록: ${name}\n\n현재 DB와 alias registry에서 일치 항목을 찾지 못했습니다.`;
        return;
      }
      const canonicalName = canonical?.canonical_name || matched[0]?.person_name || name;
      output.dataset.type = "success";
      output.textContent = ["등록됨 ✅", `Canonical name: ${canonicalName}`, canonical?.matched_alias ? `Matched alias: ${canonical.matched_alias}` : null, `Activity rows: ${matched.length}`, "", ...matched.map((row) => `- ${row.person_name} (${displayPerson(row.person_name)}) | ${row.politic_name} (${displayPolitic(row.politic_name)}) | ${row.activity_start}–${row.activity_end} | ID ${row.id}`)].filter(Boolean).join("\n");
    } catch (error) {
      output.dataset.type = "error";
      output.textContent = `조회 실패: ${error.message}`;
    }
  }

  function groupedDuplicates(rows, keyFn) {
    const grouped = new Map();
    for (const row of rows) {
      const key = keyFn(row);
      const bucket = grouped.get(key) || [];
      bucket.push(row);
      grouped.set(key, bucket);
    }
    return [...grouped.values()].filter((bucket) => bucket.length > 1);
  }

  function groupedByKey(rows, keyFn) {
    const grouped = new Map();
    for (const row of rows) {
      const key = keyFn(row);
      if (!key) continue;
      const bucket = grouped.get(key) || [];
      bucket.push(row);
      grouped.set(key, bucket);
    }
    return grouped;
  }

  function classifyPeriodRelations(rows) {
    const byPerson = new Map();
    for (const row of rows) {
      const key = canonicalPersonKey(row);
      const bucket = byPerson.get(key) || [];
      bucket.push(row);
      byPerson.set(key, bucket);
    }

    const samePolityConflicts = [];
    const boundaryTransitions = [];
    const acceptedConcurrent = [];
    const unresolvedConcurrent = [];

    for (const bucket of byPerson.values()) {
      for (let i = 0; i < bucket.length; i += 1) {
        for (let j = i + 1; j < bucket.length; j += 1) {
          const a = bucket[i];
          const b = bucket[j];
          const overlapStart = Math.max(Number(a.activity_start), Number(b.activity_start));
          const overlapEnd = Math.min(Number(a.activity_end), Number(b.activity_end));
          if (overlapStart > overlapEnd || canonicalActivityKey(a) === canonicalActivityKey(b)) continue;

          if (canonicalPolityKey(a) === canonicalPolityKey(b)) {
            samePolityConflicts.push([a, b]);
            continue;
          }

          const touchesAtBoundary = Number(a.activity_end) === Number(b.activity_start) || Number(b.activity_end) === Number(a.activity_start);
          if (touchesAtBoundary && overlapStart === overlapEnd) {
            boundaryTransitions.push([a, b]);
            continue;
          }

          if (acceptedConcurrentPersons.has(normalize(canonicalPersonName(a)))) acceptedConcurrent.push([a, b]);
          else unresolvedConcurrent.push([a, b]);
        }
      }
    }

    return { samePolityConflicts, boundaryTransitions, acceptedConcurrent, unresolvedConcurrent };
  }

  const relationLine = ([a, b]) => `- ${displayPerson(a.person_name)} [${a.person_name} → ${canonicalPersonName(a)}] : ${displayPolitic(a.politic_name)} ${a.activity_start}–${a.activity_end} ↔ ${displayPolitic(b.politic_name)} ${b.activity_start}–${b.activity_end}`;

  async function auditIntegrity() {
    const button = document.getElementById("integrityAuditButton");
    const copyButton = document.getElementById("integrityAuditCopyButton");
    const output = document.getElementById("integrityAuditResult");
    button.disabled = true;
    if (copyButton) copyButton.disabled = true;
    output.dataset.type = "info";
    output.textContent = "원본 저장명·화면 표시명·canonical registry를 교차 검사 중...";

    try {
      const { data: rows, error } = await db.from("person_politics").select("id,person_name,politic_name,activity_start,activity_end,role,period_basis");
      if (error) throw error;
      const actual = await resolveCanonicalNames(rows || []);

      const rawDuplicates = groupedDuplicates(actual, rawActivityKey);
      const canonicalDuplicates = groupedDuplicates(actual, canonicalActivityKey);
      const renderedDuplicates = groupedDuplicates(actual, renderedActivityKey)
        .filter((bucket) => new Set(bucket.map(rawPersonKey)).size > 1 || new Set(bucket.map(canonicalPolityKey)).size > 1);
      const sameCanonicalNameGroups = [...groupedByKey(actual, canonicalPersonKey).values()]
        .filter((bucket) => new Set(bucket.map(rawPersonKey)).size > 1);
      const sameDisplayedNameGroups = [...groupedByKey(actual, displayNameKey).values()]
        .filter((bucket) => new Set(bucket.map(rawPersonKey)).size > 1);
      const relations = classifyPeriodRelations(actual);

      const hardFailureCount = rawDuplicates.length + canonicalDuplicates.length + relations.samePolityConflicts.length;
      const reviewCount = renderedDuplicates.length + sameCanonicalNameGroups.length + sameDisplayedNameGroups.length + relations.unresolvedConcurrent.length;
      const status = hardFailureCount > 0 ? "FAIL ❌" : reviewCount > 0 ? "PASS WITH REVIEW ⚠️" : "PASS ✅";

      const lines = [
        "ATLAS DB Integrity Audit — LIVE",
        "",
        `전체 활동행: ${actual.length}`,
        `고유 원본 저장명: ${new Set(actual.map(rawPersonKey)).size}`,
        `고유 canonical 인물: ${new Set(actual.map(canonicalPersonKey)).size}`,
        `원본 저장명 정확 중복 묶음: ${rawDuplicates.length}`,
        `canonical 정확 중복 묶음: ${canonicalDuplicates.length}`,
        `화면 표시 완전 중복 후보: ${renderedDuplicates.length}`,
        `동일 화면 인물명 후보: ${sameDisplayedNameGroups.length}`,
        `alias/canonical 통합 후보: ${sameCanonicalNameGroups.length}`,
        `동일 canonical 인물·정치체 기간 충돌: ${relations.samePolityConflicts.length}`,
        `정상 정치체 전환: ${relations.boundaryTransitions.length}`,
        `검토 완료 복수 통치: ${relations.acceptedConcurrent.length}`,
        `미분류 복수 정치체: ${relations.unresolvedConcurrent.length}`,
        "",
        `Status: ${status}`
      ];

      if (rawDuplicates.length) {
        lines.push("", "[오류 — 원본 저장명·정치체·기간이 모두 같은 중복 활동행]");
        rawDuplicates.forEach((bucket) => lines.push(`- ${bucket[0].person_name} (${displayPerson(bucket[0].person_name)}) | ${bucket[0].politic_name} (${displayPolitic(bucket[0].politic_name)}) | ${bucket[0].activity_start}–${bucket[0].activity_end} | IDs ${bucket.map((row) => row.id).join(", ")}`));
      }

      if (canonicalDuplicates.length) {
        lines.push("", "[오류 — canonical registry 기준 정확 중복 활동행]");
        canonicalDuplicates.forEach((bucket) => lines.push(`- ${displayPerson(bucket[0].person_name)} [${canonicalPersonName(bucket[0])}] | ${displayPolitic(bucket[0].politic_name)} | ${bucket[0].activity_start}–${bucket[0].activity_end} | 원본 ${bucket.map((row) => `${row.person_name} / ID ${row.id}`).join(" ↔ ")}`));
      }

      if (sameCanonicalNameGroups.length) {
        lines.push("", "[검토 — 서로 다른 저장명이 같은 canonical 인물로 통합됨]");
        sameCanonicalNameGroups.forEach((bucket) => {
          lines.push(`- ${canonicalPersonName(bucket[0])}: ${bucket.map((row) => `${row.person_name} (${displayPerson(row.person_name)}) | ${displayPolitic(row.politic_name)} | ${row.activity_start}–${row.activity_end} | ID ${row.id}`).join(" ↔ ")}`);
        });
      }

      if (sameDisplayedNameGroups.length) {
        lines.push("", "[검토 — 화면에 같은 인물명으로 보이는 서로 다른 원본 저장명]");
        sameDisplayedNameGroups.forEach((bucket) => {
          lines.push(`- ${displayPerson(bucket[0].person_name)}: ${bucket.map((row) => `${row.person_name} → ${canonicalPersonName(row)} | ${displayPolitic(row.politic_name)} | ${row.activity_start}–${row.activity_end} | ID ${row.id}`).join(" ↔ ")}`);
        });
      }

      if (renderedDuplicates.length) {
        lines.push("", "[검토 — 화면 표시명·정치체·기간이 모두 같은 별도 원본 후보]");
        renderedDuplicates.forEach((bucket) => lines.push(`- ${displayPerson(bucket[0].person_name)} | ${displayPolitic(bucket[0].politic_name)} | ${bucket[0].activity_start}–${bucket[0].activity_end} | ${bucket.map((row) => `${row.person_name} → ${canonicalPersonName(row)} / ID ${row.id}`).join(" ↔ ")}`));
      }

      if (relations.samePolityConflicts.length) {
        lines.push("", "[오류 — 동일 canonical 인물·동일 정치체 기간 중첩]");
        relations.samePolityConflicts.forEach((pair) => lines.push(relationLine(pair)));
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

      output.dataset.type = hardFailureCount ? "error" : reviewCount ? "info" : "success";
      output.textContent = lines.join("\n");
      if (copyButton) copyButton.disabled = false;
    } catch (error) {
      output.dataset.type = "error";
      output.textContent = `검사 실패: ${error.message}`;
    } finally {
      button.disabled = false;
    }
  }

  installPanels();
})();