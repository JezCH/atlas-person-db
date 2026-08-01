(() => {
  "use strict";

  const formatYear = (value) => {
    const text = String(value ?? "").trim();
    if (!text || text === "미상") return text;
    const bc = text.match(/^(?:기원전|BC)\s*(\d+)$/i);
    if (bc) return `BC ${bc[1]}`;
    const ad = text.match(/^(?:기원후|AD)?\s*(\d+)$/i);
    if (ad) return `AD ${ad[1]}`;
    return text.replace(/기원전\s*/g, "BC ").replace(/기원후\s*/g, "AD ");
  };

  const formatRange = (value) => {
    const parts = String(value ?? "").split(/\s*[–—-]\s*/);
    if (parts.length !== 2) return formatYear(value);
    const start = formatYear(parts[0]);
    const end = formatYear(parts[1]);
    const sm = start.match(/^(BC|AD)\s+(\d+)$/);
    const em = end.match(/^(BC|AD)\s+(\d+)$/);
    if (sm && em && sm[1] === em[1]) return `${sm[1]} ${sm[2]}–${em[2]}`;
    return `${start}–${end}`;
  };

  function apply() {
    document.querySelectorAll("#dataBody tr").forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells[2]) {
        const next = formatYear(cells[2].textContent);
        if (cells[2].textContent !== next) cells[2].textContent = next;
      }
      if (cells[3]) {
        const next = formatYear(cells[3].textContent);
        if (cells[3].textContent !== next) cells[3].textContent = next;
      }
    });

    const detail = document.getElementById("detailPeriod");
    if (detail?.textContent.trim()) {
      const next = formatRange(detail.textContent);
      if (detail.textContent !== next) detail.textContent = next;
    }

    document.querySelectorAll("#nonTimelineBody tr").forEach((row) => {
      const cell = row.querySelectorAll("td")[2];
      if (!cell) return;
      const next = cell.textContent
        .replace(/기원전\s*/g, "BC ")
        .replace(/기원후\s*/g, "AD ")
        .replace(/BC\s+(\d+)\/BC\s+(\d+)/g, "BC $1/$2")
        .replace(/AD\s+(\d+)\/AD\s+(\d+)/g, "AD $1/$2");
      if (cell.textContent !== next) cell.textContent = next;
    });
  }

  let scheduled = false;
  const scheduleApply = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  };

  function observe(id) {
    const target = document.getElementById(id);
    if (!target) return;
    new MutationObserver(scheduleApply).observe(target, { childList: true, subtree: true });
  }

  function start() {
    apply();
    observe("dataBody");
    observe("detailPanel");
    observe("nonTimelineSection");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
