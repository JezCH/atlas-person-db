(() => {
  "use strict";

  function defaultCredentialProvider() {
    if (typeof window === "undefined" || typeof window.prompt !== "function") return null;
    return window.prompt("ATLAS 관리자 비밀번호를 입력하세요.");
  }

  function errorText(body, fallback) {
    if (body?.error) return String(body.error);
    const outcome = body?.outcome;
    if (Array.isArray(outcome?.validation_failures) && outcome.validation_failures.length) {
      return outcome.validation_failures.map((item) => item.code || item.field || JSON.stringify(item)).join("; ");
    }
    if (outcome?.transaction_failure) return String(outcome.transaction_failure);
    return fallback;
  }

  async function readJson(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  function createAdapter({
    fetchImpl = globalThis.fetch,
    credentialProvider = defaultCredentialProvider,
    sessionEndpoint = "/api/atlas-session",
    mutationEndpoint = "/api/atlas-mutate"
  } = {}) {
    if (typeof fetchImpl !== "function") throw new Error("fetch implementation is required");
    if (typeof credentialProvider !== "function") throw new Error("credentialProvider must be a function");

    let sessionKnown = false;

    async function sessionStatus() {
      const response = await fetchImpl(sessionEndpoint, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { accept: "application/json" }
      });
      const body = await readJson(response);
      const authenticated = response.ok && body?.authenticated === true;
      sessionKnown = authenticated;
      return authenticated;
    }

    async function login() {
      const password = await credentialProvider();
      if (password == null || String(password).length === 0) {
        return { ok: false, error: "administrator authentication is required" };
      }
      const response = await fetchImpl(sessionEndpoint, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ password: String(password) })
      });
      const body = await readJson(response);
      sessionKnown = response.ok && body?.authenticated === true;
      return sessionKnown
        ? { ok: true }
        : { ok: false, error: errorText(body, "administrator authentication failed") };
    }

    async function ensureSession({ force = false } = {}) {
      if (!force && sessionKnown) return { ok: true };
      if (!force && await sessionStatus()) return { ok: true };
      return login();
    }

    async function rawMutation(operation, payload) {
      return fetchImpl(mutationEndpoint, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ operation, payload })
      });
    }

    function compatibleFailure(operation, message, status = null) {
      return {
        request_id: null,
        mode: "server-v2-only",
        write_mode: "v2-only",
        operation,
        committed: false,
        legacy: { attempted: false, committed: false, record_ids: [] },
        v2: { attempted: false, committed: false, normalized_relationship_ids: [] },
        rollback_required: false,
        errors: [String(message || "server mutation failed")],
        http_status: status
      };
    }

    function compatibleOutcome(operation, response, body) {
      const outcome = body?.outcome;
      if (!response.ok || !body?.ok || !outcome) {
        return compatibleFailure(operation, errorText(body, `server mutation failed (${response.status})`), response.status);
      }
      if (outcome.write_mode !== "v2-only") {
        return compatibleFailure(operation, `unexpected server write mode: ${outcome.write_mode || "<missing>"}`, response.status);
      }
      if (outcome.committed !== true || outcome.v2?.committed !== true) {
        return compatibleFailure(operation, errorText(body, "v2-only mutation was not committed"), response.status);
      }
      return {
        ...outcome,
        mode: "server-v2-only",
        errors: [],
        rollback_required: outcome.rollback === true,
        http_status: response.status
      };
    }

    async function mutate(operation, payload) {
      const auth = await ensureSession();
      if (!auth.ok) return compatibleFailure(operation, auth.error, 401);

      let response = await rawMutation(operation, payload);
      if (response.status === 401) {
        sessionKnown = false;
        const renewed = await ensureSession({ force: true });
        if (!renewed.ok) return compatibleFailure(operation, renewed.error, 401);
        response = await rawMutation(operation, payload);
      }
      const body = await readJson(response);
      return compatibleOutcome(operation, response, body);
    }

    async function logout() {
      const response = await fetchImpl(sessionEndpoint, {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
        headers: { accept: "application/json" }
      });
      sessionKnown = false;
      return response.ok;
    }

    return Object.freeze({
      mode: "server-v2-only",
      createActivity: (payload) => mutate("create", payload),
      updateActivity: (id, value) => mutate("update", { id, value }),
      deleteActivity: (id) => mutate("delete", { id }),
      deletePerson: (personId, confirmationName) => mutate("delete_person", {
        person_id: String(personId || "").trim(),
        confirmation_name: String(confirmationName || "").trim()
      }),
      importActivities: (rows) => mutate("import", rows),
      ensureSession,
      sessionStatus,
      logout
    });
  }

  const api = Object.freeze({ createAdapter, defaultCredentialProvider });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_SERVER_WRITE_ADAPTER = api;
})();
