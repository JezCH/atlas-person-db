(() => {
  "use strict";

  const config = window.ATLAS_CONFIG || {};
  const configured = config.SUPABASE_URL && config.SUPABASE_ANON_KEY && !config.SUPABASE_URL.includes("YOUR_PROJECT_ID") && !config.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
  const db = configured ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY) : null;
  const writeAdapter = window.ATLAS_SERVER_WRITE_ADAPTER
    ? window.ATLAS_SERVER_WRITE_ADAPTER.createAdapter()
    : null;
  let records = [];
  let selectedId = null;

  const $ = (id) => document.getElementById(id);
  const els = {
    body: $("dataBody"), empty: $("emptyState"), rowCount: $("rowCount"), status: $("connectionStatus"),
    search: $("searchInput"), filter: $("politicFilter"), dialog: $("editorDialog"), form: $("editorForm"),
    title: $("dialogTitle"), id: $("recordId"), person: $("personName"), politic: $("politicName"),
    start: $("activityStart"), end: $("activityEnd"), role: $("role"), basis: $("periodBasis"), notes: $("notes"),
    error: $("formError"), toast: $("toast"), detailEmpty: $("detailEmpty"), detailContent: $("detailContent"),
    detailPerson: $("detailPerson"), detailPolitic: $("detailPolitic"),
    detailRole: $("detailRole"), detailBasis: $("detailBasis"), detailNotes: $("detailNotes"), detailEdit: $("detailEdit"),
    detailSummaryPolitic: $("detailSummaryPolitic"), detailSummaryStart: $("detailSummaryStart"), detailSummaryEnd: $("detailSummaryEnd"),
    detailPeriodStart: $("detailPeriodStart"), detailPeriodEnd: $("detailPeriodEnd")
  };

  const basisLabels = {
    reign: "재위", term: "임기", de_facto_rule: "실권 장악", military_activity: "군사 활동",
    religious_activity: "종교 활동", intellectual_activity: "학술 활동", artistic_activity: "예술 활동",
    general_activity: "주요 활동"
  };

  function localeMap(type) {
    return window.ATLAS_LOCALES?.ko?.[type] || {};
  }

  function displayPerson(value) {
    return localeMap("persons")[value] || value || "";
  }

  function displayPolitic(value) {
    return localeMap("polities")[value] || value || "";
  }

  function withDisplayValues(record) {
    return {
      ...record,
      display_person: displayPerson(record.person_name),
      display_politic: displayPolitic(record.politic_name)
    };
  }

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

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’‘`´]/g, "'")
      .replace(/[‐‑‒–—―]/g, "-")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .toLocaleLowerCase("ko-KR");
  }

  function compact(value) {
    return normalize(value).replace(/\s+/g, "");
  }

  function rowMatches(row, query) {
    if (!String(query ?? "").trim()) return true;
    const normalizedRow = normalize(row.textContent || "");
    const compactRow = normalizedRow.replace(/\s+/g, "");
    const normalizedQuery = normalize(query);
    const compactQuery = compact(query);
    if (compactQuery && compactRow.includes(compactQuery)) return true;
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    return tokens.length > 0 && tokens.every((token) => normalizedRow.includes(token));
  }

  function sortRecords(items) {
    return [...items].sort((a, b) =>
      String(a.politic_name).localeCompare(String(b.politic_name), "en", { sensitivity: "base" }) ||
      Number(a.activity_start) - Number(b.activity_start) ||
      Number(a.activity_end) - Number(b.activity_end) ||
      String(a.person_name).localeCompare(String(b.person_name), "ko")
    );
  }

  function yearEra(year) {
    return Number(year) < 0 ? "BC" : "AD";
  }

  function yearNumber(year) {
    return Math.abs(Number(year));
  }

  function formatYear(year) {
    return `${yearEra(year)} ${yearNumber(year)}`;
  }

  function setPeriodParts(start, end, startEl, endEl) {
    const startEra = yearEra(start);
    const endEra = yearEra(end);
    startEl.textContent = `${startEra} ${yearNumber(start)}`;
    endEl.textContent = startEra === endEra ? String(yearNumber(end)) : `${endEra} ${yearNumber(end)}`;
  }

  function visibleRecords() {
    const politic = els.filter.value;
    return sortRecords(records.filter((r) => !politic || r.politic_name === politic));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  }

  function selectedRecord() {
    return records.find((r) => String(r.id) === String(selectedId)) || null;
  }

  function renderDetail() {
    const record = selectedRecord();
    els.detailEmpty.hidden = Boolean(record);
    els.detailContent.hidden = !record;
    if (!record) return;
    const view = withDisplayValues(record);
    els.detailPerson.textContent = view.display_person;
    els.detailPolitic.textContent = view.display_politic;
    els.detailSummaryPolitic.textContent = view.display_politic;
    setPeriodParts(record.activity_start, record.activity_end, els.detailSummaryStart, els.detailSummaryEnd);
    setPeriodParts(record.activity_start, record.activity_end, els.detailPeriodStart, els.detailPeriodEnd);
    els.detailRole.textContent = record.role || "—";
    els.detailBasis.textContent = basisLabels[record.period_basis] || record.period_basis || "—";
    els.detailNotes.textContent = record.notes || "";
  }

  function applyRenderedSearch() {
    const query = els.search.value;
    let count = 0;
    els.body.querySelectorAll("tr[data-id]").forEach((row) => {
      const matched = rowMatches(row, query);
      row.hidden = !matched;
      if (matched) count += 1;
    });
    els.rowCount.textContent = `${count}개 행`;
    els.empty.hidden = count !== 0;
  }

  function render() {
    const items = visibleRecords();
    els.body.innerHTML = items.map((r) => {
      const view = withDisplayValues(r);
      return `
      <tr data-id="${r.id}" class="${String(r.id) === String(selectedId) ? "selected" : ""}" aria-selected="${String(r.id) === String(selectedId)}">
        <td>${escapeHtml(view.display_person)}</td>
        <td>${escapeHtml(view.display_politic)}</td>
        <td>${escapeHtml(formatYear(r.activity_start))}</td>
        <td>${escapeHtml(formatYear(r.activity_end))}</td>
        <td title="${escapeHtml(r.role || "")}">${escapeHtml(r.role || "")}</td>
        <td>${escapeHtml(basisLabels[r.period_basis] || r.period_basis || "")}</td>
        <td><div class="action-buttons"><button class="mini-btn edit" data-id="${r.id}">수정</button><button class="mini-btn danger delete" data-id="${r.id}">삭제</button></div></td>
      </tr>`;
    }).join("");

    const current = els.filter.value;
    const politics = [...new Set(records.map((r) => r.politic_name).filter(Boolean))].sort((a,b) => a.localeCompare(b, "en", { sensitivity: "base" }));
    els.filter.innerHTML = '<option value="">모든 정치체</option>' + politics.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(displayPolitic(p))}</option>`).join("");
    if (politics.includes(current)) els.filter.value = current;
    applyRenderedSearch();
    renderDetail();
  }

  async function loadRecords() {
    if (!db) {
      setStatus("warn", "Supabase 설정 필요");
      records = [];
      render();
      return;
    }
    if (!window.AtlasReader) {
      setStatus("error", "Reader 모듈 누락");
      showToast("데이터 리더 모듈을 불러오지 못했습니다.");
      return;
    }
    setStatus("warn", "데이터 불러오는 중");
    const result = await window.AtlasReader.loadPersonPolitics({
      client: db,
      source: window.ATLAS_DATA_SOURCE || "legacy",
      fallbackToLegacy: true
    });
    if (result.error) {
      console.error(result.error, result.diagnostics || []);
      setStatus("error", "DB 연결 실패");
      showToast(`불러오기 실패: ${result.error.message}`);
      return;
    }
    records = result.data || [];
    if (selectedId && !selectedRecord()) selectedId = null;
    if ((result.diagnostics || []).length) console.warn("AtlasReader diagnostics", result.diagnostics);
    setStatus("ok", result.source === "v2-shadow" ? "V2 연결됨" : "온라인 저장 연결됨");
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

  function adapterError(result) {
    return result?.errors?.length ? result.errors.join("; ") : "쓰기 작업이 완료되지 않았습니다.";
  }

  function mutationSucceeded(outcome) {
    return outcome?.committed === true
      && outcome?.v2?.committed === true
      && !outcome?.errors?.length;
  }

  async function saveRecord(event) {
    event.preventDefault();
    if (!db || !writeAdapter) {
      els.error.textContent = "ATLAS 쓰기 계층을 사용할 수 없습니다.";
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
    const outcome = id
      ? await writeAdapter.updateActivity(id, payload)
      : await writeAdapter.createActivity(payload);
    if (!mutationSucceeded(outcome)) {
      els.error.textContent = adapterError(outcome);
      els.error.hidden = false;
      return;
    }
    if (!id && outcome.v2.normalized_relationship_ids?.length) selectedId = outcome.v2.normalized_relationship_ids[0];
    if (id) selectedId = id;
    els.dialog.close();
    showToast(id ? "기록을 수정했습니다." : "기록을 추가했습니다.");
    await loadRecords();
  }

  async function deleteRecord(id) {
    if (!db || !writeAdapter || !confirm("이 기록을 삭제할까요?")) return;
    const outcome = await writeAdapter.deleteActivity(id);
    if (!mutationSucceeded(outcome)) return showToast(`삭제 실패: ${adapterError(outcome)}`);
    if (String(selectedId) === String(id)) selectedId = null;
    showToast("기록을 삭제했습니다.");
    await loadRecords();
  }

  function exportExcel() {
    const visibleIds = new Set([...els.body.querySelectorAll("tr[data-id]:not([hidden])")].map((row) => String(row.dataset.id)));
    const rows = visibleRecords().filter((r) => visibleIds.has(String(r.id))).map((r) => ({
      "인물": r.person_name, "정치체": r.politic_name, "활동 시작연도": r.activity_start,
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
    if (!db || !writeAdapter) return showToast("ATLAS 쓰기 계층을 사용할 수 없습니다.");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    const payload = rows.map((r) => ({
      person_name: String(r["인물"] || r.person_name || "").trim(), politic_name: String(r["정치체"] || r["Politic"] || r.politic_name || "").trim(),
      activity_start: Number(r["활동 시작연도"] ?? r.activity_start), activity_end: Number(r["활동 종료연도"] ?? r.activity_end),
      role: String(r["역할"] || r.role || "").trim() || null, period_basis: resolveBasis(r["기간 기준"] || r.period_basis),
      notes: String(r["비고"] || r.notes || "").trim() || null
    })).filter((r) => r.person_name && r.politic_name && Number.isFinite(r.activity_start) && Number.isFinite(r.activity_end) && r.activity_end >= r.activity_start);
    if (!payload.length) return showToast("가져올 수 있는 유효한 행이 없습니다.");
    const outcome = await writeAdapter.importActivities(payload);
    if (!mutationSucceeded(outcome)) return showToast(`가져오기 실패: ${adapterError(outcome)}`);
    showToast(`${payload.length}개 행을 가져왔습니다.`);
    await loadRecords();
  }

  $("addButton").addEventListener("click", () => openEditor());
  $("exportButton").addEventListener("click", exportExcel);
  $("importInput").addEventListener("change", (e) => { const file = e.target.files?.[0]; if (file) importExcel(file); e.target.value = ""; });
  $("closeDialog").addEventListener("click", () => els.dialog.close());
  $("cancelButton").addEventListener("click", () => els.dialog.close());
  els.form.addEventListener("submit", saveRecord);
  els.filter.addEventListener("change", render);
  els.search.addEventListener("input", applyRenderedSearch);
  els.body.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    const row = event.target.closest("tr[data-id]");
    if (button?.classList.contains("edit")) return openEditor(records.find((r) => String(r.id) === String(button.dataset.id)));
    if (button?.classList.contains("delete")) return deleteRecord(button.dataset.id);
    if (row) {
      selectedId = row.dataset.id;
      render();
    }
  });
  els.detailEdit.addEventListener("click", () => {
    const record = selectedRecord();
    if (record) openEditor(record);
  });

  loadRecords();
})();
