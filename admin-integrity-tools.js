(() => {
  "use strict";

  const config = window.ATLAS_CONFIG || {};
  if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return;
  const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

  const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const loose = (value) => normalize(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9가-힣]/g, "");

  const localeMap = (type) => window.ATLAS_LOCALES?.ko?.[type] || {};
  const displayPerson = (value) => localeMap("persons")[value] || value || "";
  const displayPolity = (value) => localeMap("polities")[value] || value || "";

  const expectedLocales = Object.freeze({
    "Constantine I": "콘스탄티누스 1세",
    "Justinian I": "유스티니아누스 1세",
    "Napoleon I": "나폴레옹 1세",
    "Elizabeth I": "엘리자베스 1세",
    "Kanishka I": "카니슈카 1세",
    "Kamehameha I": "카메하메하 1세",
    "Leonidas I": "레오니다스 1세",
    "Ramses II": "람세스 2세",
    "Moctezuma II": "몬테수마 2세",
    "Mehmed II": "메흐메트 2세",
    "Catherine the Great": "예카테리나 2세",
    "Liu Yan": "유언",
    "Tao Qian": "도겸",
    "Nefertiti": "네페르티티",
    "Akhenaten": "아크나톤"
  });

  const acceptedConcurrent = new Set([
    "charles v", "cnut the great", "philip ii of spain", "simon bolivar", "nzinga mbande"
  ]);

  async function resolveCanonicalMap(names) {
    const map = new Map();
    for (const name of names) {
      let canonical = name;
      try {
        const { data, error } = await db.rpc("resolve_person_identity", { input_name: name });
        if (!error && Array.isArray(data) && data[0]?.canonical_name) canonical = data[0].canonical_name;
      } catch (_) {}
      map.set(name, canonical);
    }
    return map;
  }

  function snapshotRows(rows, canonicalMap) {
    return rows.map((row) => {
      const canonical = canonicalMap.get(row.person_name) || row.person_name || "";
      const shownPerson = displayPerson(row.person_name);
      const shownPolity = displayPolity(row.politic_name);
      return Object.freeze({
        ...row,
        canonical,
        shownPerson,
        shownPolity,
        rawPersonKey: loose(row.person_name),
        canonicalPersonKey: loose(canonical),
        polityKey: loose(row.politic_name),
        shownPersonKey: loose(shownPerson),
        shownPolityKey: loose(shownPolity),
        start: Number(row.activity_start),
        end: Number(row.activity_end)
      });
    });
  }

  const rawActivityKey = (r) => [r.rawPersonKey, r.polityKey, r.start, r.end].join("\u0001");
  const canonicalActivityKey = (r) => [r.canonicalPersonKey, r.polityKey, r.start, r.end].join("\u0001");
  const renderedActivityKey = (r) => [r.shownPersonKey, r.shownPolityKey, r.start, r.end].join("\u0001");

  function groupExact(rows, keyOf) {
    const map = new Map();
    for (const row of rows) {
      const key = String(keyOf(row));
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return [...map.entries()].map(([key, bucket]) => ({ key, bucket }));
  }

  function duplicateGroups(rows, keyOf) {
    return groupExact(rows, keyOf).filter(({ bucket }) => bucket.length > 1);
  }

  function differentRawNames(bucket) {
    return new Set(bucket.map((r) => r.rawPersonKey)).size > 1;
  }

  function assertGroupIntegrity(groups, keyOf, label) {
    const errors = [];
    for (const group of groups) {
      const keys = new Set(group.bucket.map((row) => String(keyOf(row))));
      if (keys.size !== 1 || !keys.has(group.key)) errors.push(`${label}: 저장 키 ${group.key} / 실제 키 ${[...keys].join(" | ")}`);
    }
    return errors;
  }

  function localeErrors(rows) {
    const errors = Object.entries(expectedLocales)
      .map(([name, expected]) => ({ name, expected, actual: displayPerson(name) }))
      .filter((x) => x.actual !== x.expected)
      .map((x) => `${x.name}: 기대 ${x.expected} / 실제 ${x.actual}`);

    for (const row of rows) {
      if (row.shownPerson !== displayPerson(row.person_name)) errors.push(`${row.person_name}: 스냅샷과 현재 표시값 불일치`);
    }
    return errors;
  }

  function classifyRelations(rows) {
    const samePolity = [], transitions = [], accepted = [], unresolved = [];
    const byCanonical = groupExact(rows, (r) => r.canonicalPersonKey);
    for (const { bucket } of byCanonical) {
      for (let i = 0; i < bucket.length; i += 1) {
        for (let j = i + 1; j < bucket.length; j += 1) {
          const a = bucket[i], b = bucket[j];
          if (canonicalActivityKey(a) === canonicalActivityKey(b)) continue;
          const overlapStart = Math.max(a.start, b.start);
          const overlapEnd = Math.min(a.end, b.end);
          if (overlapStart > overlapEnd) continue;
          if (a.polityKey === b.polityKey) { samePolity.push([a, b]); continue; }
          if (overlapStart === overlapEnd && (a.end === b.start || b.end === a.start)) { transitions.push([a, b]); continue; }
          if (acceptedConcurrent.has(normalize(a.canonical))) accepted.push([a, b]);
          else unresolved.push([a, b]);
        }
      }
    }
    return { samePolity, transitions, accepted, unresolved };
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const area = document.createElement("textarea");
    area.value = text; area.readOnly = true; area.style.position = "fixed"; area.style.opacity = "0";
    document.body.appendChild(area); area.select();
    const ok = document.execCommand("copy"); area.remove();
    if (!ok) throw new Error("클립보드 복사에 실패했습니다.");
  }

  function panelHtml() {
    return `<section class="panel" id="identityLookupPanel"><div class="panel-head"><div><h2>인물 등록 여부 확인</h2><p>Supabase canonical registry와 실제 활동행을 직접 조회합니다.</p></div></div><div class="actions"><input id="identityLookupInput" type="search" placeholder="예: Askia Muhammad / 아스키아 무함마드" style="flex:1;min-width:240px;padding:12px;border:1px solid #cfd6e1;border-radius:8px"/><button id="identityLookupButton" class="button primary" type="button">DB에서 확인</button></div><pre id="identityLookupResult" class="result" aria-live="polite">검색어를 입력하세요.</pre></section><section class="panel" id="integrityAuditPanel"><div class="panel-head"><div><h2>중복·명칭 무결성 검사</h2><p>불변 스냅샷을 생성한 뒤 원본·canonical·실제 표시값을 독립 검사합니다.</p></div><div class="actions"><button id="integrityAuditButton" class="button primary" type="button">중복 검사 실행</button><button id="integrityAuditCopyButton" class="button secondary" type="button" disabled>결과 복사</button></div></div><pre id="integrityAuditResult" class="result" aria-live="polite">검사 대기 중</pre></section>`;
  }

  function installPanels() {
    if (document.getElementById("identityLookupPanel")) return;
    const first = document.querySelector("main .panel");
    if (!first) return;
    first.insertAdjacentHTML("beforebegin", panelHtml());
    document.getElementById("identityLookupButton").addEventListener("click", lookupIdentity);
    document.getElementById("identityLookupInput").addEventListener("keydown", (e) => { if (e.key === "Enter") lookupIdentity(); });
    document.getElementById("integrityAuditButton").addEventListener("click", auditIntegrity);
    document.getElementById("integrityAuditCopyButton").addEventListener("click", async (e) => {
      const text = document.getElementById("integrityAuditResult").textContent.trim();
      const old = e.currentTarget.textContent;
      try { await copyText(text); e.currentTarget.textContent = "복사됨 ✓"; }
      catch (_) { e.currentTarget.textContent = "복사 실패"; }
      setTimeout(() => { e.currentTarget.textContent = old; }, 1400);
    });
  }

  async function lookupIdentity() {
    const input = document.getElementById("identityLookupInput");
    const output = document.getElementById("identityLookupResult");
    const name = input.value.trim();
    if (!name) { output.dataset.type = "error"; output.textContent = "인물명을 입력하세요."; return; }
    output.dataset.type = "info"; output.textContent = "Supabase에서 확인 중...";
    try {
      const { data: resolved } = await db.rpc("resolve_person_identity", { input_name: name });
      const canonical = Array.isArray(resolved) && resolved[0]?.canonical_name ? resolved[0].canonical_name : null;
      const { data: rows, error } = await db.from("person_politics").select("id,person_name,politic_name,activity_start,activity_end");
      if (error) throw error;
      const q = loose(name);
      const matched = (rows || []).filter((r) => [r.person_name, displayPerson(r.person_name), canonical].some((v) => v && loose(v) === q));
      if (!matched.length && !canonical) { output.dataset.type = "error"; output.textContent = `미등록: ${name}`; return; }
      output.dataset.type = "success";
      output.textContent = ["등록됨 ✅", `Canonical name: ${canonical || matched[0]?.person_name || name}`, `Activity rows: ${matched.length}`, "", ...matched.map((r) => `- ${r.person_name} (${displayPerson(r.person_name)}) | ${r.politic_name} (${displayPolity(r.politic_name)}) | ${r.activity_start}–${r.activity_end} | ID ${r.id}`)].join("\n");
    } catch (error) { output.dataset.type = "error"; output.textContent = `조회 실패: ${error.message}`; }
  }

  const rowText = (r) => `${r.person_name} → ${r.canonical} | ${r.shownPerson} | ${r.shownPolity} | ${r.start}–${r.end} | ID ${r.id}`;
  const relationText = ([a,b]) => `- ${a.shownPerson} [${a.person_name} → ${a.canonical}] : ${a.shownPolity} ${a.start}–${a.end} ↔ ${b.shownPolity} ${b.start}–${b.end}`;

  async function auditIntegrity() {
    const button = document.getElementById("integrityAuditButton");
    const copy = document.getElementById("integrityAuditCopyButton");
    const output = document.getElementById("integrityAuditResult");
    button.disabled = true; copy.disabled = true; output.dataset.type = "info";
    output.textContent = "원본·canonical·실제 화면 표시값의 불변 스냅샷을 검사 중...";
    try {
      const { data, error } = await db.from("person_politics").select("id,person_name,politic_name,activity_start,activity_end,role,period_basis");
      if (error) throw error;
      const names = [...new Set((data || []).map((r) => r.person_name).filter(Boolean))];
      const rows = snapshotRows(data || [], await resolveCanonicalMap(names));

      const rawGroups = duplicateGroups(rows, rawActivityKey);
      const canonicalGroups = duplicateGroups(rows, canonicalActivityKey);
      const renderedGroups = duplicateGroups(rows, renderedActivityKey).filter(({ bucket }) => differentRawNames(bucket));
      const sameDisplayGroups = groupExact(rows, (r) => r.shownPersonKey).filter(({ bucket }) => differentRawNames(bucket));
      const aliasGroups = groupExact(rows, (r) => r.canonicalPersonKey).filter(({ bucket }) => differentRawNames(bucket));
      const relations = classifyRelations(rows);
      const invariants = [
        ...assertGroupIntegrity(rawGroups, rawActivityKey, "원본 중복"),
        ...assertGroupIntegrity(canonicalGroups, canonicalActivityKey, "canonical 중복"),
        ...assertGroupIntegrity(renderedGroups, renderedActivityKey, "표시 중복"),
        ...assertGroupIntegrity(sameDisplayGroups, (r) => r.shownPersonKey, "표시명 그룹"),
        ...assertGroupIntegrity(aliasGroups, (r) => r.canonicalPersonKey, "canonical 그룹")
      ];
      const locale = localeErrors(rows);
      const hard = rawGroups.length + canonicalGroups.length + relations.samePolity.length + locale.length + invariants.length;
      const review = renderedGroups.length + sameDisplayGroups.length + aliasGroups.length + relations.unresolved.length;
      const status = hard ? "FAIL ❌" : review ? "PASS WITH REVIEW ⚠️" : "PASS ✅";

      const lines = ["ATLAS DB Integrity Audit — LIVE", "",
        `전체 활동행: ${rows.length}`,
        `고유 원본 저장명: ${new Set(rows.map((r) => r.rawPersonKey)).size}`,
        `고유 canonical 인물: ${new Set(rows.map((r) => r.canonicalPersonKey)).size}`,
        `원본 저장명 정확 중복 묶음: ${rawGroups.length}`,
        `canonical 정확 중복 묶음: ${canonicalGroups.length}`,
        `화면 표시 완전 중복 후보: ${renderedGroups.length}`,
        `동일 화면 인물명 후보: ${sameDisplayGroups.length}`,
        `alias/canonical 통합 후보: ${aliasGroups.length}`,
        `로케일 런타임 불일치: ${locale.length}`,
        `그룹 불변식 오류: ${invariants.length}`,
        `동일 canonical 인물·정치체 기간 충돌: ${relations.samePolity.length}`,
        `정상 정치체 전환: ${relations.transitions.length}`,
        `검토 완료 복수 통치: ${relations.accepted.length}`,
        `미분류 복수 정치체: ${relations.unresolved.length}`, "", `Status: ${status}`];

      if (locale.length) lines.push("", "[오류 — 로케일 런타임 불일치]", ...locale.map((x) => `- ${x}`));
      if (invariants.length) lines.push("", "[오류 — 그룹화 불변식 위반]", ...invariants.map((x) => `- ${x}`));
      if (rawGroups.length) lines.push("", "[오류 — 원본 저장명·정치체·기간 정확 중복]", ...rawGroups.map(({bucket}) => `- ${bucket.map(rowText).join(" ↔ ")}`));
      if (canonicalGroups.length) lines.push("", "[오류 — canonical registry 기준 정확 중복]", ...canonicalGroups.map(({bucket}) => `- ${bucket.map(rowText).join(" ↔ ")}`));
      if (aliasGroups.length) lines.push("", "[검토 — 서로 다른 저장명이 같은 canonical 인물로 통합됨]", ...aliasGroups.map(({bucket}) => `- ${bucket.map(rowText).join(" ↔ ")}`));
      if (sameDisplayGroups.length) lines.push("", "[검토 — 실제 화면에 같은 인물명으로 보이는 서로 다른 저장명]", ...sameDisplayGroups.map(({bucket}) => `- ${bucket[0].shownPerson}: ${bucket.map(rowText).join(" ↔ ")}`));
      if (renderedGroups.length) lines.push("", "[검토 — 실제 화면 표시명·정치체·기간 완전 중복]", ...renderedGroups.map(({bucket}) => `- ${bucket.map(rowText).join(" ↔ ")}`));
      if (relations.samePolity.length) lines.push("", "[오류 — 동일 canonical 인물·정치체 기간 중첩]", ...relations.samePolity.map(relationText));
      if (relations.unresolved.length) lines.push("", "[검토 — 미분류 복수 정치체]", ...relations.unresolved.map(relationText));
      if (relations.accepted.length) lines.push("", "[정상 — 검토 완료 복수 통치·동군연합]", ...relations.accepted.map(relationText));
      if (relations.transitions.length) lines.push("", "[정상 — 같은 연도 정치체 전환]", ...relations.transitions.map(relationText));

      output.dataset.type = hard ? "error" : review ? "info" : "success";
      output.textContent = lines.join("\n"); copy.disabled = false;
    } catch (error) { output.dataset.type = "error"; output.textContent = `검사 실패: ${error.message}`; }
    finally { button.disabled = false; }
  }

  installPanels();
})();
