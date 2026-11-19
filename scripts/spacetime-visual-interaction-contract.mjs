// Production browser acceptance must compare the actual Activity-selected
// Korean header and its historical year, not an obsolete English UI heading.
export function activityLinkedMeanwhileIsConsistent({ selectedOutput, meanwhileLabel, meanwhileMoment } = {}) {
  if (![selectedOutput, meanwhileLabel, meanwhileMoment].every((value) => typeof value === "string")) return false;
  const marker = "선택 Activity 중간 시점";
  const moment = meanwhileMoment.trim();
  return moment.length > 0 &&
    selectedOutput.trim() === `${marker} · ${moment}` &&
    meanwhileLabel.trim() === `동시대 탐색 · ${marker}`;
}
