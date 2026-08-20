(() => {
  "use strict";

  const READ_ENDPOINT = "/api/atlas-person-read";
  const referencesByPersonId = Object.freeze({
    "da0303c2-1faf-40b8-9dc2-1325b77488d7": Object.freeze({
      namuwiki: Object.freeze({
        status: "linked",
        checked_at: "2026-08-21",
        document_title: "임호텝",
        url: "https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D"
      }),
      links: Object.freeze([
        Object.freeze({
          provider: "namuwiki",
          label: "나무위키",
          url: "https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D"
        })
      ])
    })
  });

  let liveReferencesByPersonId = Object.freeze({});
  let liveReferencesLoaded = false;

  function safeHttpUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    try {
      const url = new URL(raw, window.location.href);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  }

  function normalizeNamuWiki(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const status = String(raw.status || "").trim();
    if (status !== "linked" && status !== "not_found") return null;
    const checkedAt = String(raw.checked_at || "").trim() || null;
    if (status === "not_found") {
      return Object.freeze({
        namuwiki: Object.freeze({ status, checked_at:checkedAt }),
        links: Object.freeze([])
      });
    }
    const url = safeHttpUrl(raw.url);
    const documentTitle = String(raw.document_title || "").trim();
    if (!url || !documentTitle) return null;
    return Object.freeze({
      namuwiki: Object.freeze({ status, checked_at:checkedAt, document_title:documentTitle, url }),
      links: Object.freeze([Object.freeze({ provider:"namuwiki", label:"나무위키", url })])
    });
  }

  function inlineEntry(person) {
    return normalizeNamuWiki(person?.external_references?.namuwiki);
  }

  function entryForPerson(person) {
    const inline = inlineEntry(person);
    if (inline) return inline;
    const id = String(person?.id || "").trim().toLowerCase();
    return liveReferencesByPersonId[id] || referencesByPersonId[id] || null;
  }

  function linksForPerson(person) {
    return entryForPerson(person)?.links || [];
  }

  function linkForPerson(person, provider) {
    const wanted = String(provider || "").trim().toLowerCase();
    return linksForPerson(person).find((link) => String(link.provider || "").toLowerCase() === wanted) || null;
  }

  function statusForPerson(person, provider = "namuwiki") {
    const wanted = String(provider || "").trim().toLowerCase();
    if (wanted !== "namuwiki") return null;
    return entryForPerson(person)?.namuwiki || null;
  }

  function decorateMainTable() {
    if (!liveReferencesLoaded || typeof document === "undefined" || typeof document.querySelectorAll !== "function") return;
    for (const row of document.querySelectorAll(".person-card[data-person-id]")) {
      const person = { id:row.dataset?.personId || "" };
      const status = statusForPerson(person, "namuwiki");
      if (!status) continue;
      row.dataset.namuwikiStatus = status.status;
      const name = row.querySelector(".person-table-identity > strong, :scope > strong");
      if (!name || status.status !== "linked" || name.querySelector(":scope > a.person-main-name-link")) continue;
      const reference = linkForPerson(person, "namuwiki");
      const href = safeHttpUrl(reference?.url);
      if (!href) continue;
      const label = String(name.textContent || "").trim();
      if (!label) continue;
      const link = document.createElement("a");
      link.className = "person-main-name-link";
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = "나무위키에서 보기";
      link.textContent = label;
      link.addEventListener("click", (event) => event.stopPropagation());
      name.textContent = "";
      name.append(link);
    }
  }

  async function loadLiveReferences() {
    if (typeof fetch !== "function") return;
    try {
      const response = await fetch(READ_ENDPOINT, {
        method:"GET",
        credentials:"same-origin",
        cache:"no-store",
        headers:{ accept:"application/json" }
      });
      const payload = await response.json();
      if (!response.ok || payload?.ok !== true || payload?.mode !== "list" || !Array.isArray(payload.persons)) {
        throw new Error(`Person read failed (${response.status})`);
      }
      const next = {};
      for (const person of payload.persons) {
        const id = String(person?.id || "").trim().toLowerCase();
        const entry = inlineEntry(person);
        if (id && entry) next[id] = entry;
      }
      liveReferencesByPersonId = Object.freeze(next);
      liveReferencesLoaded = true;
      queueMicrotask(decorateMainTable);
      window.dispatchEvent(new CustomEvent("atlas-person-external-references-ready"));
    } catch (error) {
      console.error("ATLAS Person external references could not be loaded", error);
    }
  }

  window.addEventListener("atlas-person-main-rendered", () => queueMicrotask(decorateMainTable));

  window.ATLAS_PERSON_EXTERNAL_REFERENCES = Object.freeze({
    entryForPerson,
    linksForPerson,
    linkForPerson,
    statusForPerson,
    decorateMainTable,
    liveReferencesLoaded: () => liveReferencesLoaded
  });

  loadLiveReferences();
})();
