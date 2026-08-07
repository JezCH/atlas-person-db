(() => {
  "use strict";

  async function run() {
    const config = window.ATLAS_CONFIG || {};
    const canonicalApi = window.ATLAS_CANONICAL_DATA;
    const plannerApi = window.ATLAS_RECONCILIATION_PLANNER;
    const controllerApi = window.ATLAS_RECONCILIATION_CONTROLLER;
    const executorApi = window.ATLAS_LEGACY_RECONCILIATION_EXECUTOR;
    const integrationApi = window.ATLAS_RECONCILIATION_INTEGRATION;

    if (!canonicalApi || !plannerApi || !controllerApi || !executorApi || !integrationApi) {
      throw new Error("ATLAS reconciliation components are not available.");
    }

    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !window.supabase) {
      return { changed: 0, skipped: true, reason: "database-unavailable" };
    }

    const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    const integration = integrationApi.createIntegration({
      canonicalApi,
      db,
      plannerApi,
      controllerApi,
      executorApi,
      state: "legacy-commit"
    });

    const result = await integration.run();
    const plan = result.plan || {};
    const changed = Number(result.database_writes || 0);
    const canonicalRows = Array.isArray(plan.proposed_inserts)
      ? Number(plan.canonical_valid_row_count || 0)
      : 0;

    return {
      changed,
      persons: null,
      activities: canonicalRows,
      controller_state: result.state,
      v2_committed: result.v2_committed === true
    };
  }

  window.ATLAS_RECONCILE_PROMISE = run()
    .then((result) => {
      window.dispatchEvent(new CustomEvent("atlas:reconciled", { detail: result }));
      return result;
    })
    .catch((error) => {
      console.error("ATLAS canonical reconciliation failed", error);
      window.dispatchEvent(new CustomEvent("atlas:reconcile-error", { detail: error }));
      return { changed: 0, error };
    });
})();
