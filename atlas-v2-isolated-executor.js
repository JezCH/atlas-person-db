(() => {
  "use strict";

  function fail(message) {
    const error = new Error(message);
    error.name = "AtlasV2ExecutorError";
    throw error;
  }

  function requireMethod(tx, name) {
    if (!tx || typeof tx[name] !== "function") fail(`transaction adapter missing method: ${name}`);
  }

  async function executeCommand(tx, command, state) {
    switch (command.type) {
      case "BEGIN_IMPORT_ROW":
        state.currentRow = command.row_index;
        return;
      case "RESOLVE_PERSON_EXACT": {
        requireMethod(tx, "resolvePersonExact");
        const personId = await tx.resolvePersonExact(command.lookup);
        if (!personId) fail("person identity unresolved");
        state.person_id = personId;
        return;
      }
      case "RESOLVE_POLITY_EXACT": {
        requireMethod(tx, "resolvePolityExact");
        const polityId = await tx.resolvePolityExact(command.lookup);
        if (!polityId) fail("polity identity unresolved");
        state.polity_id = polityId;
        return;
      }
      case "RESOLVE_ROLE_EXACT": {
        requireMethod(tx, "resolveRoleExact");
        const roleId = await tx.resolveRoleExact(command.lookup);
        if (!roleId) fail("role vocabulary unresolved");
        state.role_id = roleId;
        return;
      }
      case "RESOLVE_PERIOD_BASIS_EXACT": {
        requireMethod(tx, "resolvePeriodBasisExact");
        const periodBasisId = await tx.resolvePeriodBasisExact(command.lookup);
        if (!periodBasisId) fail("period basis unresolved");
        state.period_basis_id = periodBasisId;
        return;
      }
      case "UPSERT_PERSON_POLITICS_V2": {
        requireMethod(tx, "upsertPersonPoliticsV2");
        const id = await tx.upsertPersonPoliticsV2({
          person_id: state.person_id,
          polity_id: state.polity_id,
          role_id: state.role_id,
          period_basis_id: state.period_basis_id,
          legacy_record_id: command.legacy_record_id ?? null,
          legacy_source_key: command.legacy_source_key,
          ...command.values
        });
        if (!id) fail("relationship upsert did not return id");
        state.relationshipIds.push(id);
        state.person_id = null;
        state.polity_id = null;
        state.role_id = null;
        state.period_basis_id = null;
        return;
      }
      case "RESOLVE_RELATIONSHIP_BY_LEGACY_LINEAGE": {
        requireMethod(tx, "resolveRelationshipByLegacyLineage");
        const id = await tx.resolveRelationshipByLegacyLineage(command.lookup);
        if (!id) fail("relationship lineage unresolved");
        state.relationship_id = id;
        return;
      }
      case "RETIRE_OR_DELETE_PERSON_POLITICS_V2": {
        requireMethod(tx, "retireOrDeletePersonPoliticsV2");
        if (!state.relationship_id) fail("relationship lineage must resolve before retirement");
        await tx.retireOrDeletePersonPoliticsV2({
          relationship_id: state.relationship_id,
          legacy_record_id: command.legacy_record_id ?? null
        });
        state.relationshipIds.push(state.relationship_id);
        state.relationship_id = null;
        return;
      }
      default:
        fail(`unsupported executor command: ${command.type}`);
    }
  }

  function createIsolatedExecutor({ transactionFactory } = {}) {
    if (typeof transactionFactory !== "function") {
      throw new Error("transactionFactory is required");
    }

    return async function isolatedExecutor({ plan, context = {} } = {}) {
      if (!plan || plan.commit !== false || plan.writes_performed !== 0) {
        return {
          committed: false,
          transaction: false,
          normalized_relationship_ids: [],
          replay: false,
          transaction_failure: "unapproved command plan"
        };
      }
      if (Array.isArray(plan.blockers) && plan.blockers.length) {
        return {
          committed: false,
          transaction: false,
          normalized_relationship_ids: [],
          replay: false,
          transaction_failure: "command plan blocked"
        };
      }

      const requestId = context.request_id ?? null;
      try {
        const result = await transactionFactory(async (tx) => {
          if (requestId && typeof tx.findReplay === "function") {
            const replay = await tx.findReplay(requestId);
            if (replay) {
              return {
                replay: true,
                normalized_relationship_ids: Array.isArray(replay.normalized_relationship_ids)
                  ? replay.normalized_relationship_ids
                  : []
              };
            }
          }

          const state = {
            person_id: null,
            polity_id: null,
            role_id: null,
            period_basis_id: null,
            relationship_id: null,
            relationshipIds: [],
            currentRow: null
          };

          for (const command of plan.commands || []) {
            await executeCommand(tx, command, state);
          }

          if (requestId && typeof tx.recordRequest === "function") {
            await tx.recordRequest({
              request_id: requestId,
              normalized_relationship_ids: state.relationshipIds.slice()
            });
          }

          return {
            replay: false,
            normalized_relationship_ids: state.relationshipIds.slice()
          };
        });

        return {
          committed: true,
          transaction: true,
          normalized_relationship_ids: result?.normalized_relationship_ids || [],
          replay: Boolean(result?.replay),
          transaction_failure: null
        };
      } catch (error) {
        return {
          committed: false,
          transaction: true,
          normalized_relationship_ids: [],
          replay: false,
          transaction_failure: error?.message || String(error)
        };
      }
    };
  }

  const api = Object.freeze({ createIsolatedExecutor });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_V2_ISOLATED_EXECUTOR = api;
})();
