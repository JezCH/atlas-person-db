(() => {
  "use strict";

  const config = window.ATLAS_CONFIG || {};
  const configured = config.SUPABASE_URL && config.SUPABASE_ANON_KEY && !config.SUPABASE_URL.includes("YOUR_PROJECT_ID") && !config.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
  const db = configured ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY) : null;
  let records = [];
  let selectedId = null;

  const $ = (id) => document.getElementById(id);
  const els = {
    body: $("dataBody"), empty: $("emptyState"), rowCount: $("rowCount"), status: $("connectionStatus"),
    search: $("searchInput"), filter: $("politicFilter"), dialog: $("editorDialog"), form: $("editorForm"),
    title: $("dialogTitle"), id: $("recordId"), person: $("personName"), politic: $("politicName"),
    start: $("activityStart"), end: $("activityEnd"), role: $("role"), basis: $("periodBasis"), notes: $("notes"),
    error: $("formError"), toast: $("toast"), detailEmpty: $("detailEmpty"), detailContent: $("detailContent"),
    detailPerson: $("detailPerson"), detailPolitic: $("detailPolitic"), detailPeriod: $("detailPeriod"),
    detailRole: $("detailRole"), detailBasis: $("detailBasis"), detailNotes: $("detailNotes"), detailEdit: $("detailEdit")
  };

  const basisLabels = {
    reign: "재위", term: "임기", de_facto_rule: "실권 장악", military_activity: "군사 활동",
    religious_activity: "종교 활동", intellectual_activity: "학술 활동", artistic_activity: "예술 활동",
    general_activity: "주요 활동"
  };

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { els.toast.hidden = true; }, 2600);
  }

  function setStatus(type, text) {
    els.status.className = `status status-${type}`;
    els.status.textContent = text;
  }

  function normalize(value) { return String(value ?? "").trim().toLocaleLowerCase("ko-KR"); }

  function sortRecords(items) {
    return [...items].sort((a, b) =>
      String(a.politic_name).localeCompare(String(b.politic_name), "en", { sensitivity: "base" }) ||
      Number(a.activity_start) - Number(b.activity_start) ||
      Number(a.activity_end) - Number(b.activity_end) ||
      String(a.person_name).localeCompare(String(b.person_name), "ko")
    );
  }

  function formatYear(year) {
    const n = Number(year);
    return n < 0 ? `기원전 ${Math.abs(n)}` : String(n);
  }

  function visibleRecords() {
    const q = normalize(els.search.value);
    const politic = els.filter.value;
    return sortRecords(records.filter((r) => {
      const haystack = normalize([r.person_name, r.politic_name, r.role, r.notes].join(" "));
      return (!q || haystack.includes(q)) && (!politic || r.politic_name === politic);
    }));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  }

  function selectedRecord() {
    return records.find((r) => String(r.id) === String(selectedId)) || null;
  }

  function renderDetail() {
    const record = selectedRecord();
    els.detailEmpty.hidden = Boolean(record);
    els.detailContent.hidden = !record;
    if (!record) return;
    els.detailPerson.textContent = record.person_name;
    els.detailPolitic.textContent = record.politic_name;
    els.detailPeriod.textContent = `${formatYear(record.activity_start)} – ${formatYear(record.activity_end)}`;
    els.detailRole.textContent = record.role || "—";
    els.detailBasis.textContent = basisLabels[record.period_basis] || record.period_basis || "—";
    els.detailNotes.textContent = record.notes || "—";
  }

  function render() {
    const items = visibleRecords();
    els.body.innerHTML = items.map((r) => `
      <tr data-id="${r.id}" class="${String(r.id) === String(selectedId) ? "selected" : ""}" aria-selected="${String(r.id) === String(selectedId)}">
        <td>${escapeHtml(r.person_name)}</td>
        <td>${escapeHtml(r.politic_name)}</td>
        <td>${escapeHtml(formatYear(r.activity_start))}</td>
        <td>${escapeHtml(formatYear(r.activity_end))}</td>
        <td>${escapeHtml(r.role || "")}</td>
        <td>${escapeHtml(basisLabels[r.period_basis] || r.period_basis || "")}</td>
        <td><div class="action-buttons"><button class="mini-btn edit" data-id="${r.id}">수정</button><button class="mini-btn danger delete" data-id="${r.id}">삭제</button></div></td>
      </tr>`).join("");
    els.rowCount.textContent = `${items.length}개 행`;
    els.empty.hidden = items.length !== 0;

    const current = els.filter.value;
    const politics = [...new Set(records.map((r) => r.politic_name).filter(Boolean))].sort((a,b) => a.localeCompare(b, "en", { sensitivity: "base" }));
    els.filter.innerHTML = '<option value="">모든 Politic</option>' + politics.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
    if (politics.includes(current)) els.filter.value = current;
    renderDetail();
  }

  async function loadRecords() {
    if (!db) {
      setStatus("warn", "Supabase 설정 필요");
      records = [];
      render();
      return;
    }
    setStatus("warn", "데이터 불러오는 중");
    const { data, error } = await db.from("person_politics").select("*").order("politic_name").order("activity_start").order("activity_end").order("person_name");
    if (error) {
      console.error(error);
      setStatus("error", "DB 연결 실패");
      showToast(`불러오기 실패: ${error.message}`);
      return;
    }
    records = data || [];
    if (selectedId && !selectedRecord()) selectedId = null;
    setStatus("ok", "온라인 저장 연결됨");
    render();
  }

  function openEditor(record = null) {
    els.form.reset();
    els.error.hidden = true;
    els.id.value = record?.id || "";
    els.title.textContent = record ? "기록 수정" : "인물 관계 추가";
    els.person.value = record?.person_name || "";
    els.politic.value = record?.politic_name || "";
    els.start.value = record?.activity_start ?? "";
    els.end.value = record?.activity_end ?? "";
    els.role.value = record?.role || "";
    els.basis.value = record?.period_basis || "general_activity";
    els.notes.value = record?.notes || "";
    els.dialog.showModal();
    setTimeout(() => els.person.focus(), 20);
  }

  async function saveRecord(event) {
    event.preventDefault();
    if (!db) {
      els.error.textContent = "먼저 config.js에 Supabase URL과 공개 키를 입력해야 합니다.";
      els.error.hidden = false;
      return;
    }
    const start = Number(els.start.value);
    const end = Number(els.end.value);
    if (end < start) {
      els.error.textContent = "활동 종료연도는 시작연도보다 빠를 수 없습니다.";
      els.error.hidden = false;
      return;
    }
    const payload = {
      person_name: els.person.value.trim(), politic_name: els.politic.value.trim(),
      activity_start: start, activity_end: end, role: els.role.value.trim() || null,
      period_basis: els.basis.value, notes: els.notes.value.trim() || null
    };
    const id = els.id.value;
    const query = id ? db.from("person_politics").update(payload).eq("id", id) : db.from("person_politics").insert(payload).select("id").single();
    const { data, error } = await query;
    if (error) {
      els.error.textContent = error.message;
      els.error.hidden = false;
      return;
    }
    if (!id && data?.id) selectedId = data.id;
    if (id) selectedId = id;
    els.dialog.close();
    showToast(id ? "기록을 수정했습니다." : "기록을 추가했습니다.");
    await loadRecords();
  }

  async function deleteRecord(id) {
    if (!db || !confirm("이 기록을 삭제할까요?")) return;
    const { error } = await db.from("person_politics").delete().eq("id", id);
    if (error) return showToast(`삭제 실패: ${error.message}`);
    if (String(selectedId) === String(id)) selectedId = null;
    showToast("기록을 삭제했습니다.");
    await loadRecords();
  }

  function exportExcel() {
    const rows = visibleRecords().map((r) => ({
      "인물": r.person_name, "Politic": r.politic_name, "활동 시작연도": r.activity_start,
      "활동 종료연도": r.activity_end, "역할": r.role || "", "기간 기준": basisLabels[r.period_basis] || r.period_basis || "", "비고": r.notes || ""
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{wch:24},{wch:28},{wch:14},{wch:14},{wch:18},{wch:16},{wch:40}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Person Politics");
    XLSX.writeFile(wb, `atlas-person-db-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function resolveBasis(label) {
    const found = Object.entries(basisLabels).find(([, value]) => normalize(value) === normalize(label));
    return found?.[0] || "general_activity";
  }

  async function importExcel(file) {
    if (!db) return showToast("Supabase 연결 후 불러올 수 있습니다.");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    const payload = rows.map((r) => ({
      person_name: String(r["인물"] || r.person_name || "").trim(), politic_name: String(r["Politic"] || r.politic_name || "").trim(),
      activity_start: Number(r["활동 시작연도"] ?? r.activity_start), activity_end: Number(r["활동 종료연도"] ?? r.activity_end),
      role: String(r["역할"] || r.role || "").trim() || null, period_basis: resolveBasis(r["기간 기준"] || r.period_basis),
      notes: String(r["비고"] || r.notes || "").trim() || null
    })).filter((r) => r.person_name && r.politic_name && Number.isFinite(r.activity_start) && Number.isFinite(r.activity_end) && r.activity_end >= r.activity_start);
    if (!payload.length) return showToast("가져올 수 있는 유효한 행이 없습니다.");
    const { error } = await db.from("person_politics").insert(payload);
    if (error) return showToast(`가져오기 실패: ${error.message}`);
    showToast(`${payload.length}개 행을 가져왔습니다.`);
    await loadRecords();
  }

  $("addButton").addEventListener("click", () => openEditor());
  $("exportButton").addEventListener("click", exportExcel);
  $("importInput").addEventListener("change", (e) => { const file = e.target.files?.[0]; if (file) importExcel(file); e.target.value = ""; });
  $("closeDialog").addEventListener("click", () => els.dialog.close());
  $("cancelButton").addEventListener("click", () => els.dialog.close());
  els.form.addEventListener("submit", saveRecord);
  els.search.addEventListener("input", render);
  els.filter.addEventListener("change", render);
  els.detailEdit.addEventListener("click", () => { const record = selectedRecord(); if (record) openEditor(record); });
  els.body.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-id]");
    if (button) {
      const record = records.find((r) => String(r.id) === String(button.dataset.id));
      if (button.classList.contains("edit")) openEditor(record);
      if (button.classList.contains("delete")) deleteRecord(button.dataset.id);
      return;
    }
    const row = e.target.closest("tr[data-id]");
    if (!row) return;
    selectedId = row.dataset.id;
    render();
  });
  els.body.addEventListener("dblclick", (e) => {
    const row = e.target.closest("tr[data-id]");
    if (row) openEditor(records.find((r) => String(r.id) === String(row.dataset.id)));
  });

  loadRecords();
})();
