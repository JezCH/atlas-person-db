(() => {
  "use strict";

  function formatSingle(value) {
    const text = String(value ?? "").trim();
    if (!text || text === "미상") return text;

    let match = text.match(/^기원전\s*(\d+)$/);
    if (match) return `BC ${match[1]}`;

    match = text.match(/^기원후\s*(\d+)$/);
    if (match) return `AD ${match[1]}`;

    match = text.match(/^(?:AD\s*)?(\d+)$/i);
    if (match) return `AD ${match[1]}`;

    return text
      .replace(/기원전\s*/g, "BC ")
      .replace(/기원후\s*/g, "AD ");
  }

  function compactRange(value) {
    const parts = String(value ?? "").split(/\s*[–—-]\s*/);
    if (parts.length !== 2) return formatSingle(value);

    const start = formatSingle(parts[0]);
    const end = formatSingle(parts[1]);
    const startMatch = start.match(/^(BC|AD)\s+(\d+)$/);
    const endMatch = end.match(/^(BC|AD)\s+(\d+)$/);

    if (startMatch && endMatch && startMatch[1] === endMatch[1]) {
      return `${startMatch[1]} ${startMatch[2]}–${endMatch[2]}`;
    }
    return `${start}–${end}`;
  }

  function updateTimelineTable() {
    document.querySelectorAll("#dataBody tr").forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells[2]) cells[2].textContent = formatSingle(cells[2].textContent);
      if (cells[3]) cells[3].textContent = formatSingle(cells[3].textContent);
    });
  }

  function updateDetail() {
    const period = document.getElementById("detailPeriod");
    if (period?.textContent.trim()) period.textContent = compactRange(period.textContent);
  }

  function updateNonTimelineTable() {
    document.querySelectorAll("#nonTimelineBody tr").forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (!cells[2]) return;
      cells[2].textContent = cells[2].textContent
        .replace(/기원전\s*/g, "BC ")
        .replace(/기원후\s*/g, "AD ")
        .replace(/BC\s+(\d+)\/BC\s+(\d+)/g, "BC $1/$2")
        .replace(/AD\s+(\d+)\/AD\s+(\d+)/g, "AD $1/$2");
    });
  }

  function apply() {
    updateTimelineTable();
    updateDetail();
    updateNonTimelineTable();
  }

  const observer = new MutationObserver(apply);

  function start() {
    apply();
    ["dataBody", "detailPanel", "nonTimelineSection"].forEach((id) => {
      const target = document.getElementById(id);
      if (target) observer.observe(target, { childList: true, subtree: true, characterData: true });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
