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
      const key = [row.person_name, row.politic_name, row.activity_start, row.activity_end].join("\u0001").toLowerCase();
      if (keys.has(key)) throw new Error(`입력 배열 내부에 중복이 있습니다: ${row.person_name}`);
      keys.add(key);
    }

    return normalized;
  }

  async function saveRows() {
    const config = window.ATLAS_CONFIG || {};
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !window.supabase) {
      setResult("Supabase 설정을 찾을 수 없습니다.", "error");
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

    const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    let inserted = 0;
    let updated = 0;
    const failures = [];

    for (const row of rows) {
      const { data, error: lookupError } = await db
        .from("person_politics")
        .select("id")
        .eq("person_name", row.person_name)
        .eq("politic_name", row.politic_name)
        .eq("activity_start", row.activity_start)
        .eq("activity_end", row.activity_end)
        .limit(1);

      if (lookupError) {
        failures.push(`${row.person_name}: 조회 실패 - ${lookupError.message}`);
        continue;
      }

      if (data?.length) {
        const { error } = await db.from("person_politics").update(row).eq("id", data[0].id);
        if (error) failures.push(`${row.person_name}: 갱신 실패 - ${error.message}`);
        else updated += 1;
      } else {
        const { error } = await db.from("person_politics").insert(row);
        if (error) failures.push(`${row.person_name}: 추가 실패 - ${error.message}`);
        else inserted += 1;
      }
    }

    const lines = [
      `완료: ${rows.length}개 처리`,
      `신규 추가: ${inserted}`,
      `기존 갱신: ${updated}`,
      `실패: ${failures.length}`
    ];
    if (failures.length) lines.push("", ...failures);
    setResult(lines.join("\n"), failures.length ? "error" : "success");
    saveButton.disabled = false;
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
