(() => {
  "use strict";

  const DOMAIN_ORDER = ["dashboard", "persons", "spacetime", "polities", "places", "events", "sources", "geometry"];
  const DOMAINS = Object.freeze({
    dashboard: {
      label: "Dashboard",
      eyebrow: "ATLAS INFORMATION COVERAGE",
      status: "PARTIAL",
      summary: "현재 Main이 공개할 수 있는 권위 도메인과 아직 backend read surface가 필요한 영역을 한눈에 보여줍니다.",
      available: "Person-centered public read와 Person Activity의 Polity·Relation·Role·Period Basis facet이 현재 공개되어 있습니다.",
      missing: "전 도메인을 합산하는 별도 authoritative dashboard projection은 아직 없습니다.",
      principle: "없는 지표를 계산해 정상처럼 보이지 않고, 준비 여부 자체를 정보로 표시합니다."
    },
    persons: {
      label: "Persons",
      eyebrow: "PERSON-CENTERED DATASET",
      status: "READY",
      summary: "Person identity, historicity, names, descriptions, Activities and readable provenance are available."
    },
    spacetime: {
      label: "시공간 인물도",
      eyebrow: "PERSON SPACETIME ATLAS",
      status: "READY / CAPITAL DATA GATED",
      summary: "BC 수천 년부터 현재까지의 세로 시간축과 아메리카→동아시아 가로 공간축 위에 Person Activity를 배치합니다. 가로 위치는 해당 시기의 Polity 수도만 사용합니다.",
      available: "현재 Person Activity의 정확한 시간축, 기존 시대구분, 수도 시계열 검증 계약, 겹침 방지 lane과 미확정 보존 경로가 연결되어 있습니다.",
      missing: "현재 Person DB에는 first-class Polity 수도 시계열이 없으므로 source-reviewed 수도 기록이 없는 Activity는 위치 미확정으로 남습니다.",
      principle: "인물 출생지·현대국가·이름으로 위치를 추정하지 않습니다. 수도가 바뀌면 Activity를 변형하지 않고 화면 배치 구간만 나눕니다."
    },
    polities: {
      label: "Polities",
      eyebrow: "POLITY AUTHORITY",
      status: "PARTIAL READ",
      summary: "Polity identity is already visible through Person Activity and semantic facets, but a first-class public Polity browser is not authoritative yet.",
      available: "Person Activity에서 Polity UUID와 읽을 수 있는 이름을 확인할 수 있고 Main 필터에도 Polity facet이 제공됩니다.",
      missing: "독립 Polity 목록·상세·설명·출처를 제공하는 public read contract가 아직 없습니다.",
      principle: "Person이 영토를 소유하지 않으며 Person → Activity → Polity 관계를 유지합니다."
    },
    places: {
      label: "Places",
      eyebrow: "PLACE AUTHORITY",
      status: "BACKEND SURFACE NEEDED",
      summary: "Place는 장기적으로 first-class authority이지만 현재 Main용 authoritative read surface가 준비되지 않았습니다.",
      available: "현재 Person Activity의 Polity 맥락과 source provenance는 볼 수 있습니다.",
      missing: "출생지·사망지·수도·활동 장소 등을 UUID 기반 Place object로 읽는 public contract가 필요합니다.",
      principle: "Place 이름을 임의 문자열로 추정하지 않고 향후 first-class identity와 provenance를 사용합니다."
    },
    events: {
      label: "Events",
      eyebrow: "HISTORICAL EVENT AUTHORITY",
      status: "BACKEND SURFACE NEEDED",
      summary: "HistoricalEvent는 Polity·Government·PeopleGroup과 분리된 별도 권위 도메인으로 계획되어 있습니다.",
      available: "현재 사건 정보가 Activity notes나 source 문맥에 포함될 수는 있지만 독립 Event object로 공개되지는 않습니다.",
      missing: "Event identity·기간·참여 entity·출처를 위한 authoritative read model이 필요합니다.",
      principle: "사건을 Polity나 Person Activity와 혼동하지 않고 별도 entity로 유지합니다."
    },
    sources: {
      label: "Sources",
      eyebrow: "SOURCE / PROVENANCE",
      status: "PARTIAL READ",
      summary: "Person과 Activity의 읽을 수 있는 provenance는 이미 Main에 공개되지만 standalone Source browser는 아직 없습니다.",
      available: "title·source type·canonical URL·citation text와 Activity locator를 Person 상세에서 확인할 수 있습니다.",
      missing: "Main용 standalone Source 목록/상세 projection은 아직 없으며 Source UUID·key·hash·bytes는 Admin Inspector 영역입니다.",
      principle: "Main은 사람이 읽을 수 있는 출처를, Admin은 안전한 Source identity와 진단 메타데이터를 담당합니다."
    },
    geometry: {
      label: "Geometry",
      eyebrow: "MAP / GEOMETRY AUTHORITY",
      status: "FUTURE / P14",
      summary: "Geometry는 역사 지도 통합 단계에서 Polity Territory를 통해 연결될 미래 권위 도메인입니다.",
      available: "현재 Person과 Polity의 역사 의미를 지도 연동에 사용할 수 있도록 Activity semantics를 정규화하고 있습니다.",
      missing: "Territory·Geometry public projection과 시계열 지도 연결은 아직 Main runtime authority가 아닙니다.",
      principle: "Person → Activity → Polity → Territory → Geometry 체인을 유지하며 Person에 영토를 직접 귀속하지 않습니다."
    }
  });

  function ensureSpacetimeNavButtons() {
    const desktopNav = document.querySelector(".nav-list");
    if (desktopNav && !desktopNav.querySelector('[data-atlas-domain="spacetime"]')) {
      const button = document.createElement("button");
      button.className = "nav-item";
      button.dataset.atlasDomain = "spacetime";
      button.innerHTML = "<span>⌗</span>시공간 인물도<small>사용 가능</small>";
      desktopNav.querySelector('[data-atlas-domain="persons"]')?.insertAdjacentElement("afterend", button);
    }
    const mobileNav = document.querySelector(".mobile-nav");
    if (mobileNav && !mobileNav.querySelector('[data-atlas-domain="spacetime"]')) {
      const button = document.createElement("button");
      button.dataset.atlasDomain = "spacetime";
      button.innerHTML = "⌗ <span>시공간 인물도</span><small>사용 가능</small>";
      mobileNav.querySelector('[data-atlas-domain="persons"]')?.insertAdjacentElement("afterend", button);
    }
  }

  ensureSpacetimeNavButtons();

  const mainArea = document.querySelector(".main-area");
  const topbar = mainArea?.querySelector(":scope > .topbar");
  const personView = document.getElementById("personMainView");
  const authoringTools = document.getElementById("relationshipAuthoringTools");
  const connectionStatus = document.getElementById("connectionStatus");
  const mobileSearch = document.getElementById("mobileSearchInput");
  const mobileSearchClear = document.getElementById("mobileSearchClear");
  const mobileSearchCount = document.getElementById("mobileSearchCount");
  const desktopButtons = [...document.querySelectorAll(".nav-list [data-atlas-domain]")];
  const mobileButtons = [...document.querySelectorAll(".mobile-nav [data-atlas-domain]")];

  if (!mainArea || !topbar || !personView || !authoringTools || !desktopButtons.length || !mobileButtons.length) {
    console.warn("ATLAS authority navigation could not initialize required DOM anchors.");
    return;
  }

  const personHeading = Object.freeze({
    eyebrow: topbar.querySelector(".eyebrow")?.textContent || "PERSON-CENTERED DATASET",
    title: topbar.querySelector("h1")?.textContent || "Persons",
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
  let spacetimeAssetsPromise = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function statusClass(status) {
    if (String(status).startsWith("READY")) return "is-ready";
    if (String(status).includes("PARTIAL")) return "is-partial";
    return "is-future";
  }

  function dashboardHtml() {
    return `<section class="authority-dashboard-grid">${DOMAIN_ORDER.map((key) => {
      const domain = DOMAINS[key];
      return `<button type="button" class="authority-domain-card" data-authority-jump="${escapeHtml(key)}">
        <span class="authority-status ${statusClass(domain.status)}">${escapeHtml(domain.status)}</span>
        <strong>${escapeHtml(domain.label)}</strong>
        <p>${escapeHtml(domain.summary)}</p>
      </button>`;
    }).join("")}</section>`;
  }

  function domainHtml(key) {
    const domain = DOMAINS[key];
    if (!domain) return "";
    if (key === "spacetime") return '<div id="personSpacetimeMount" class="person-spacetime-mount"></div>';
    const dashboard = key === "dashboard" ? dashboardHtml() : "";
    return `<div class="authority-shell-head card">
      <div><p class="eyebrow">${escapeHtml(domain.eyebrow)}</p><h2>${escapeHtml(domain.label)}</h2><p>${escapeHtml(domain.summary)}</p></div>
      <span class="authority-status ${statusClass(domain.status)}">${escapeHtml(domain.status)}</span>
    </div>
    ${dashboard}
    ${key === "dashboard" ? "" : `<section class="authority-state-grid">
      <article class="card"><small>CURRENTLY EXPOSED</small><h3>현재 제공</h3><p>${escapeHtml(domain.available)}</p></article>
      <article class="card"><small>NOT AUTHORITATIVE YET</small><h3>아직 없는 surface</h3><p>${escapeHtml(domain.missing)}</p></article>
      <article class="card"><small>AUTHORITY RULE</small><h3>구조 원칙</h3><p>${escapeHtml(domain.principle)}</p></article>
    </section>`}`;
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

  function ensureSpacetimeAssets() {
    if (window.ATLAS_PERSON_SPACETIME_VIEW) return Promise.resolve(window.ATLAS_PERSON_SPACETIME_VIEW);
    if (spacetimeAssetsPromise) return spacetimeAssetsPromise;
    appendStylesheetOnce("./atlas-person-spacetime-view.css?v=20260817-spacetime-v1");
    spacetimeAssetsPromise = loadScriptOnce("./atlas-person-spacetime-model.js?v=20260817-spacetime-v1", () => Boolean(window.ATLAS_PERSON_SPACETIME_MODEL))
      .then(() => loadScriptOnce("./atlas-person-spacetime-view.js?v=20260817-spacetime-v1", () => Boolean(window.ATLAS_PERSON_SPACETIME_VIEW)))
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
      if (currentDomain === "spacetime" && document.getElementById("personSpacetimeMount")) {
        document.getElementById("personSpacetimeMount").innerHTML = `<section class="card" style="padding:24px"><strong>시공간 인물도 모듈을 불러오지 못했습니다.</strong><p>${escapeHtml(error?.message || error)}</p></section>`;
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
      if (subtitle) subtitle.textContent = personHeading.subtitle;
      if (connectionStatus) connectionStatus.hidden = false;
      return;
    }
    if (eyebrow) eyebrow.textContent = meta.eyebrow;
    if (title) title.textContent = meta.label;
    if (subtitle) subtitle.textContent = meta.summary;
    if (connectionStatus) connectionStatus.hidden = true;
  }

  function setMobileSearchEnabled(enabled, label) {
    if (!mobileSearch) return;
    mobileSearch.disabled = !enabled;
    mobileSearch.placeholder = enabled ? mobileSearchPlaceholder : `${label}: first-class 검색 surface 준비 전`;
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
    currentDomain = next;
    const isPersons = next === "persons";
    personView.hidden = !isPersons;
    authoringTools.hidden = !isPersons;
    shell.hidden = isPersons;
    if (!isPersons) shell.innerHTML = domainHtml(next);
    setNavigationActive(next);
    setTopbar(next);
    setMobileSearchEnabled(isPersons, DOMAINS[next].label);

    if (updateHash) {
      const target = `#atlas-${next}`;
      if (window.location.hash !== target) history.pushState(null, "", target);
    }
    window.dispatchEvent(new CustomEvent("atlas-authority-domain-changed", { detail: { domain: next } }));
    if (next === "spacetime") activateSpacetime();
  }

  function handleNavigationClick(event) {
    const button = event.target.closest("[data-atlas-domain]");
    if (!button) return;
    showDomain(button.dataset.atlasDomain, { updateHash: true });
    if (button.closest(".mobile-nav")) document.getElementById("mobileMenuClose")?.click();
  }

  document.querySelector(".nav-list")?.addEventListener("click", handleNavigationClick);
  document.querySelector(".mobile-nav")?.addEventListener("click", handleNavigationClick);
  shell.addEventListener("click", (event) => {
    const jump = event.target.closest("[data-authority-jump]");
    if (jump) showDomain(jump.dataset.authorityJump, { updateHash: true });
  });
  window.addEventListener("hashchange", () => showDomain(normalizeHash(window.location.hash)));

  showDomain(normalizeHash(window.location.hash));

  window.ATLAS_MAIN_AUTHORITY_NAV = Object.freeze({
    getDomain: () => currentDomain,
    showDomain: (domain) => showDomain(domain, { updateHash: true }),
    domains: DOMAIN_ORDER.slice()
  });
})();
