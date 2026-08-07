(() => {
  "use strict";

  const STATE_DISABLED = "disabled";
  const STATE_ISOLATED = "isolated";

  function resolveState(value) {
    return value === STATE_ISOLATED ? STATE_ISOLATED : STATE_DISABLED;
  }

  function createWriter({ executor, state = STATE_DISABLED } = {}) {
    const effectiveState = resolveState(state);

    async function execute(plan, context = {}) {
      const base = {
        marker: "ATLAS_V2_WRITER_CONTRACT",
        state: effectiveState,
        attempted: false,
        committed: false,
        transaction: false,
        normalized_relationship_ids: [],
        legacy_lineage: context.legacy_lineage ?? null,
        idempotency: { request_id: context.request_id ?? null, replay: false },
        validation_failures: [],
        transaction_failure: null
      };

      if (effectiveState !== STATE_ISOLATED) {
        return Object.freeze({ ...base, transaction_failure: "writer disabled" });
      }
      if (!plan || plan.commit !== false || plan.writes_performed !== 0) {
        return Object.freeze({ ...base, validation_failures: ["unapproved command plan"] });
      }
      if (Array.isArray(plan.blockers) && plan.blockers.length) {
        return Object.freeze({ ...base, validation_failures: plan.blockers });
      }
      if (typeof executor !== "function") {
        return Object.freeze({ ...base, transaction_failure: "isolated executor unavailable" });
      }

      const result = await executor({ plan, context });
      return Object.freeze({
        ...base,
        attempted: true,
        committed: Boolean(result?.committed),
        transaction: Boolean(result?.transaction),
        normalized_relationship_ids: Array.isArray(result?.normalized_relationship_ids) ? result.normalized_relationship_ids : [],
        idempotency: {
          request_id: context.request_id ?? null,
          replay: Boolean(result?.replay)
        },
        transaction_failure: result?.transaction_failure ?? null
      });
    }

    return Object.freeze({ state: effectiveState, execute });
  }

  const api = Object.freeze({
    STATE_DISABLED,
    STATE_ISOLATED,
    resolveState,
    createWriter
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_V2_WRITER_CONTRACT = api;
})();
