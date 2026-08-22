(() => {
  "use strict";

  const ROOT_ID = "personDomainRoot";
  const SPACETIME_PACKING_ASSET = "./atlas-person-spacetime-label-packing.js?v=20260822-label-pack-v1";
  const PERSON_SURFACE_IDS = Object.freeze([
    "personMainView",
    "nonTimelineSection",
    "relationshipAuthoringTools"
  ]);

  const mainArea = document.querySelector(".main-area");
  const topbar = mainArea?.querySelector(":scope > .topbar");
  if (!mainArea || !topbar) {
    console.warn("ATLAS domain surface owner could not initialize shell anchors.");
    return;
  }

  let personRoot = null;
  let spacetimePackingPromise = null;

  function normalizedHashDomain() {
    const value = String(window.location.hash || "").replace(/^#atlas-/, "").replace(/^#/, "").trim();
    return value || "persons";
  }

  function currentDomain() {
    return window.ATLAS_MAIN_AUTHORITY_NAV?.getDomain?.() || normalizedHashDomain();
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

  function ensureSpacetimeLabelPacking() {
    if (window.ATLAS_PERSON_SPACETIME_LABEL_PACKING) return Promise.resolve(window.ATLAS_PERSON_SPACETIME_LABEL_PACKING);
    if (spacetimePackingPromise) return spacetimePackingPromise;
    spacetimePackingPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-atlas-spacetime-packing="${SPACETIME_PACKING_ASSET}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(window.ATLAS_PERSON_SPACETIME_LABEL_PACKING), { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = SPACETIME_PACKING_ASSET;
      script.async = false;
      script.dataset.atlasSpacetimePacking = SPACETIME_PACKING_ASSET;
      script.addEventListener("load", () => resolve(window.ATLAS_PERSON_SPACETIME_LABEL_PACKING), { once: true });
      script.addEventListener("error", () => reject(new Error("ATLAS_SPACETIME_LABEL_PACKING_LOAD_FAILED")), { once: true });
      document.body.appendChild(script);
    }).catch((error) => {
      spacetimePackingPromise = null;
      console.error(error);
      return null;
    });
    return spacetimePackingPromise;
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
    if (domain === "spacetime") {
      ensureSpacetimeLabelPacking();
      if (resetScroll) requestAnimationFrame(resetDocumentScroll);
    }
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
    applyDomain(currentDomain(), { resetScroll: currentDomain() === "spacetime" });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  window.ATLAS_DOMAIN_SURFACE_OWNER = Object.freeze({
    getPersonRoot: () => ensurePersonRoot(),
    sync: () => applyDomain(currentDomain())
  });
})();
