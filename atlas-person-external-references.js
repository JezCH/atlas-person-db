(() => {
  "use strict";

  const REGISTRY_URL = "./authoring/person-namuwiki-registry.json";
  const REGISTRY_SCHEMA = "atlas-person-namuwiki-registry/v1";
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

  let referencesByCanonicalName = Object.freeze({});
  let registryLoaded = false;

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

  function normalizeRegistryEntry(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const status = String(raw.status || "").trim();
    if (status !== "linked" && status !== "not_found") return null;
    const checkedAt = String(raw.checked_at || "").trim() || null;
    if (status === "not_found") {
      return Object.freeze({
        namuwiki: Object.freeze({ status, checked_at: checkedAt }),
        links: Object.freeze([])
      });
    }
    const url = safeHttpUrl(raw.url);
    const documentTitle = String(raw.document_title || "").trim();
    if (!url || !documentTitle) return null;
    return Object.freeze({
      namuwiki: Object.freeze({ status, checked_at: checkedAt, document_title: documentTitle, url }),
      links: Object.freeze([Object.freeze({ provider: "namuwiki", label: "나무위키", url })])
    });
  }

  function entryForPerson(person) {
    const canonicalName = String(person?.canonical_name_en || "").trim();
    if (canonicalName && referencesByCanonicalName[canonicalName]) return referencesByCanonicalName[canonicalName];
    const id = String(person?.id || "").trim().toLowerCase();
    return referencesByPersonId[id] || null;
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

  function personFromRow(row) {
    const name = row?.querySelector?.(".person-table-identity > strong, :scope > strong");
    if (!name) return null;
    const canonical = row.querySelector?.(".person-card-canonical");
    return {
      id: row.dataset?.personId || "",
      canonical_name_en: String(canonical?.textContent || name.textContent || "").trim()
    };
  }

  function decorateMainTable() {
    if (!registryLoaded || typeof document?.querySelectorAll !== "function") return;
    for (const row of document.querySelectorAll(".person-card[data-person-id]")) {
      const person = personFromRow(row);
      if (!person) continue;
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

  async function loadRegistry() {
    if (typeof fetch !== "function") return;
    try {
      const response = await fetch(REGISTRY_URL, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (payload?.schema !== REGISTRY_SCHEMA || !payload.persons || typeof payload.persons !== "object" || Array.isArray(payload.persons)) {
        throw new Error("invalid registry schema");
      }
      const next = {};
      for (const [canonicalName, raw] of Object.entries(payload.persons)) {
        const key = String(canonicalName || "").trim();
        const entry = normalizeRegistryEntry(raw);
        if (key && entry) next[key] = entry;
      }
      referencesByCanonicalName = Object.freeze(next);
      registryLoaded = true;
      queueMicrotask(decorateMainTable);
      window.dispatchEvent(new CustomEvent("atlas-person-external-references-ready"));
    } catch (error) {
      console.error("ATLAS Person NamuWiki registry could not be loaded", error);
    }
  }

  window.addEventListener("atlas-person-main-rendered", () => queueMicrotask(decorateMainTable));

  window.ATLAS_PERSON_EXTERNAL_REFERENCES = Object.freeze({
    entryForPerson,
    linksForPerson,
    linkForPerson,
    statusForPerson,
    decorateMainTable,
    registryLoaded: () => registryLoaded,
    registryUrl: REGISTRY_URL
  });

  loadRegistry();
})();
