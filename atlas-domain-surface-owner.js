(() => {
  "use strict";

  const ROOT_ID = "personDomainRoot";
  const PERSON_SURFACE_IDS = Object.freeze(["personMainView"]);

  const mainArea = document.querySelector(".main-area");
  const topbar = mainArea?.querySelector(":scope > .topbar");
  if (!mainArea || !topbar) {
    console.warn("ATLAS domain surface owner could not initialize shell anchors.");
    return;
  }

  let personRoot = null;
  let personDomainAssetsPromise = null;
  let spacetimeDomainAssetsPromise = null;

  function normalizedHashDomain() {
    const value = String(window.location.hash || "").replace(/^#atlas-/, "").replace(/^#/, "").trim();
    return value || "persons";
  }

  function currentDomain() {
    return window.ATLAS_MAIN_AUTHORITY_NAV?.getDomain?.() || normalizedHashDomain();
  }

  function ensureStylesheet(selector, href, datasetKey) {
    let link = document.querySelector(selector);
    if (link) return link;
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset[datasetKey] = "true";
    document.head.append(link);
    return link;
  }

  function loadScriptOnce(selector, src, datasetKey, ready) {
    if (typeof ready === "function" && ready()) return Promise.resolve();

    let script = document.querySelector(selector);
    const created = !script;
    if (!script) {
      script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset[datasetKey] = "true";
    }

    const promise = new Promise((resolve, reject) => {
      if (typeof ready === "function" && ready()) {
        resolve();
        return;
      }
      script.addEventListener("load", () => {
        if (typeof ready !== "function" || ready()) {
          resolve();
          return;
        }
        script.remove?.();
        reject(new Error(`ATLAS_DOMAIN_ASSET_MISSING_AFTER_LOAD: ${src}`));
      }, { once:true });
      script.addEventListener("error", () => {
        script.remove?.();
        reject(new Error(`ATLAS_DOMAIN_ASSET_LOAD_FAILED: ${src}`));
      }, { once:true });
    });

    if (created) document.head.append(script);
    return promise;
  }

  function ensurePersonDomainAssets() {
    ensureStylesheet(
      'link[data-atlas-person-domain-palette="true"]',
      "./atlas-person-domain-palette.css?v=20260912-religion-silver-blue-v6",
      "atlasPersonDomainPalette"
    );

    if (window.ATLAS_PERSON_DOMAIN_UI) return Promise.resolve(window.ATLAS_PERSON_DOMAIN_UI);
    if (personDomainAssetsPromise) return personDomainAssetsPromise;

    personDomainAssetsPromise = loadScriptOnce(
      'script[data-atlas-person-domain-ui="true"]',
      "./atlas-person-domain-ui.js?v=20260919-shared-store-v1",
      "atlasPersonDomainUi",
      () => Boolean(window.ATLAS_PERSON_DOMAIN_UI)
    ).then(() => window.ATLAS_PERSON_DOMAIN_UI)
      .catch((error) => {
        personDomainAssetsPromise = null;
        throw error;
      });

    return personDomainAssetsPromise;
  }

  function ensureSpacetimeDomainAssets() {
    ensureStylesheet(
      'link[data-atlas-person-spacetime-domain-colors="true"]',
      "./atlas-person-spacetime-domain-colors.css?v=20260912-religion-silver-v5",
      "atlasPersonSpacetimeDomainColors"
    );

    if (window.ATLAS_PERSON_SPACETIME_DOMAIN_COLORS && window.ATLAS_PERSON_SPACETIME_LABEL_OVERLAP_GUARD) {
      return Promise.resolve(Object.freeze({
        domainColors:window.ATLAS_PERSON_SPACETIME_DOMAIN_COLORS,
        overlapGuard:window.ATLAS_PERSON_SPACETIME_LABEL_OVERLAP_GUARD
      }));
    }
    if (spacetimeDomainAssetsPromise) return spacetimeDomainAssetsPromise;

    spacetimeDomainAssetsPromise = ensurePersonDomainAssets()
      .then(() => Promise.all([
          loadScriptOnce(
            'script[data-atlas-person-spacetime-label-overlap-guard="true"]',
            "./atlas-person-spacetime-label-overlap-guard.js?v=20260920-world-name-overlay",
            "atlasPersonSpacetimeLabelOverlapGuard",
            () => Boolean(window.ATLAS_PERSON_SPACETIME_LABEL_OVERLAP_GUARD)
          ),
          loadScriptOnce(
            'script[data-atlas-person-spacetime-domain-colors="true"]',
            "./atlas-person-spacetime-domain-colors.js?v=20260906-final-domain",
            "atlasPersonSpacetimeDomainColors",
            () => Boolean(window.ATLAS_PERSON_SPACETIME_DOMAIN_COLORS)
          )
        ]))
      .then(() => Object.freeze({
        domainColors:window.ATLAS_PERSON_SPACETIME_DOMAIN_COLORS,
        overlapGuard:window.ATLAS_PERSON_SPACETIME_LABEL_OVERLAP_GUARD
      }))
      .catch((error) => {
        spacetimeDomainAssetsPromise = null;
        throw error;
      });

    return spacetimeDomainAssetsPromise;
  }

  function ensurePersonRoot() {
    if (!personRoot?.isConnected) personRoot = document.getElementById(ROOT_ID);
    if (!personRoot) {
      personRoot = document.createElement("section");
      personRoot.id = ROOT_ID;
      personRoot.className = "person-domain-root";
      topbar.insertAdjacentElement("afterend", personRoot);
    }

    for (const id of PERSON_SURFACE_IDS) {
      const surface = document.getElementById(id);
      if (surface && surface.parentElement !== personRoot) personRoot.append(surface);
    }
    return personRoot;
  }

  function closePersonOverlay() {
    const detail = document.getElementById("personMainDetail");
    const backdrop = document.getElementById("personMainDetailBackdrop");
    if (detail) detail.hidden = true;
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove("person-detail-overlay-open");
  }

  function resetDocumentScroll() {
    const scrollingElement = document.scrollingElement;
    if (scrollingElement?.scrollTo) scrollingElement.scrollTo({ top: 0, left: 0, behavior: "auto" });
    else window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function resetDocumentHorizontalScroll() {
    const scrollingElement = document.scrollingElement;
    const top = Number(scrollingElement?.scrollTop ?? window.scrollY ?? 0);
    if (scrollingElement?.scrollTo) scrollingElement.scrollTo({ top, left: 0, behavior: "auto" });
    else window.scrollTo({ top, left: 0, behavior: "auto" });
  }

  function applyDomain(domain, { resetScroll = false } = {}) {
    const root = ensurePersonRoot();
    const isPersons = domain === "persons";
    root.hidden = !isPersons;
    root.setAttribute("aria-hidden", String(!isPersons));
    if (!isPersons) closePersonOverlay();
    if (isPersons && resetScroll) requestAnimationFrame(resetDocumentHorizontalScroll);
    if (domain === "spacetime") {
      ensureSpacetimeDomainAssets().catch((error) => console.error("ATLAS spacetime domain assets failed", error));
      if (resetScroll) requestAnimationFrame(resetDocumentScroll);
    }
  }

  function onDomainChanged(event) {
    applyDomain(String(event?.detail?.domain || currentDomain()), { resetScroll: true });
  }

  window.addEventListener("atlas-authority-domain-changed", onDomainChanged);
  window.addEventListener("atlas-person-main-rendered", () => {
    if (currentDomain() === "persons") requestAnimationFrame(resetDocumentHorizontalScroll);
  });

  const observer = new MutationObserver(() => {
    const root = ensurePersonRoot();
    const isPersons = currentDomain() === "persons";
    root.hidden = !isPersons;
    root.setAttribute("aria-hidden", String(!isPersons));
  });
  observer.observe(mainArea, { childList: true });

  function init() {
    ensurePersonDomainAssets().catch((error) => console.error("ATLAS Person domain assets failed", error));
    applyDomain(currentDomain(), { resetScroll: currentDomain() === "spacetime" || currentDomain() === "persons" });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  window.ATLAS_DOMAIN_SURFACE_OWNER = Object.freeze({
    getPersonRoot: () => ensurePersonRoot(),
    sync: () => applyDomain(currentDomain())
  });
})();