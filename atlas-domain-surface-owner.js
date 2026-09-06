(() => {
  "use strict";

  const ROOT_ID = "personDomainRoot";
  const PERSON_SURFACE_IDS = Object.freeze([
    "personMainView",
    "relationshipAuthoringTools"
  ]);

  const mainArea = document.querySelector(".main-area");
  const topbar = mainArea?.querySelector(":scope > .topbar");
  if (!mainArea || !topbar) {
    console.warn("ATLAS domain surface owner could not initialize shell anchors.");
    return;
  }

  let personRoot = null;

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

  function ensureSpacetimeDomainAssets() {
    ensureStylesheet(
      'link[data-atlas-person-spacetime-domain-colors="true"]',
      "./atlas-person-spacetime-domain-colors.css?v=20260906-final-domain",
      "atlasPersonSpacetimeDomainColors"
    );
    if (!document.querySelector('script[data-atlas-person-spacetime-label-overlap-guard="true"]')) {
      const script = document.createElement("script");
      script.src = "./atlas-person-spacetime-label-overlap-guard.js?v=20260906-global-live-guard";
      script.async = true;
      script.dataset.atlasPersonSpacetimeLabelOverlapGuard = "true";
      document.head.append(script);
    }
    if (!document.querySelector('script[data-atlas-person-spacetime-domain-colors="true"]')) {
      const script = document.createElement("script");
      script.src = "./atlas-person-spacetime-domain-colors.js?v=20260906-final-domain";
      script.async = true;
      script.dataset.atlasPersonSpacetimeDomainColors = "true";
      document.head.append(script);
    }
  }

  function ensurePersonDomainAssets() {
    ensureStylesheet(
      'link[data-atlas-person-domain-palette="true"]',
      "./atlas-person-domain-palette.css?v=20260905-v2",
      "atlasPersonDomainPalette"
    );

    let script = document.querySelector('script[data-atlas-person-domain-ui="true"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "./atlas-person-domain-ui.js?v=20260905-v2";
      script.async = true;
      script.dataset.atlasPersonDomainUi = "true";
      document.head.append(script);
    }

    if (window.ATLAS_PERSON_DOMAIN_UI) ensureSpacetimeDomainAssets();
    else script.addEventListener("load", ensureSpacetimeDomainAssets, { once: true });
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

  function applyDomain(domain, { resetScroll = false } = {}) {
    const root = ensurePersonRoot();
    const isPersons = domain === "persons";
    root.hidden = !isPersons;
    root.setAttribute("aria-hidden", String(!isPersons));
    if (!isPersons) closePersonOverlay();
    if (domain === "spacetime" && resetScroll) requestAnimationFrame(resetDocumentScroll);
  }

  function onDomainChanged(event) {
    applyDomain(String(event?.detail?.domain || currentDomain()), { resetScroll: true });
  }

  window.addEventListener("atlas-authority-domain-changed", onDomainChanged);

  const observer = new MutationObserver(() => {
    const root = ensurePersonRoot();
    const isPersons = currentDomain() === "persons";
    root.hidden = !isPersons;
    root.setAttribute("aria-hidden", String(!isPersons));
  });
  observer.observe(mainArea, { childList: true });

  function init() {
    ensurePersonDomainAssets();
    applyDomain(currentDomain(), { resetScroll: currentDomain() === "spacetime" });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  window.ATLAS_DOMAIN_SURFACE_OWNER = Object.freeze({
    getPersonRoot: () => ensurePersonRoot(),
    sync: () => applyDomain(currentDomain())
  });
})();