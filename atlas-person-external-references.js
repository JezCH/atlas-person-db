(() => {
  "use strict";

  const referencesByPersonId = Object.freeze({
    "da0303c2-1faf-40b8-9dc2-1325b77488d7": Object.freeze({
      links: Object.freeze([
        Object.freeze({
          provider: "namuwiki",
          label: "나무위키",
          url: "https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D"
        })
      ])
    })
  });

  function entryForPerson(person) {
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

  function selectedPersonId() {
    return String(document.querySelector(".person-card.is-selected[data-person-id]")?.dataset?.personId || "").trim().toLowerCase();
  }

  function selectedNamuWikiLink() {
    const id = selectedPersonId();
    const links = referencesByPersonId[id]?.links || [];
    return links.find((link) => String(link.provider || "").toLowerCase() === "namuwiki") || null;
  }

  function applyNameHyperlink() {
    const heading = document.querySelector("#personMainDetail .person-detail-name-row h2");
    if (!heading) return;

    const reference = selectedNamuWikiLink();
    const existing = heading.querySelector(":scope > a.person-name-external-link");
    if (!reference?.url) {
      if (existing) existing.replaceWith(document.createTextNode(existing.textContent || ""));
      return;
    }

    let href;
    try {
      const url = new URL(String(reference.url), window.location.href);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      href = url.href;
    } catch {
      return;
    }

    if (existing?.href === href) return;
    const label = String(heading.textContent || "").trim();
    heading.textContent = "";
    const anchor = document.createElement("a");
    anchor.className = "person-name-external-link";
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = label;
    anchor.title = "나무위키에서 보기";
    heading.append(anchor);
  }

  function installNameHyperlink() {
    const panel = document.getElementById("personMainDetail");
    if (!panel || typeof MutationObserver !== "function") return;
    const observer = new MutationObserver(() => queueMicrotask(applyNameHyperlink));
    observer.observe(panel, { childList: true, subtree: true });
    applyNameHyperlink();
  }

  window.ATLAS_PERSON_EXTERNAL_REFERENCES = Object.freeze({
    entryForPerson,
    linksForPerson,
    linkForPerson
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installNameHyperlink, { once: true });
  else queueMicrotask(installNameHyperlink);
})();
