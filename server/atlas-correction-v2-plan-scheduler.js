"use strict";

const PLAN_SCHEMA = "atlas-stage2-correction-v2-execution-plan/v1";

function activityId(value, label) {
  const id = String(value || "").trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) {
    throw new Error(`CORRECTION_V2_SCHEDULER_ACTIVITY_ID_INVALID:${label}`);
  }
  return id;
}

function partitionCorrectionPlanExecutionWaves(plan) {
  if (!plan || typeof plan !== "object" || plan.schema !== PLAN_SCHEMA) {
    throw new Error("CORRECTION_V2_SCHEDULER_PLAN_SCHEMA_INVALID");
  }
  const operations = Array.isArray(plan.operations) ? plan.operations : [];
  if (operations.length === 0) throw new Error("CORRECTION_V2_SCHEDULER_OPERATIONS_REQUIRED");

  const nodeByActivity = new Map();
  const nodes = operations.map((operation, index) => {
    const id = activityId(operation.activity_id, `operation:${index}`);
    if (nodeByActivity.has(id)) throw new Error(`CORRECTION_V2_SCHEDULER_DUPLICATE_MUTATION_TARGET:${id}`);
    const node = { index, id, operation, indegree: 0, successors: new Set(), dependencies: new Set() };
    nodeByActivity.set(id, node);
    return node;
  });

  for (const node of nodes) {
    if (node.operation.type !== "retire_activity") continue;
    for (const rawReplacement of node.operation.replacement_activity_ids || []) {
      const replacement = activityId(rawReplacement, `retire:${node.id}`);
      const producer = nodeByActivity.get(replacement);
      if (!producer) continue;
      if (producer.id === node.id) throw new Error(`CORRECTION_V2_SCHEDULER_SELF_DEPENDENCY:${node.id}`);
      if (!node.dependencies.has(producer.id)) {
        node.dependencies.add(producer.id);
        node.indegree += 1;
        producer.successors.add(node.id);
      }
    }
  }

  const remaining = new Set(nodes.map((node) => node.id));
  const waveNodes = [];
  while (remaining.size) {
    const ready = nodes
      .filter((node) => remaining.has(node.id) && node.indegree === 0)
      .sort((left, right) => left.index - right.index);
    if (ready.length === 0) {
      const cycle = nodes.filter((node) => remaining.has(node.id)).map((node) => node.id).sort();
      throw new Error(`CORRECTION_V2_SCHEDULER_DEPENDENCY_CYCLE:${cycle.join(",")}`);
    }
    waveNodes.push(ready);
    for (const node of ready) {
      remaining.delete(node.id);
      for (const successorId of node.successors) {
        const successor = nodeByActivity.get(successorId);
        successor.indegree -= 1;
      }
    }
  }

  const waveCount = waveNodes.length;
  if (waveCount === 1) return Object.freeze([Object.freeze({ ...plan })]);

  const waves = waveNodes.map((group, index) => {
    const finalWave = index === waveCount - 1;
    const suffix = `wave_${index + 1}_of_${waveCount}`;
    return Object.freeze({
      ...plan,
      batch_id: `${plan.batch_id}__${suffix}`,
      parent_batch_id: plan.batch_id,
      execution_wave: Object.freeze({
        index: index + 1,
        count: waveCount,
        dependency_ordered: true,
        mutation_activity_ids: Object.freeze(group.map((node) => node.id)),
        internal_dependency_activity_ids: Object.freeze([...new Set(group.flatMap((node) => [...node.dependencies]))].sort())
      }),
      operations: Object.freeze(group.map((node) => node.operation)),
      // Structural assertions are independent of the Activity row mutation ordering.
      // Emit them once, on the final wave, so reviewed evidence is neither duplicated nor lost.
      companion_assertions: Object.freeze(finalWave ? [...(plan.companion_assertions || [])] : []),
      polity_relation_assertions: Object.freeze(finalWave ? [...(plan.polity_relation_assertions || [])] : [])
    });
  });
  return Object.freeze(waves);
}

function scheduleCorrectionPlans(plans) {
  if (!Array.isArray(plans) || plans.length === 0) throw new Error("CORRECTION_V2_SCHEDULER_PLANS_REQUIRED");
  const executionUnits = plans.flatMap((plan) => partitionCorrectionPlanExecutionWaves(plan));
  const mutationUnitByActivity = new Map();
  executionUnits.forEach((unit, unitIndex) => {
    for (const operation of unit.operations || []) {
      const id = activityId(operation.activity_id, `unit:${unitIndex}`);
      if (mutationUnitByActivity.has(id)) throw new Error(`CORRECTION_V2_SCHEDULER_PACKAGE_DUPLICATE_MUTATION_TARGET:${id}`);
      mutationUnitByActivity.set(id, { unitIndex, batchId: unit.batch_id, caseId: operation.case_id });
    }
  });

  const crossUnitRetireDependencies = [];
  executionUnits.forEach((unit, unitIndex) => {
    for (const operation of unit.operations || []) {
      if (operation.type !== "retire_activity") continue;
      for (const rawReplacement of operation.replacement_activity_ids || []) {
        const replacement = activityId(rawReplacement, `retire:${operation.case_id}`);
        const producer = mutationUnitByActivity.get(replacement);
        if (!producer) continue;
        if (producer.unitIndex >= unitIndex) {
          throw new Error(`CORRECTION_V2_SCHEDULER_PACKAGE_ORDER_INVALID:survivor=${replacement}:producer=${producer.batchId}:retire=${unit.batch_id}`);
        }
        crossUnitRetireDependencies.push(Object.freeze({
          survivor_activity_id: replacement,
          survivor_case_id: producer.caseId,
          survivor_batch_id: producer.batchId,
          retire_case_id: operation.case_id,
          retire_batch_id: unit.batch_id
        }));
      }
    }
  });

  return Object.freeze({
    reviewed_plan_count: plans.length,
    execution_unit_count: executionUnits.length,
    execution_units: Object.freeze(executionUnits),
    cross_unit_retire_dependencies: Object.freeze(crossUnitRetireDependencies)
  });
}

module.exports = Object.freeze({
  PLAN_SCHEMA,
  partitionCorrectionPlanExecutionWaves,
  scheduleCorrectionPlans
});
