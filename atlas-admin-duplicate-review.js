(() => {
  "use strict";

  function createDuplicateReviewClient({
    fetchImpl = globalThis.fetch,
    endpoint = "/api/atlas-duplicate-review"
  } = {}) {
    if (typeof fetchImpl !== "function") throw new Error("fetch implementation is required");

    async function request(method, body = null) {
      const response = await fetchImpl(endpoint, {
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
        const error = new Error(payload?.error || `duplicate review request failed (${response.status})`);
        error.code = payload?.code || null;
        error.status = response.status;
        error.collisions = payload?.collisions || null;
        throw error;
      }
      return payload;
    }

    const requestId = (prefix) => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return Object.freeze({
      listCandidates: () => request("GET"),
      rebuildCandidates: () => request("POST", { operation: "REBUILD_CANDIDATES" }),
      reviewCandidate: ({ candidateId, decision, rationale }) => request("POST", {
        operation: "REVIEW_CANDIDATE",
        candidate_id: candidateId,
        decision,
        rationale: String(rationale || "").trim() || null,
        request_id: requestId("review")
      }),
      executeApprovedMerge: ({ candidateId, survivorPersonId }) => request("POST", {
        operation: "EXECUTE_APPROVED_MERGE",
        candidate_id: candidateId,
        survivor_person_id: survivorPersonId,
        request_id: requestId("merge")
      })
    });
  }

  const api = Object.freeze({ createDuplicateReviewClient });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_ADMIN_DUPLICATE_REVIEW = api;
})();
