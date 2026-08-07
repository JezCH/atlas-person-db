(() => {
  "use strict";

  const STATES = new Set(["disabled", "dry-run", "legacy-commit", "shadow-validate"]);

  function resolveState(value, warn = console.warn) {
    const requested = String(value || "disabled").trim();
    if (STATES.has(requested)) return requested;
    if (requested && typeof warn === "function") warn(`ATLAS reconciliation state '${requested}' is not authorized; falling back to disabled.`);
    return "disabled";
  }

  function createController({ state = "disabled", planner, legacyExecutor, shadowCompiler, warn } = {}) {
    const resolvedState = resolveState(state, warn);

    async function run(input = {}) {
      if (resolvedState === "disabled") {
        return {
          marker: "PHASE_8B_RECONCILIATION_CONTROLLER",
          state: resolvedState,
          executed: false,
          commit: false,
          database_writes: 0,
          plan: null,
          shadow_validation: null,
          errors: []
        };
      }

      if (typeof planner !== "function") throw new Error("A reconciliation planner is required for non-disabled states");
      const plan = planner(input);

      if (resolvedState === "dry-run") {
        return {
          marker: "PHASE_8B_RECONCILIATION_CONTROLLER",
          state: resolvedState,
          executed: true,
          commit: false,
          database_writes: 0,
          plan,
          shadow_validation: null,
          errors: []
        };
      }

      if (typeof legacyExecutor !== "function") throw new Error("A legacy reconciliation executor is required for commit states");

      let shadowValidation = null;
      if (resolvedState === "shadow-validate") {
        if (typeof shadowCompiler === "function") shadowValidation = await shadowCompiler(plan);
        else shadowValidation = { available: false, reason: "shadow compiler not provided" };
      }

      const legacyResult = await legacyExecutor(plan, input);
      return {
        marker: "PHASE_8B_RECONCILIATION_CONTROLLER",
        state: resolvedState,
        executed: true,
        commit: true,
        database_writes: Number(legacyResult?.database_writes || 0),
        plan,
        legacy: legacyResult || null,
        shadow_validation: shadowValidation,
        v2_committed: false,
        errors: []
      };
    }

    return Object.freeze({ state: resolvedState, run });
  }

  const api = Object.freeze({ resolveState, createController, allowedStates: Object.freeze([...STATES]) });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_RECONCILIATION_CONTROLLER = api;
})();
