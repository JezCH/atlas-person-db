'use strict';

const { loadRegistry } = require('./atlas-registration-obligations.js');

const PHASES = Object.freeze([
  'authoring',
  'authoring_readback',
  'companion_writers',
  'compile',
  'runtime_readback'
]);

function materializeApplicableObligations({ scopes, applicability = {} } = {}) {
  const requestedScopes = new Set(scopes || []);
  const registry = loadRegistry();
  return Object.freeze(registry.obligations
    .filter((item) => requestedScopes.has(item.applies_to))
    .map((item) => Object.freeze({
      key:item.key,
      owning_writer:item.owning_writer,
      semantics:item.semantics,
      applicable:applicability[item.key] !== false
    })));
}

function requiredKeys(obligations) {
  return obligations
    .filter((item) => item.applicable && item.semantics !== 'optional')
    .map((item) => item.key);
}

function normalizeWriterResult(result, phase) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error(`REGISTRATION_COORDINATOR_WRITER_RESULT_INVALID:${phase}`);
  }
  const completed = Array.isArray(result.completed_obligations) ? result.completed_obligations : [];
  const hold = result.hold == null ? null : String(result.hold);
  return Object.freeze({
    completed_obligations:Object.freeze([...new Set(completed.map(String))]),
    hold,
    canonical_ref:result.canonical_ref == null ? null : String(result.canonical_ref)
  });
}

function assertWriterOwnership({ result, obligations, writerName, phase }) {
  const byKey = new Map(obligations.map((item) => [item.key, item]));
  for (const key of result.completed_obligations) {
    const obligation = byKey.get(key);
    if (!obligation) throw new Error(`REGISTRATION_COORDINATOR_UNKNOWN_OBLIGATION:${key}`);
    if (obligation.owning_writer !== writerName) {
      throw new Error(`REGISTRATION_COORDINATOR_WRITER_OWNERSHIP_MISMATCH:${phase}:${key}`);
    }
  }
}

function createRegistrationCoordinator({ writers, registryLoader = loadRegistry } = {}) {
  if (!writers || typeof writers !== 'object') throw new Error('REGISTRATION_COORDINATOR_WRITERS_REQUIRED');
  const registry = registryLoader();
  const registryByKey = new Map(registry.obligations.map((item) => [item.key, item]));

  return Object.freeze({
    async execute({ scopes, applicability = {}, context = {} } = {}) {
      const requestedScopes = new Set(scopes || []);
      const obligations = Object.freeze(registry.obligations
        .filter((item) => requestedScopes.has(item.applies_to))
        .map((item) => Object.freeze({
          key:item.key,
          owning_writer:item.owning_writer,
          semantics:item.semantics,
          applicable:applicability[item.key] !== false
        })));
      if (!obligations.length) throw new Error('REGISTRATION_COORDINATOR_APPLICABLE_OBLIGATIONS_REQUIRED');

      const completed = new Set();
      const trace = [];
      for (const phase of PHASES) {
        const phaseWriters = Object.entries(writers).filter(([,writer]) => {
          const phases = Array.isArray(writer?.phases) ? writer.phases : [writer?.phase];
          return phases.includes(phase);
        });
        for (const [writerName, writer] of phaseWriters) {
          if (typeof writer.run !== 'function') throw new Error(`REGISTRATION_COORDINATOR_WRITER_RUN_REQUIRED:${writerName}`);
          const ownedApplicable = obligations.filter((item) => item.applicable && item.owning_writer === writerName);
          if (!ownedApplicable.length) continue;
          const raw = await writer.run(Object.freeze({
            context,
            obligation_keys:Object.freeze(ownedApplicable.map((item) => item.key))
          }));
          const result = normalizeWriterResult(raw, phase);
          assertWriterOwnership({ result, obligations, writerName, phase });
          for (const key of result.completed_obligations) completed.add(key);
          trace.push(Object.freeze({
            phase,
            writer:writerName,
            completed_obligations:result.completed_obligations,
            canonical_ref:result.canonical_ref
          }));
          if (result.hold) {
            return Object.freeze({
              status:'HOLD',
              hold:result.hold,
              completed_obligations:Object.freeze([...completed]),
              pending_obligations:Object.freeze(requiredKeys(obligations).filter((key) => !completed.has(key))),
              trace:Object.freeze(trace)
            });
          }
        }
      }

      for (const key of completed) {
        if (!registryByKey.has(key)) throw new Error(`REGISTRATION_COORDINATOR_UNKNOWN_OBLIGATION:${key}`);
      }
      const pending = requiredKeys(obligations).filter((key) => !completed.has(key));
      return Object.freeze({
        status:pending.length ? 'HOLD' : 'COMPLETE',
        hold:pending.length ? 'REGISTRATION_OBLIGATIONS_INCOMPLETE' : null,
        completed_obligations:Object.freeze([...completed]),
        pending_obligations:Object.freeze(pending),
        trace:Object.freeze(trace)
      });
    }
  });
}

module.exports = Object.freeze({
  PHASES,
  materializeApplicableObligations,
  requiredKeys,
  normalizeWriterResult,
  assertWriterOwnership,
  createRegistrationCoordinator
});
