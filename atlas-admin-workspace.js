(() => {
  "use strict";

  const VIEW_ORDER = ["overview", "review", "authoring", "inspector"];
  const VIEW_META = Object.freeze({
    overview: {
      label: "개요",
      eyebrow: "READ ONLY",
      description: "런타임·DB·semantic readiness와 데이터 규모를 한곳에서 확인합니다."
    },
    review: {
      label: "중복 검토",
      eyebrow: "REVIEW + WRITE",
      description: "중복 후보의 근거를 검토하고 판정을 기록합니다. physical merge는 별도 안전 게이트를 따릅니다."
    },
    authoring: {
      label: "신규 등록",
      eyebrow: "AUTHORING",
      description: "Person·Polity·Role identity와 Activity 관계를 authoritative write path로 등록합니다."
    },
    inspector: {
      label: "Object Inspector",
      eyebrow: "READ ONLY",
      description: "UUID 기준으로 Person·Activity·Polity·Role·Period Basis·Relation Type·Source 원본을 검사합니다."
    }
  });

  const authPanel = document.getElementById("adminAuthPanel");
  const duplicateArea = document.getElementById("duplicateProtectedArea");
  const dataArea = document.getElementById("dataProtectedArea");
  const mergeBoundary = document.querySelector(".merge-boundary");
  const observabilityStack = dataArea?.querySelector(".observability-stack");
  const systemPanel = dataArea?.querySelector('[aria-labelledby="system-status-title"]');
  const inspectorPanel = dataArea?.querySelector('[aria-labelledby="inspector-title"]');
  const identityPanel = dataArea?.querySelector('[aria-labelledby="identity-title"]');
  const activityPanel = dataArea?.querySelector('[aria-labelledby="input-title"]');

  if (!authPanel || !duplicateArea || !dataArea || !systemPanel || !inspectorPanel || !identityPanel || !activityPanel) {
    console.warn("ATLAS Admin workspace could not initialize because required DOM anchors are missing.");
    return;
  }

  function createView(id, children) {
    const section = document.createElement("section");
    section.id = `admin-view-${id}`;
    section.className = "admin-workspace-view";
    section.dataset.adminViewPanel = id;
    section.setAttribute("role", "tabpanel");
    section.setAttribute("aria-labelledby", `admin-tab-${id}`);
    for (const child of children.filter(Boolean)) section.appendChild(child);
    return section;
  }

  const reviewChildren = [...duplicateArea.children];
  if (mergeBoundary) reviewChildren.push(mergeBoundary);
  const reviewView = createView("review", reviewChildren);
  duplicateArea.appendChild(reviewView);

  const overviewView = createView("overview", [systemPanel]);
  const authoringView = createView("authoring", [identityPanel, activityPanel]);
  const inspectorView = createView("inspector", [inspectorPanel]);

  if (observabilityStack && observabilityStack.children.length === 0) observabilityStack.remove();
  dataArea.append(overviewView, authoringView, inspectorView);

  const workspace = document.createElement("section");
  workspace.className = "admin-workspace-nav";
  workspace.setAttribute("aria-labelledby", "admin-workspace-title");
  workspace.innerHTML = `
    <div class="admin-workspace-nav-head">
      <div>
        <p class="status-label">ADMIN WORKSPACE</p>
        <h2 id="admin-workspace-title">관리 작업공간</h2>
        <p>모든 기존 관리 기능은 유지한 채 작업 목적별로 정리했습니다. 탭은 정보를 삭제하지 않으며 URL hash로 직접 접근할 수 있습니다.</p>
      </div>
      <span class="admin-workspace-scope">SESSION PROTECTED</span>
    </div>
    <div class="admin-workspace-tabs" role="tablist" aria-label="관리자 작업공간"></div>
    <p id="adminWorkspaceDescription" class="admin-workspace-description" aria-live="polite"></p>
  `;

  const tabList = workspace.querySelector(".admin-workspace-tabs");
  const description = workspace.querySelector("#adminWorkspaceDescription");
  const tabs = new Map();

  for (const view of VIEW_ORDER) {
    const meta = VIEW_META[view];
    const button = document.createElement("button");
    button.type = "button";
    button.id = `admin-tab-${view}`;
    button.className = "admin-workspace-tab";
    button.dataset.adminView = view;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", `admin-view-${view}`);
    button.setAttribute("aria-selected", "false");
    button.tabIndex = -1;
    button.innerHTML = `<span>${meta.label}</span><small>${meta.eyebrow}</small>`;
    tabList.appendChild(button);
    tabs.set(view, button);
  }

  authPanel.insertAdjacentElement("afterend", workspace);

  const views = new Map([
    ["overview", overviewView],
    ["review", reviewView],
    ["authoring", authoringView],
    ["inspector", inspectorView]
  ]);

  let currentView = "overview";

  function normalizeHash(hash) {
    const value = String(hash || "").replace(/^#/, "").trim();
    if (!value) return "overview";
    const direct = value.replace(/^admin-/, "");
    return VIEW_ORDER.includes(direct) ? direct : "overview";
  }

  function renderView(view, { focus = false, updateHash = false } = {}) {
    const next = VIEW_ORDER.includes(view) ? view : "overview";
    currentView = next;

    duplicateArea.hidden = next !== "review";
    dataArea.hidden = next === "review";

    for (const [id, panel] of views) panel.hidden = id !== next;
    for (const [id, tab] of tabs) {
      const selected = id === next;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
    }

    if (description) description.textContent = VIEW_META[next].description;
    workspace.dataset.activeView = next;

    if (updateHash) {
      const target = `#admin-${next}`;
      if (window.location.hash !== target) history.pushState(null, "", target);
    }
    if (focus) tabs.get(next)?.focus();
    window.dispatchEvent(new CustomEvent("atlas-admin-workspace-changed", { detail: { view: next } }));
  }

  function moveBy(delta) {
    const index = VIEW_ORDER.indexOf(currentView);
    const next = VIEW_ORDER[(index + delta + VIEW_ORDER.length) % VIEW_ORDER.length];
    renderView(next, { focus: true, updateHash: true });
  }

  tabList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-view]");
    if (!button) return;
    renderView(button.dataset.adminView, { updateHash: true });
  });

  tabList.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveBy(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveBy(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      renderView(VIEW_ORDER[0], { focus: true, updateHash: true });
    } else if (event.key === "End") {
      event.preventDefault();
      renderView(VIEW_ORDER[VIEW_ORDER.length - 1], { focus: true, updateHash: true });
    }
  });

  window.addEventListener("hashchange", () => renderView(normalizeHash(window.location.hash)));
  renderView(normalizeHash(window.location.hash));

  window.ATLAS_ADMIN_WORKSPACE = Object.freeze({
    getView: () => currentView,
    setView: (view) => renderView(view, { updateHash: true })
  });
})();
