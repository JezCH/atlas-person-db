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
    }),
    "554a98f3-c9d1-5314-a59d-6281a8f6524b": Object.freeze({
      namuwiki: Object.freeze({
        status: "linked",
        checked_at: "2026-08-21",
        document_title: "람세스 2세",
        url: "https://namu.wiki/w/%EB%9E%8C%EC%84%B8%EC%8A%A4%202%EC%84%B8"
      }),
      links: Object.freeze([
        Object.freeze({
          provider: "namuwiki",
          label: "나무위키",
          url: "https://namu.wiki/w/%EB%9E%8C%EC%84%B8%EC%8A%A4%202%EC%84%B8"
        })
      ])
    }),
    "52530876-ecec-5a85-87c5-90eab802ec50": Object.freeze({
      namuwiki: Object.freeze({
        status: "linked",
        checked_at: "2026-08-21",
        document_title: "하트셉수트",
        url: "https://namu.wiki/w/%ED%95%98%ED%8A%B8%EC%85%89%EC%88%98%ED%8A%B8"
      }),
      links: Object.freeze([
        Object.freeze({
          provider: "namuwiki",
          label: "나무위키",
          url: "https://namu.wiki/w/%ED%95%98%ED%8A%B8%EC%85%89%EC%88%98%ED%8A%B8"
        })
      ])
    }),
    "f9518a4b-bd24-48eb-9e42-55fb89eef03d": Object.freeze({
      namuwiki: Object.freeze({
        status: "linked",
        checked_at: "2026-08-21",
        document_title: "투탕카멘",
        url: "https://namu.wiki/w/%ED%88%AC%ED%83%95%EC%B9%B4%EB%A9%98"
      }),
      links: Object.freeze([
        Object.freeze({
          provider: "namuwiki",
          label: "나무위키",
          url: "https://namu.wiki/w/%ED%88%AC%ED%83%95%EC%B9%B4%EB%A9%98"
        })
      ])
    }),
    "e4d6b96d-92c4-5b6c-b43a-14639526b087": Object.freeze({
      namuwiki: Object.freeze({
        status: "linked",
        checked_at: "2026-08-21",
        document_title: "함무라비",
        url: "https://namu.wiki/w/%ED%95%A8%EB%AC%B4%EB%9D%BC%EB%B9%84"
      }),
      links: Object.freeze([
        Object.freeze({
          provider: "namuwiki",
          label: "나무위키",
          url: "https://namu.wiki/w/%ED%95%A8%EB%AC%B4%EB%9D%BC%EB%B9%84"
        })
      ])
    }),
    "4fa88c6e-53cc-5f79-a507-aaf9ef622c7c": Object.freeze({
      namuwiki: Object.freeze({
        status: "linked",
        checked_at: "2026-08-21",
        document_title: "키루스 2세",
        url: "https://namu.wiki/w/%ED%82%A4%EB%A3%A8%EC%8A%A4%202%EC%84%B8"
      }),
      links: Object.freeze([
        Object.freeze({
          provider: "namuwiki",
          label: "나무위키",
          url: "https://namu.wiki/w/%ED%82%A4%EB%A3%A8%EC%8A%A4%202%EC%84%B8"
        })
      ])
    }),
    "9b0e339e-27c5-5330-a2af-371a9459f426": Object.freeze({
      namuwiki: Object.freeze({
        status: "linked",
        checked_at: "2026-08-21",
        document_title: "다리우스 1세",
        url: "https://namu.wiki/w/%EB%8B%A4%EB%A6%AC%EC%9A%B0%EC%8A%A4%201%EC%84%B8"
      }),
      links: Object.freeze([
        Object.freeze({
          provider: "namuwiki",
          label: "나무위키",
          url: "https://namu.wiki/w/%EB%8B%A4%EB%A6%AC%EC%9A%B0%EC%8A%A4%201%EC%84%B8"
        })
      ])
    }),
    "b38b88f4-2292-5705-9651-7c997d462a51": Object.freeze({
      namuwiki: Object.freeze({
        status: "linked",
        checked_at: "2026-08-21",
        document_title: "크세르크세스 1세",
        url: "https://namu.wiki/w/%ED%81%AC%EC%84%B8%EB%A5%B4%ED%81%AC%EC%84%B8%EC%8A%A4%201%EC%84%B8"
      }),
      links: Object.freeze([
        Object.freeze({
          provider: "namuwiki",
          label: "나무위키",
          url: "https://namu.wiki/w/%ED%81%AC%EC%84%B8%EB%A5%B4%ED%81%AC%EC%84%B8%EC%8A%A4%201%EC%84%B8"
        })
      ])
    }),
    "037b92ed-fc9b-526e-b5c7-6075b361df6e": Object.freeze({
      namuwiki: Object.freeze({
        status: "linked",
        checked_at: "2026-08-21",
        document_title: "네부카드네자르 2세",
        url: "https://namu.wiki/w/%EB%84%A4%EB%B6%80%EC%B9%B4%EB%93%9C%EB%84%A4%EC%9E%90%EB%A5%B4%202%EC%84%B8"
      }),
      links: Object.freeze([
        Object.freeze({
          provider: "namuwiki",
          label: "나무위키",
          url: "https://namu.wiki/w/%EB%84%A4%EB%B6%80%EC%B9%B4%EB%93%9C%EB%84%A4%EC%9E%90%EB%A5%B4%202%EC%84%B8"
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
