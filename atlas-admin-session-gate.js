(() => {
  "use strict";

  const SESSION_ENDPOINT = "/api/atlas-session";
  const PROTECTED_API_PATHS = new Set(["/api/atlas-duplicate-review", "/api/atlas-mutate", "/api/atlas-identity"]);
  const authPanel = document.getElementById("adminAuthPanel");
  const authMessage = document.getElementById("adminAuthMessage");
  const authBadge = document.getElementById("adminAuthBadge");
  const loginForm = document.getElementById("adminLoginForm");
  const passwordInput = document.getElementById("adminPassword");
  const passwordLabel = document.getElementById("adminPasswordLabel");
  const loginButton = document.getElementById("adminLoginButton");
  const logoutButton = document.getElementById("adminLogoutButton");
  const protectedAreas = [
    document.getElementById("duplicateProtectedArea"),
    document.getElementById("dataProtectedArea")
  ].filter(Boolean);

  let authenticated = false;
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });
  const originalFetch = globalThis.fetch.bind(globalThis);

  function lockProtectedAreas(locked) {
    for (const area of protectedAreas) {
      area.inert = locked;
      area.setAttribute("aria-disabled", locked ? "true" : "false");
      area.classList.toggle("is-locked", locked);
    }
  }

  function renderAuthState({ message, badge, state }) {
    if (authMessage) authMessage.textContent = message;
    if (authBadge) {
      authBadge.textContent = badge;
      authBadge.dataset.state = state;
    }
    if (authPanel) authPanel.dataset.authenticated = authenticated ? "true" : "false";
    if (passwordLabel) passwordLabel.hidden = authenticated;
    if (loginButton) loginButton.hidden = authenticated;
    if (logoutButton) logoutButton.hidden = !authenticated;
    lockProtectedAreas(!authenticated);
  }

  function setAuthenticated(value, options = {}) {
    authenticated = Boolean(value);
    if (authenticated) {
      renderAuthState({
        message: options.message || "관리자 세션이 확인되었습니다. 중복 검토와 DB 저장 기능을 사용할 수 있습니다.",
        badge: "인증됨",
        state: "ready"
      });
    } else {
      renderAuthState({
        message: options.message || "관리자 비밀번호로 로그인해야 중복 검토와 DB 저장 기능을 사용할 수 있습니다.",
        badge: options.badge || "로그인 필요",
        state: options.state || "error"
      });
    }
  }

  async function sessionRequest(method, body) {
    const response = await originalFetch(SESSION_ENDPOINT, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...(body ? { "content-type": "application/json" } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok || payload?.ok !== true) {
      const error = new Error(payload?.error || `administrator session request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function isProtectedRequest(input) {
    try {
      const raw = input instanceof Request ? input.url : String(input || "");
      const url = new URL(raw, window.location.href);
      return url.origin === window.location.origin && PROTECTED_API_PATHS.has(url.pathname);
    } catch {
      return false;
    }
  }

  globalThis.fetch = async (...args) => {
    const response = await originalFetch(...args);
    if (response.status === 401 && isProtectedRequest(args[0])) {
      setAuthenticated(false, { message: "관리자 세션이 만료되었거나 유효하지 않습니다. 다시 로그인하세요.", badge: "세션 만료" });
      window.dispatchEvent(new CustomEvent("atlas-admin-auth-expired"));
    }
    return response;
  };

  async function checkSession() {
    renderAuthState({ message: "현재 관리자 세션을 확인하고 있습니다.", badge: "확인 중", state: "" });
    try {
      const payload = await sessionRequest("GET");
      setAuthenticated(Boolean(payload.authenticated));
    } catch (error) {
      setAuthenticated(false, { message: `관리자 세션 확인 실패: ${error.message}`, badge: "확인 실패" });
    } finally {
      resolveReady();
    }
  }

  async function login(event) {
    event.preventDefault();
    const password = String(passwordInput?.value || "");
    if (!password) {
      setAuthenticated(false, { message: "관리자 비밀번호를 입력하세요.", badge: "입력 필요" });
      passwordInput?.focus();
      return;
    }
    if (loginButton) loginButton.disabled = true;
    if (authBadge) {
      authBadge.textContent = "로그인 중";
      authBadge.dataset.state = "";
    }
    try {
      const payload = await sessionRequest("POST", { password });
      if (!payload.authenticated) throw new Error("administrator session was not established");
      if (passwordInput) passwordInput.value = "";
      setAuthenticated(true);
      window.dispatchEvent(new CustomEvent("atlas-admin-authenticated"));
    } catch (error) {
      setAuthenticated(false, {
        message: error.status === 401 ? "관리자 비밀번호가 일치하지 않습니다." : `관리자 로그인 실패: ${error.message}`,
        badge: "로그인 실패"
      });
      passwordInput?.focus();
    } finally {
      if (loginButton) loginButton.disabled = false;
    }
  }

  async function logout() {
    if (logoutButton) logoutButton.disabled = true;
    try {
      await sessionRequest("DELETE");
    } catch (error) {
      console.error("ATLAS administrator logout failed", error);
    } finally {
      setAuthenticated(false, { message: "관리자 세션이 종료되었습니다. 다시 로그인하면 관리 기능을 사용할 수 있습니다.", badge: "로그아웃" });
      window.dispatchEvent(new CustomEvent("atlas-admin-logged-out"));
      if (logoutButton) logoutButton.disabled = false;
    }
  }

  loginForm?.addEventListener("submit", login);
  logoutButton?.addEventListener("click", logout);
  setAuthenticated(false, { message: "현재 관리자 세션을 확인하고 있습니다.", badge: "확인 중", state: "" });
  checkSession();

  window.ATLAS_ADMIN_SESSION_GATE = Object.freeze({
    ready,
    isAuthenticated: () => authenticated
  });
})();
