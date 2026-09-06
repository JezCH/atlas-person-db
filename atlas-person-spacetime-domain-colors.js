((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ATLAS_PERSON_SPACETIME_DOMAIN_COLORS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const TARGET_SELECTOR = [
    ".spacetime-track-label[data-spacetime-person]",
    ".spacetime-track-rail[data-spacetime-person]"
  ].join(",");

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function canonicalDomainCodes(domainUi) {
    return new Set((Array.isArray(domainUi?.DEFINITIONS) ? domainUi.DEFINITIONS : [])
      .map((item) => text(item?.code))
      .filter(Boolean));
  }

  function representativeDomainForPerson(domainUi, personId) {
    const id = text(personId);
    if (!id || typeof domainUi?.currentDomain !== "function") return "";
    const domain = text(domainUi.currentDomain(id));
    return canonicalDomainCodes(domainUi).has(domain) ? domain : "";
  }

  function personIdForElement(element) {
    return text(element?.dataset?.spacetimePerson || element?.getAttribute?.("data-spacetime-person"));
  }

  function decorateElement(element, domainUi) {
    if (!element) return "";
    const domain = representativeDomainForPerson(domainUi, personIdForElement(element));
    const current = text(element.getAttribute?.("data-representative-domain"));
    if (domain) {
      if (current !== domain) element.setAttribute?.("data-representative-domain", domain);
    } else if (current) {
      element.removeAttribute?.("data-representative-domain");
    }
    return domain;
  }

  function decorateSpacetime(scope, domainUi) {
    const rootScope = scope?.querySelectorAll ? scope : null;
    if (!rootScope) return Object.freeze({ decorated: 0, neutral: 0 });
    let decorated = 0;
    let neutral = 0;
    for (const element of rootScope.querySelectorAll(TARGET_SELECTOR)) {
      if (decorateElement(element, domainUi)) decorated += 1;
      else neutral += 1;
    }
    return Object.freeze({ decorated, neutral });
  }

  function installBrowserIntegration(browserRoot) {
    const rootObject = browserRoot || (typeof window !== "undefined" ? window : null);
    const documentObject = rootObject?.document;
    const domainUi = rootObject?.ATLAS_PERSON_DOMAIN_UI;
    if (!documentObject?.body || !domainUi) return null;

    let frame = 0;
    let disposed = false;
    const schedule = () => {
      if (disposed || frame) return;
      const raf = rootObject.requestAnimationFrame || ((callback) => rootObject.setTimeout(callback, 0));
      frame = raf(() => {
        frame = 0;
        if (!disposed) decorateSpacetime(documentObject, domainUi);
      });
    };

    const observer = typeof rootObject.MutationObserver === "function"
      ? new rootObject.MutationObserver(schedule)
      : null;
    observer?.observe(documentObject.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-representative-domain"]
    });

    rootObject.addEventListener?.("atlas-authority-domain-changed", schedule);
    rootObject.addEventListener?.("atlas-person-main-rendered", schedule);

    Promise.resolve(typeof domainUi.loadDomains === "function" ? domainUi.loadDomains() : null)
      .catch((error) => console.warn("ATLAS spacetime Person domains unavailable", error))
      .finally(schedule);

    return Object.freeze({
      schedule,
      dispose() {
        disposed = true;
        observer?.disconnect();
        rootObject.removeEventListener?.("atlas-authority-domain-changed", schedule);
        rootObject.removeEventListener?.("atlas-person-main-rendered", schedule);
      }
    });
  }

  const api = Object.freeze({
    TARGET_SELECTOR,
    canonicalDomainCodes,
    representativeDomainForPerson,
    decorateElement,
    decorateSpacetime,
    installBrowserIntegration
  });

  if (typeof window !== "undefined" && window.document?.body && window.ATLAS_PERSON_DOMAIN_UI) {
    installBrowserIntegration(window);
  }

  return api;
});
