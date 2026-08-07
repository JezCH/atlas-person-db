(() => {
  "use strict";

  function requireApi(name, api) {
    if (!api) throw new Error(`${name} is not available`);
    return api;
  }

  function createIntegration({
    canonicalApi,
    db,
    plannerApi,
    controllerApi,
    executorApi,
    state = "disabled",
    shadowCompiler,
    warn
  } = {}) {
    requireApi("canonical API", canonicalApi);
    requireApi("database client", db);
    requireApi("reconciliation planner", plannerApi);
    requireApi("reconciliation controller", controllerApi);
    requireApi("legacy reconciliation executor", executorApi);

    if (typeof canonicalApi.loadCanonical !== "function") throw new Error("canonical API loadCanonical is required");
    if (typeof plannerApi.planReconciliation !== "function") throw new Error("planner planReconciliation is required");
    if (typeof controllerApi.createController !== "function") throw new Error("controller createController is required");
    if (typeof executorApi.createLegacyReconciliationExecutor !== "function") throw new Error("executor factory is required");
    if (typeof db.from !== "function") throw new Error("database client from() is required");

    const legacyExecutor = executorApi.createLegacyReconciliationExecutor({ db });
    const controller = controllerApi.createController({
      state,
      warn,
      shadowCompiler,
      planner: (input) => plannerApi.planReconciliation(input),
      legacyExecutor
    });

    async function loadInput() {
      const { rows: canonicalRows, excludedNames = [] } = await canonicalApi.loadCanonical();
      const { data: existingRows, error } = await db.from("person_politics").select("*").order("id", { ascending: true });
      if (error) throw error;
      return {
        existingRows: existingRows || [],
        canonicalRows: canonicalRows || [],
        excludedNames,
        obsoleteKeys: [...(canonicalApi.OBSOLETE_KEYS || [])],
        snapshotId: "canonical-loader"
      };
    }

    async function run() {
      if (controller.state === "disabled") {
        return controller.run();
      }
      const input = await loadInput();
      return controller.run(input);
    }

    return Object.freeze({ state: controller.state, run, loadInput });
  }

  const api = Object.freeze({ createIntegration });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_RECONCILIATION_INTEGRATION = api;
})();
