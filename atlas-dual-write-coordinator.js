(() => {
  "use strict";

  function createCoordinator({ legacyAdapter, planner, v2Writer } = {}) {
    if (!legacyAdapter) throw new Error("legacyAdapter is required");
    if (!planner || typeof planner.plan !== "function") throw new Error("v2 command planner is required");
    if (typeof v2Writer !== "function") throw new Error("v2 writer is required");

    async function execute(operation, payload) {
      const legacyMethod = {
        create: "createActivity",
        update: "updateActivity",
        delete: "deleteActivity",
        import: "importActivities"
      }[operation];
      if (!legacyMethod || typeof legacyAdapter[legacyMethod] !== "function") {
        throw new Error(`unsupported dual-write operation: ${operation}`);
      }

      const legacy = operation === "update"
        ? await legacyAdapter[legacyMethod](payload.id, payload.value)
        : operation === "delete"
          ? await legacyAdapter[legacyMethod](payload.id)
          : await legacyAdapter[legacyMethod](payload);

      if (legacy?.errors?.length || !legacy?.legacy?.committed) {
        return {
          operation,
          legacy,
          v2: null,
          drift: null,
          rollback_required: false,
          promoted: false,
          errors: legacy?.errors || ["legacy write failed"]
        };
      }

      const plan = planner.plan(operation, payload);
      if (plan.blockers?.length) {
        return {
          operation,
          legacy,
          v2: null,
          drift: null,
          rollback_required: true,
          promoted: false,
          errors: plan.blockers.map((b) => b.code || "v2 plan blocked")
        };
      }

      const requestId = legacy.request_id || null;
      const v2 = await v2Writer({ plan, context: { request_id: requestId } });
      const ok = Boolean(v2?.committed && !v2?.transaction_failure);
      return {
        operation,
        legacy,
        v2,
        drift: ok ? false : null,
        rollback_required: !ok,
        promoted: ok,
        errors: ok ? [] : [v2?.transaction_failure || "v2 write failed"]
      };
    }

    return Object.freeze({ execute });
  }

  const api = Object.freeze({ createCoordinator });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_DUAL_WRITE_COORDINATOR = api;
})();
