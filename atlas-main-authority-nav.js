(() => {
  "use strict";

  const DOMAIN_ORDER = ["dashboard", "persons", "spacetime", "polities", "places", "events", "sources", "geometry"];
  const DOMAINS = window.ATLAS_UI_AUTHORITY_CATALOG_KO;

  function syncNavigationStatusLabels(buttons) {
    for (const button of buttons) {
      const meta = DOMAINS?.[button.dataset.atlasDomain];
      const status = button.querySelector("small");
      if (meta?.status_label && status) status.textContent = meta.status_label;
    }
  }

  function ensureSpacetimeNavButtons() {
    const meta = DOMAINS?.spacetime;
    const label = meta?.label || "시공간 인물도";
    const status = meta?.status_label || "사용 가능";
    const desktopNav = document.querySelector(".nav-list");
    if (desktopNav && !desktopNav.querySelector('[data-atlas-domain="spacetime"]')) {
      const button = document.createElement("button");
      button.className = "nav-item";
      button.dataset.atlasDomain = "spacetime";
      button.innerHTML = `<span>⌗</span>${label}<small>${status}</small>`;
      desktopNav.querySelector('[data-atlas-domain="persons"]')?.insertAdjacentElement("afterend", button);
    }
    const mobileNav = document.querySelector(".mobile-nav");
    if (mobileNav && !mobileNav.querySelector('[data-atlas-domain="spacetime"]')) {
      const button = document.createElement("button");
      button.dataset.atlasDomain = "spacetime";
      button.innerHTML = `⌗ <span>${label}</span><small>${status}</small>`;
      mobileNav.querySelector('[data-atlas-domain="persons"]')?.insertAdjacentElement("afterend", button);
    }
  }

  if (!DOMAINS) {
    console.warn("ATLAS authority navigation could not initialize localization catalog.");
    return;
  }

  ensureSpacetimeNavButtons();

  const mainArea = document.querySelector(".main-area");
  const topbar = mainArea?.querySelector(":scope > .topbar");
  const personView = document.getElementById("personMainView");
  const connectionStatus = document.getElementById("connectionStatus");
  const mobileSearch = document.getElementById("mobileSearchInput");
  const mobileSearchClear = document.getElementById("mobileSearchClear");
  const mobileSearchCount = document.getElementById("mobileSearchCount");
  const desktopButtons = [...document.querySelectorAll(".nav-list [data-atlas-domain]")];
  const mobileButtons = [...document.querySelectorAll(".mobile-nav [data-atlas-domain]")];

  if (!mainArea || !topbar || !personView || !desktopButtons.length || !mobileButtons.length) {
    console.warn("ATLAS authority navigation could not initialize required DOM anchors.");
    return;
  }

  syncNavigationStatusLabels([...desktopButtons, ...mobileButtons]);

  const personHeading = Object.freeze({
    eyebrow: DOMAINS.persons.eyebrow,
    title: DOMAINS.persons.label,
    subtitle: topbar.querySelector(".subtitle")?.textContent || ""
  });
  const mobileSearchPlaceholder = mobileSearch?.placeholder || "인물 검색";

  const shell = document.createElement("section");
  shell.id = "atlasAuthorityShell";
  shell.className = "atlas-authority-shell";
  shell.hidden = true;
  shell.setAttribute("aria-live", "polite");
  topbar.insertAdjacentElement("afterend", shell);

  let currentDomain = "persons";
  let dashboardAssetsPromise = null;
  let spacetimeAssetsPromise = null;
  let polityAssetsPromise = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function statusClass(statusCode) {
    if (statusCode === "ready") return "is-ready";
    if (statusCode === "partial") return "is-partial";
    return "is-future";
  }

  function domainHtml(key) {
    const domain = DOMAINS[key];
    if (!domain) return "";
    if (key === "dashboard") return '<div id="atlasDashboardMount" class="atlas-dashboard-mount"></div>';
    if (key === "spacetime") return '<div id="personSpacetimeMount" class="person-spacetime-mount"></div>';
    if (key === "polities") return '<div class="atlas-polity-composite-shell"><div id="atlasPolityMount" class="atlas-polity-review-mount"></div><div id="atlasPolityReviewMount" class="atlas-polity-review-mount atlas-polity-review-section"></div></div>';
    return `<div class="authority-shell-head card">
      <div><p class="eyebrow">${escapeHtml(domain.eyebrow)}</p><h2>${escapeHtml(domain.label)}</h2><p>${escapeHtml(domain.summary)}</p></div>
      <span class="authority-status ${statusClass(domain.status_code)}">${escapeHtml(domain.status_label)}</span>
    </div>
    <section class="authority-state-grid">
      <article class="card"><small>현재 제공</small><h3>현재 제공</h3><p>${escapeHtml(domain.available)}</p></article>
      <article class="card"><small>아직 기준 기능 아님</small><h3>아직 없는 기능</h3><p>${escapeHtml(domain.missing)}</p></article>
      <article class="card"><small>구조 원칙</small><h3>구조 원칙</h3><p>${escapeHtml(domain.principle)}</p></article>
    </section>`;
  }

  function appendStylesheetOnce(href) {
    if (document.querySelector(`link[data-atlas-asset="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.atlasAsset = href;
    document.head.append(link);
  }

  function loadScriptOnce(src, ready) {
    if (typeof ready === "function" && ready()) return Promise.resolve();
    const existing = document.querySelector(`script[data-atlas-asset="${src}"]`);
    if (existing) return new Promise((resolve, reject) => {
      if (typeof ready === "function" && ready()) return resolve();
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
    });
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.dataset.atlasAsset = src;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error(`ATLAS_ASSET_LOAD_FAILED: ${src}`)), { once: true });
      document.body.append(script);
    });
  }

  function ensureDashboardAssets() {
    if (window.ATLAS_DASHBOARD) return Promise.resolve(window.ATLAS_DASHBOARD);
    if (dashboardAssetsPromise) return dashboardAssetsPromise;
    appendStylesheetOnce("./atlas-dashboard.css?v=20260919-control-center-v1");
    dashboardAssetsPromise = loadScriptOnce("./atlas-dashboard-model.js?v=20260919-spatial-resolver-v2", () => Boolean(window.ATLAS_DASHBOARD_MODEL))
      .then(() => loadScriptOnce("./atlas-dashboard.js?v=20260919-control-center-v1", () => Boolean(window.ATLAS_DASHBOARD)))
      .then(() => window.ATLAS_DASHBOARD)
      .catch((error) => {
        dashboardAssetsPromise = null;
        throw error;
      });
    return dashboardAssetsPromise;
  }

  function activateDashboard() {
    const mount = document.getElementById("atlasDashboardMount");
    if (!mount) return;
    mount.innerHTML = '<section class="card" style="padding:24px"><strong>대시보드 모듈 준비 중</strong></section>';
    ensureDashboardAssets().then((dashboard) => {
      if (currentDomain === "dashboard") dashboard?.mount?.(mount);
    }).catch((error) => {
      console.error(error);
      const currentMount = document.getElementById("atlasDashboardMount");
      if (currentDomain === "dashboard" && currentMount) {
        currentMount.innerHTML = `<section class="card" style="padding:24px"><strong>대시보드를 불러오지 못했습니다.</strong><p>${escapeHtml(error?.message || error)}</p></section>`;
      }
    });
  }

  function ensureSpacetimeAssets() {
    if (window.ATLAS_PERSON_SPACETIME_VIEW) return Promise.resolve(window.ATLAS_PERSON_SPACETIME_VIEW);
    if (spacetimeAssetsPromise) return spacetimeAssetsPromise;
    appendStylesheetOnce("./atlas-person-spacetime-view.css?v=20260919-top-chrome-v4");
    spacetimeAssetsPromise = loadScriptOnce("./atlas-person-spacetime-model.js?v=20260903-south-asia-r3", () => Boolean(window.ATLAS_PERSON_SPACETIME_MODEL))
      .then(() => loadScriptOnce("./atlas-person-spacetime-view.js?v=20260920-exact-fit-floor", () => Boolean(window.ATLAS_PERSON_SPACETIME_VIEW)))
      .then(() => window.ATLAS_PERSON_SPACETIME_VIEW)
      .catch((error) => {
        spacetimeAssetsPromise = null;
        throw error;
      });
    return spacetimeAssetsPromise;
  }

  function activateSpacetime() {
    const mount = document.getElementById("personSpacetimeMount");
    if (!mount) return;
    mount.innerHTML = '<section class="card" style="padding:24px"><strong>시공간 인물도 모듈 준비 중</strong></section>';
    ensureSpacetimeAssets().then((view) => {
      if (currentDomain === "spacetime") view?.activate?.();
    }).catch((error) => {
      console.error(error);
      const currentMount = document.getElementById("personSpacetimeMount");
      if (currentDomain === "spacetime" && currentMount) {
        currentMount.innerHTML = `<section class="card" style="padding:24px"><strong>시공간 인물도 모듈을 불러오지 못했습니다.</strong><p>${escapeHtml(error?.message || error)}</p></section>`;
      }
    });
  }

  function ensurePolityAssets() {
    if (window.ATLAS_POLITY_BROWSER_VIEW && window.ATLAS_POLITY_REVIEW_PANEL) return Promise.resolve(Object.freeze({ browser: window.ATLAS_POLITY_BROWSER_VIEW, review: window.ATLAS_POLITY_REVIEW_PANEL }));
    if (polityAssetsPromise) return polityAssetsPromise;
    appendStylesheetOnce("./atlas-polity-review-workbench.css?v=20260920-polity-composite-v4");
    polityAssetsPromise = loadScriptOnce("./atlas-polity-browser-reader.js?v=20260920-polity-composite-v4", () => Boolean(window.ATLAS_POLITY_BROWSER_READER))
      .then(() => loadScriptOnce("./atlas-polity-review-candidates.js?v=20260920-polity-composite-v4", () => Boolean(window.ATLAS_POLITY_REVIEW_CANDIDATES)))
      .then(() => loadScriptOnce("./atlas-polity-review-workbench.js?v=20260920-polity-composite-v4", () => Boolean(window.ATLAS_POLITY_BROWSER_VIEW)))
      .then(() => loadScriptOnce("./atlas-polity-review-panel.js?v=20260920-polity-composite-v4", () => Boolean(window.ATLAS_POLITY_REVIEW_PANEL)))
      .then(() => Object.freeze({ browser: window.ATLAS_POLITY_BROWSER_VIEW, review: window.ATLAS_POLITY_REVIEW_PANEL }))
      .catch((error) => {
        polityAssetsPromise = null;
        throw error;
      });
    return polityAssetsPromise;
  }

  function activatePolity() {
    const mount = document.getElementById("atlasPolityMount");
    if (!mount) return;
    mount.innerHTML = '<section class="card" style="padding:24px"><strong>현재 정치체 데이터를 불러오는 중입니다.</strong></section>';
    ensurePolityAssets().then((views) => {
      if (currentDomain !== "polities") return;
      views?.browser?.mount?.(mount);
      const reviewMount = document.getElementById("atlasPolityReviewMount");
      if (reviewMount) views?.review?.mount?.(reviewMount);
    }).catch((error) => {
      console.error(error);
      const currentMount = document.getElementById("atlasPolityMount");
      if (currentDomain === "polities" && currentMount) {
        currentMount.innerHTML = `<section class="card" style="padding:24px"><strong>정치체 데이터를 불러오지 못했습니다.</strong><p>${escapeHtml(error?.message || error)}</p></section>`;
      }
    });
  }

  function setNavigationActive(domain) {
    for (const button of [...desktopButtons, ...mobileButtons]) {
      const active = button.dataset.atlasDomain === domain;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    }
  }

  function setTopbar(domain) {
    const meta = DOMAINS[domain];
    const eyebrow = topbar.querySelector(".eyebrow");
    const title = topbar.querySelector("h1");
    const subtitle = topbar.querySelector(".subtitle");
    if (domain === "persons") {
      if (eyebrow) eyebrow.textContent = personHeading.eyebrow;
      if (title) title.textContent = personHeading.title;
      if (subtitle) {
        subtitle.hidden = false;
        subtitle.textContent = personHeading.subtitle;
      }
      if (connectionStatus) connectionStatus.hidden = false;
      return;
    }
    if (eyebrow) eyebrow.textContent = meta.eyebrow;
    if (title) title.textContent = meta.label;
    if (subtitle) {
      subtitle.hidden = domain === "spacetime";
      subtitle.textContent = meta.summary;
    }
    if (connectionStatus) connectionStatus.hidden = true;
  }

  function setMobileSearchEnabled(enabled, label) {
    if (!mobileSearch) return;
    mobileSearch.disabled = !enabled;
    mobileSearch.placeholder = enabled ? mobileSearchPlaceholder : `${label}: 독립 검색 기능 준비 전`;
    if (!enabled) {
      if (mobileSearchClear) mobileSearchClear.hidden = true;
      if (mobileSearchCount) mobileSearchCount.textContent = "";
    }
  }

  function normalizeHash(hash) {
    const value = String(hash || "").replace(/^#/, "").trim().replace(/^atlas-/, "");
    return DOMAIN_ORDER.includes(value) ? value : "persons";
  }

  function showDomain(domain, { updateHash = false } = {}) {
    const next = DOMAIN_ORDER.includes(domain) ? domain : "persons";
    const previousDomain = currentDomain;
    currentDomain = next;
    const isPersons = next === "persons";
    personView.hidden = !isPersons;
    shell.hidden = isPersons;
    if (!isPersons) shell.innerHTML = domainHtml(next);
    if (next === "dashboard") activateDashboard();
    setNavigationActive(next);
    setTopbar(next);
    setMobileSearchEnabled(isPersons, DOMAINS[next].label);

    if (updateHash) {
      const target = `#atlas-${next}`;
      if (window.location.hash !== target) history.pushState(null, "", target);
    }
    window.dispatchEvent(new CustomEvent("atlas-authority-domain-changed", { detail: { domain: next } }));
    if (next === "spacetime") activateSpacetime();
    if (next === "polities") activatePolity();
    if (previousDomain !== next) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    }
  }

  function handleNavigationClick(event) {
    const button = event.target.closest("[data-atlas-domain]");
    if (!button) return;
    showDomain(button.dataset.atlasDomain, { updateHash: true });
    if (button.closest(".mobile-nav")) document.getElementById("mobileMenuClose")?.click();
  }

  document.querySelector(".nav-list")?.addEventListener("click", handleNavigationClick);
  document.querySelector(".mobile-nav")?.addEventListener("click", handleNavigationClick);
  window.addEventListener("hashchange", () => showDomain(normalizeHash(window.location.hash)));

  showDomain(normalizeHash(window.location.hash));

  window.ATLAS_MAIN_AUTHORITY_NAV = Object.freeze({
    getDomain: () => currentDomain,
    showDomain: (domain) => showDomain(domain, { updateHash: true }),
    domains: DOMAIN_ORDER.slice()
  });
})();