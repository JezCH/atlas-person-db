(() => {
  "use strict";

  const ALLOWED_BASIS = new Set([
    "reign",
    "term",
    "de_facto_rule",
    "military_activity",
    "religious_activity",
    "intellectual_activity",
    "artistic_activity",
    "general_activity"
  ]);

  const keyOf = (row) => [
    row.person_name,
    row.politic_name,
    Number(row.activity_start),
    Number(row.activity_end)
  ].join("|");

  function normalize(row) {
    return {
      person_name: String(row.person_name || "").trim(),
      politic_name: String(row.politic_name || "").trim(),
      activity_start: Number(row.activity_start),
      activity_end: Number(row.activity_end),
      role: row.role ? String(row.role).trim() : null,
      period_basis: ALLOWED_BASIS.has(row.period_basis) ? row.period_basis : "general_activity",
      notes: row.notes ? String(row.notes).trim() : null
    };
  }

  function setStatus(button, message, state = "idle") {
    button.dataset.state = state;
    button.textContent = message;
    button.disabled = state === "running";
  }

  async function importSupplement3(button) {
    const config = window.ATLAS_CONFIG || {};
    if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      setStatus(button, "Supabase 연결 없음", "error");
      return;
    }

    setStatus(button, "37명 등록 중…", "running");

    try {
      const response = await fetch(`./pending-records-supplement-3.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`데이터 파일 조회 실패 (${response.status})`);

      const sourceRows = await response.json();
      if (!Array.isArray(sourceRows)) throw new Error("추가 데이터 형식이 배열이 아닙니다.");

      const rows = sourceRows.map(normalize);
      const invalid = rows.filter((row) => !row.person_name || !row.politic_name || !Number.isFinite(row.activity_start) || !Number.isFinite(row.activity_end));
      if (invalid.length) throw new Error(`필수값이 잘못된 행 ${invalid.length}개`);

      const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      const { data: existingRows, error: selectError } = await db
        .from("person_politics")
        .select("id,person_name,politic_name,activity_start,activity_end");
      if (selectError) throw selectError;

      const existingKeys = new Set((existingRows || []).map(keyOf));
      const missing = rows.filter((row) => !existingKeys.has(keyOf(row)));

      if (!missing.length) {
        setStatus(button, `등록 완료 · 추가 0명`, "success");
        setTimeout(() => window.location.reload(), 700);
        return;
      }

      const { data: insertedRows, error: insertError } = await db
        .from("person_politics")
        .insert(missing)
        .select("id");
      if (insertError) throw insertError;

      const inserted = insertedRows?.length ?? missing.length;
      setStatus(button, `등록 완료 · 추가 ${inserted}명`, "success");
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      console.error("Manual supplement import failed", error);
      const message = error?.message || String(error);
      setStatus(button, `등록 실패 · ${message}`, "error");
      button.disabled = false;
    }
  }

  function install() {
    const toolbar = document.querySelector(".toolbar-left");
    if (!toolbar || document.getElementById("manualSupplementImportButton")) return;

    const button = document.createElement("button");
    button.id = "manualSupplementImportButton";
    button.type = "button";
    button.className = "btn btn-primary";
    button.textContent = "37명 추가 등록";
    button.title = "pending-records-supplement-3.json의 누락 인물을 Supabase에 등록합니다.";
    button.addEventListener("click", () => importSupplement3(button));
    toolbar.appendChild(button);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
