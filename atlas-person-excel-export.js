(() => {
  "use strict";

  const XLSX_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
  let xlsxLoadPromise = null;

  function ensureXlsx() {
    if (window.XLSX?.utils && typeof window.XLSX.writeFile === "function") {
      return Promise.resolve(window.XLSX);
    }
    if (xlsxLoadPromise) return xlsxLoadPromise;

    xlsxLoadPromise = new Promise((resolve, reject) => {
      let script = document.querySelector('script[data-atlas-xlsx="true"]');
      const finish = () => {
        if (window.XLSX?.utils && typeof window.XLSX.writeFile === "function") {
          resolve(window.XLSX);
          return;
        }
        script?.remove?.();
        reject(new Error("XLSX_LIBRARY_MISSING_AFTER_LOAD"));
      };
      const fail = () => {
        script?.remove?.();
        reject(new Error("XLSX_LIBRARY_LOAD_FAILED"));
      };

      if (script) {
        script.addEventListener("load", finish, { once:true });
        script.addEventListener("error", fail, { once:true });
        return;
      }

      script = document.createElement("script");
      script.src = XLSX_SCRIPT_URL;
      script.async = true;
      script.dataset.atlasXlsx = "true";
      script.addEventListener("load", finish, { once:true });
      script.addEventListener("error", fail, { once:true });
      document.head.append(script);
    }).catch((error) => {
      xlsxLoadPromise = null;
      throw error;
    });

    return xlsxLoadPromise;
  }

  function buildRows(persons, boundaryLabel) {
    if (!Array.isArray(persons)) throw new Error("PERSON_EXCEL_PERSONS_REQUIRED");
    if (typeof boundaryLabel !== "function") throw new Error("PERSON_EXCEL_BOUNDARY_LABEL_REQUIRED");

    const rows = [];
    for (const person of persons) {
      const activities = Array.isArray(person?.activity_summaries) ? person.activity_summaries : [];
      if (!activities.length) {
        rows.push({
          "인물":person?.display_name || person?.canonical_name_en || "",
          "영문명":person?.canonical_name_en || "",
          "정치체":"",
          "관계":"",
          "역할":"",
          "시작":"",
          "종료":"",
          "기간 기준":""
        });
        continue;
      }

      for (const activity of activities) {
        rows.push({
          "인물":person?.display_name || person?.canonical_name_en || "",
          "영문명":person?.canonical_name_en || "",
          "정치체":activity?.polity?.display_name || activity?.polity?.canonical_name_en || "",
          "관계":activity?.relation?.code || "",
          "역할":activity?.role?.display_name || activity?.role?.source_label || "",
          "시작":boundaryLabel(activity?.start),
          "종료":boundaryLabel(activity?.end),
          "기간 기준":activity?.period_basis?.display_name || activity?.period_basis?.code || ""
        });
      }
    }
    return rows;
  }

  async function exportPersons({ persons, boundaryLabel, fileDate = new Date() } = {}) {
    const rows = buildRows(persons, boundaryLabel);
    const xlsx = await ensureXlsx();
    const ws = xlsx.utils.json_to_sheet(rows);
    ws["!cols"] = [{wch:22},{wch:26},{wch:28},{wch:14},{wch:24},{wch:16},{wch:16},{wch:18}];
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Persons");
    const date = fileDate instanceof Date && !Number.isNaN(fileDate.valueOf())
      ? fileDate.toISOString().slice(0,10)
      : new Date().toISOString().slice(0,10);
    xlsx.writeFile(wb, `atlas-persons-${date}.xlsx`);
    return Object.freeze({ row_count:rows.length, file_date:date });
  }

  window.ATLAS_PERSON_EXCEL_EXPORT = Object.freeze({
    XLSX_SCRIPT_URL,
    ensureXlsx,
    buildRows,
    exportPersons
  });
})();
