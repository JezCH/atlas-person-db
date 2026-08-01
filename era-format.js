(() => {
  "use strict";

  function setTextIfChanged(node, nextValue) {
    if (!node || node.textContent === nextValue) return;
    node.textContent = nextValue;
  }

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
      if (cells[2]) setTextIfChanged(cells[2], formatSingle(cells[2].textContent));
      if (cells[3]) setTextIfChanged(cells[3], formatSingle(cells[3].textContent));
    });
  }

  function updateDetail() {
    const period = document.getElementById("detailPeriod");
    if (period?.textContent.trim()) setTextIfChanged(period, compactRange(period.textContent));
  }

  function updateNonTimelineTable() {
    document.querySelectorAll("#nonTimelineBody tr").forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (!cells[2]) return;
      const nextValue = cells[2].textContent
        .replace(/기원전\s*/g, "BC ")
        .replace(/기원후\s*/g, "AD ")
        .replace(/BC\s+(\d+)\/BC\s+(\d+)/g, "BC $1/$2")
        .replace(/AD\s+(\d+)\/AD\s+(\d+)/g, "AD $1/$2");
      setTextIfChanged(cells[2], nextValue);
    });
  }

  function apply() {
    updateTimelineTable();
    updateDetail();
    updateNonTimelineTable();
  }

  let scheduled = false;
  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }

  function observeTarget(target) {
    if (!target || target.dataset.eraObserverAttached === "1") return;
    target.dataset.eraObserverAttached = "1";
    const observer = new MutationObserver(scheduleApply);
    observer.observe(target, { childList: true, subtree: true, characterData: true });
  }

  function attachObservers() {
    observeTarget(document.getElementById("dataBody"));
    observeTarget(document.getElementById("detailPanel"));
    observeTarget(document.getElementById("nonTimelineSection"));
  }

  function start() {
    apply();
    attachObservers();

    const bodyObserver = new MutationObserver(() => {
      attachObservers();
      scheduleApply();
    });
    bodyObserver.observe(document.body, { childList: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
