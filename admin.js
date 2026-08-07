(() => {
  "use strict";

  const input = document.getElementById("jsonInput");
  const result = document.getElementById("result");
  const verifyResult = document.getElementById("verifyResult");
  const validateButton = document.getElementById("validateButton");
  const saveButton = document.getElementById("saveButton");
  const sampleButton = document.getElementById("sampleButton");
  const verifyButton = document.getElementById("verifyButton");

  const allowedBasis = new Set([
    "reign", "term", "de_facto_rule", "military_activity",
    "religious_activity", "intellectual_activity", "artistic_activity",
    "general_activity"
  ]);

  const sample = [{
    person_name: "Mahatma Gandhi",
    politic_name: "British Raj",
    activity_start: 1915,
    activity_end: 1948,
    role: "Political leader and independence movement leader",
    period_basis: "general_activity",
    notes: "Returned to India in 1915 and remained politically active until his assassination in 1948."
  }];

  function setResult(message, type = "info") {
    result.textContent = message;
    result.dataset.type = type;
  }

  function setVerifyResult(message, type = "info") {
    verifyResult.textContent = message;
    verifyResult.dataset.type = type;
  }

  function activityKey(row) {
    return [row.person_name, row.politic_name, Number(row.activity_start), Number(row.activity_end)]
      .join("\u0001")
      .toLowerCase();
  }

  function normalizeName(value) {
    return String(value || "").trim().toLowerCase();
  }

  function parseAndValidate() {
    let rows;
    try {
      rows = JSON.parse(input.value);
    } catch (error) {
      throw new Error(`JSON 문법 오류: ${error.message}`);
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("최상위 값은 비어 있지 않은 JSON 배열이어야 합니다.");
    }

    const normalized = rows.map((row, index) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new Error(`${index + 1}번째 항목이 객체가 아닙니다.`);
      }

      const personName = String(row.person_name || "").trim();
      const politicName = String(row.politic_name || "").trim();
      const start = Number(row.activity_start);
      const end = Number(row.activity_end);
      const basis = String(row.period_basis || "").trim();

      if (!personName) throw new Error(`${index + 1}번째 항목에 person_name이 없습니다.`);
      if (!politicName) throw new Error(`${index + 1}번째 항목에 politic_name이 없습니다.`);
      if (!Number.isInteger(start) || !Number.isInteger(end)) throw new Error(`${index + 1}번째 연도는 정수여야 합니다.`);
      if (end < start) throw new Error(`${index + 1}번째 종료연도가 시작연도보다 빠릅니다.`);
      if (!allowedBasis.has(basis)) throw new Error(`${index + 1}번째 period_basis 값이 허용 목록에 없습니다: ${basis}`);

      return {
        person_name: personName,
        politic_name: politicName,
        activity_start: start,
        activity_end: end,
        role: String(row.role || "").trim() || null,
        period_basis: basis,
        notes: String(row.notes || "").trim() || null
      };
    });

    const keys = new Set();
    for (const row of normalized) {
      const key = activityKey(row);
      if (keys.has(key)) throw new Error(`입력 배열 내부에 중복이 있습니다: ${row.person_name}`);
      keys.add(key);
    }

    return normalized;
  }

  async function fetchJson(path) {
    const response = await fetch(`${path}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} 불러오기 실패 (${response.status})`);
    return response.json();
  }

  function duplicateActivityKeys(rows) {
    const counts = new Map();
    for (const row of rows) {
      const key = activityKey(row);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].filter(([, count]) => count > 1).map(([key, count]) => ({ key, count }));
  }

  function invalidRows(rows) {
    return rows.filter((row) =>
      !String(row.person_name || "").trim() ||
      !String(row.politic_name || "").trim() ||
      !Number.isInteger(Number(row.activity_start)) ||
      !Number.isInteger(Number(row.activity_end)) ||
      Number(row.activity_end) < Number(row.activity_start) ||
      !allowedBasis.has(String(row.period_basis || ""))
    );
  }

  async function verifyDatabase() {
    const config = window.ATLAS_CONFIG || {};
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !window.supabase) {
      setVerifyResult("Supabase 설정을 찾을 수 없습니다.", "error");
      return;
    }

    verifyButton.disabled = true;
    setVerifyResult("등록 기준과 실제 DB를 대조하는 중...");

    try {
      const [expectedRaw, pendingRaw] = await Promise.all([
        fetchJson("./expected-persons.json"),
        fetchJson("./pending-records.json")
      ]);

      if (!Array.isArray(expectedRaw) || !Array.isArray(pendingRaw)) {
        throw new Error("검증 기준 파일 형식이 배열이 아닙니다.");
      }

      const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      const { data: dbRows, error } = await db.from("person_politics").select("*");
      if (error) throw new Error(`Supabase 조회 실패: ${error.message}`);

      const expectedNames = [...new Set(expectedRaw.map((name) => String(name).trim()).filter(Boolean))];
      const pendingRows = pendingRaw;
      const actualRows = dbRows || [];

      const pendingNameMap = new Map(pendingRows.map((row) => [normalizeName(row.person_name), row.person_name]));
      const actualNameMap = new Map(actualRows.map((row) => [normalizeName(row.person_name), row.person_name]));
      const expectedNameSet = new Set(expectedNames.map(normalizeName));

      const missingFromPending = expectedNames.filter((name) => !pendingNameMap.has(normalizeName(name)));
      const missingFromDb = expectedNames.filter((name) => !actualNameMap.has(normalizeName(name)));
      const extraInDb = [...actualNameMap.entries()]
        .filter(([key]) => !expectedNameSet.has(key))
        .map(([, display]) => display)
        .sort();

      const pendingKeys = new Map(pendingRows.map((row) => [activityKey(row), row]));
      const actualKeys = new Map(actualRows.map((row) => [activityKey(row), row]));
      const missingActivities = pendingRows.filter((row) => !actualKeys.has(activityKey(row)));
      const extraActivities = actualRows.filter((row) => !pendingKeys.has(activityKey(row)));

      const pendingDuplicates = duplicateActivityKeys(pendingRows);
      const dbDuplicates = duplicateActivityKeys(actualRows);
      const pendingInvalid = invalidRows(pendingRows);
      const dbInvalid = invalidRows(actualRows);

      const failures =
        missingFromPending.length + missingFromDb.length + missingActivities.length +
        pendingDuplicates.length + dbDuplicates.length + pendingInvalid.length + dbInvalid.length;

      const lines = [
        "ATLAS Database Verification",
        "",
        `Expected persons : ${expectedNames.length}`,
        `Pending persons  : ${pendingNameMap.size}`,
        `DB persons       : ${actualNameMap.size}`,
        `Pending activities: ${pendingRows.length}`,
        `DB activities     : ${actualRows.length}`,
        "",
        `Missing from GitHub data : ${missingFromPending.length}`,
        `Missing from Supabase    : ${missingFromDb.length}`,
        `Missing activity rows    : ${missingActivities.length}`,
        `Duplicate pending rows   : ${pendingDuplicates.length}`,
        `Duplicate DB rows        : ${dbDuplicates.length}`,
        `Invalid pending rows     : ${pendingInvalid.length}`,
        `Invalid DB rows          : ${dbInvalid.length}`,
        `Extra DB persons         : ${extraInDb.length}`,
        `Extra DB activity rows   : ${extraActivities.length}`,
        "",
        `Status: ${failures === 0 ? "PASS ✅" : "FAIL ❌"}`
      ];

      if (missingFromPending.length) lines.push("", "[GitHub 데이터 누락]", ...missingFromPending.map((name) => `- ${name}`));
      if (missingFromDb.length) lines.push("", "[Supabase 누락]", ...missingFromDb.map((name) => `- ${name}`));
      if (missingActivities.length) lines.push("", "[Supabase 활동행 누락]", ...missingActivities.map((row) => `- ${row.person_name} | ${row.politic_name} | ${row.activity_start}–${row.activity_end}`));
      if (dbDuplicates.length) lines.push("", "[DB 중복 활동행]", ...dbDuplicates.map((item) => `- ${item.key.replaceAll("\u0001", " | ")} × ${item.count}`));
      if (pendingDuplicates.length) lines.push("", "[GitHub 중복 활동행]", ...pendingDuplicates.map((item) => `- ${item.key.replaceAll("\u0001", " | ")} × ${item.count}`));
      if (extraInDb.length) lines.push("", "[기준 명단 외 DB 인물]", ...extraInDb.map((name) => `- ${name}`));

      setVerifyResult(lines.join("\n"), failures === 0 ? "success" : "error");
    } catch (error) {
      setVerifyResult(error.message, "error");
    } finally {
      verifyButton.disabled = false;
    }
  }

  async function saveRows() {
    const config = window.ATLAS_CONFIG || {};
    const adapterApi = window.ATLAS_WRITE_ADAPTER;
    const modeApi = window.ATLAS_WRITE_MODE;
    const shadowApi = window.ATLAS_V2_SHADOW_COMPILER;
    const serviceApi = window.ATLAS_ADMIN_WRITE_SERVICE;

    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !window.supabase) {
      setResult("Supabase 설정을 찾을 수 없습니다.", "error");
      return;
    }
    if (!adapterApi || !modeApi || !shadowApi || !serviceApi) {
      setResult("ATLAS 쓰기 계층을 불러오지 못했습니다.", "error");
      return;
    }

    let rows;
    try {
      rows = parseAndValidate();
    } catch (error) {
      setResult(error.message, "error");
      return;
    }

    saveButton.disabled = true;
    setResult(`${rows.length}개 레코드를 처리하는 중...`);

    try {
      const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      const service = serviceApi.createAdminWriteService({
        db,
        adapterApi,
        mode: "shadow-validate",
        modeResolver: modeApi.resolveMode,
        shadowCompiler: shadowApi.compile
      });
      const outcome = await service.saveRows(rows);
      const lines = [
        `완료: ${rows.length}개 처리`,
        `신규 추가: ${outcome.inserted}`,
        `기존 갱신: ${outcome.updated}`,
        `실패: ${outcome.failures.length}`,
        `쓰기 모드: ${outcome.mode}`
      ];
      if (outcome.failures.length) lines.push("", ...outcome.failures);
      setResult(lines.join("\n"), outcome.failures.length ? "error" : "success");
    } catch (error) {
      setResult(error.message, "error");
    } finally {
      saveButton.disabled = false;
    }
  }

  sampleButton.addEventListener("click", () => {
    input.value = JSON.stringify(sample, null, 2);
    setResult("예시를 불러왔습니다.");
  });

  validateButton.addEventListener("click", () => {
    try {
      const rows = parseAndValidate();
      setResult(`형식 정상: ${rows.length}개 레코드`, "success");
    } catch (error) {
      setResult(error.message, "error");
    }
  });

  verifyButton.addEventListener("click", verifyDatabase);
  saveButton.addEventListener("click", saveRows);
})();
