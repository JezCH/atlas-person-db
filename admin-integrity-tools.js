(() => {
  "use strict";

  const config = window.ATLAS_CONFIG || {};
  if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return;
  const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

  const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const activityKey = (row) => [normalize(row.person_name), normalize(row.politic_name), Number(row.activity_start), Number(row.activity_end)].join("\u0001");

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
            <p>정확히 중복된 활동행, 표기 변형, 겹치는 기간을 실제 DB에서 검사합니다.</p>
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
        `등록됨 ✅`,
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

  function overlaps(rows) {
    const byPerson = new Map();
    for (const row of rows) {
      const key = normalize(row.person_name);
      const bucket = byPerson.get(key) || [];
      bucket.push(row);
      byPerson.set(key, bucket);
    }
    const found = [];
    for (const bucket of byPerson.values()) {
      for (let i = 0; i < bucket.length; i += 1) {
        for (let j = i + 1; j < bucket.length; j += 1) {
          const a = bucket[i];
          const b = bucket[j];
          if (Math.max(Number(a.activity_start), Number(b.activity_start)) <= Math.min(Number(a.activity_end), Number(b.activity_end))) {
            if (activityKey(a) !== activityKey(b)) found.push([a, b]);
          }
        }
      }
    }
    return found;
  }

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
      const periodOverlaps = overlaps(actual);

      const lines = [
        "ATLAS DB Integrity Audit — LIVE",
        "",
        `전체 활동행: ${actual.length}`,
        `고유 인물: ${new Set(actual.map((row) => normalize(row.person_name))).size}`,
        `정확 중복 묶음: ${duplicates.length}`,
        `대소문자·공백 표기 변형: ${variants.length}`,
        `기간 중첩 검토 대상: ${periodOverlaps.length}`,
        "",
        `Status: ${duplicates.length === 0 && variants.length === 0 ? "PASS ✅" : "FAIL ❌"}`
      ];

      if (duplicates.length) {
        lines.push("", "[정확 중복 활동행]");
        duplicates.forEach((bucket) => lines.push(`- ${bucket[0].person_name} | ${bucket[0].politic_name} | ${bucket[0].activity_start}–${bucket[0].activity_end} | IDs ${bucket.map((row) => row.id).join(", ")}`));
      }
      if (variants.length) {
        lines.push("", "[동일 정규화명 표기 변형]");
        variants.forEach(([, names]) => lines.push(`- ${[...names].join(" / ")}`));
      }
      if (periodOverlaps.length) {
        lines.push("", "[기간 중첩 — 오류가 아니라 수동 검토 대상]");
        periodOverlaps.slice(0, 100).forEach(([a, b]) => lines.push(`- ${a.person_name}: ${a.politic_name} ${a.activity_start}–${a.activity_end} ↔ ${b.politic_name} ${b.activity_start}–${b.activity_end}`));
        if (periodOverlaps.length > 100) lines.push(`- ...그 외 ${periodOverlaps.length - 100}건`);
      }

      output.dataset.type = duplicates.length === 0 && variants.length === 0 ? "success" : "error";
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
