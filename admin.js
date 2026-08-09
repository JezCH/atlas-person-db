(() => {
  "use strict";

  const input = document.getElementById("jsonInput");
  const result = document.getElementById("result");
  const validateButton = document.getElementById("validateButton");
  const saveButton = document.getElementById("saveButton");
  const sampleButton = document.getElementById("sampleButton");

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

    return rows.map((row, index) => {
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
  }

  async function saveRows() {
    const config = window.ATLAS_CONFIG || {};
    const adapterApi = window.ATLAS_SERVER_WRITE_ADAPTER;
    const serviceApi = window.ATLAS_ADMIN_WRITE_SERVICE;

    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !window.supabase) {
      setResult("Supabase 읽기 설정을 찾을 수 없습니다.", "error");
      return;
    }
    if (!adapterApi || !serviceApi) {
      setResult("ATLAS 인증 서버 쓰기 계층을 불러오지 못했습니다.", "error");
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
      const service = serviceApi.createAdminWriteService({ db, adapterApi });
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

  saveButton.addEventListener("click", saveRows);
})();
