export const PHFC_GROUPS = Object.freeze(['E', 'R', 'T', 'D', 'G', 'S']);

function assertCount(name, value, max) {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new TypeError(name + ' must be an integer from 0 to ' + max);
  }
}

export function formatPersonFactCountResult(result) {
  const counts = {};
  for (const group of PHFC_GROUPS) {
    const value = result?.[group];
    assertCount(group, value, 6);
    counts[group] = value;
  }

  const unresolved = result?.unresolved ?? result?.UNRESOLVED;
  if (!Number.isInteger(unresolved) || unresolved < 0) {
    throw new TypeError('unresolved must be a non-negative integer');
  }

  const total = PHFC_GROUPS.reduce((sum, group) => sum + counts[group], 0);

  return [
    ...PHFC_GROUPS.map((group) => group + ' ' + counts[group] + '/6'),
    'VERIFIED_TOTAL ' + total + '/36',
    'UNRESOLVED ' + unresolved,
  ].join('\n');
}

export function validatePersonFactCountOutput(text) {
  if (typeof text !== 'string') {
    return { ok: false, error: 'output must be a string' };
  }

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let index = 0;
  while (index < lines.length && lines[index].trim() === '') index += 1;

  if (lines[index]?.trim().startsWith('```')) index += 1;

  const parsed = {};
  for (const group of PHFC_GROUPS) {
    const match = lines[index]?.trim().match(new RegExp('^' + group + ' ([0-6])\\/6$'));
    if (!match) {
      return {
        ok: false,
        error: 'first substantive output must contain ' + group + ' x/6 at canonical position',
      };
    }
    parsed[group] = Number(match[1]);
    index += 1;
  }

  const totalMatch = lines[index]?.trim().match(/^VERIFIED_TOTAL ([0-9]|[12][0-9]|3[0-6])\/36$/);
  if (!totalMatch) {
    return { ok: false, error: 'VERIFIED_TOTAL x/36 is missing or misplaced' };
  }
  const displayedTotal = Number(totalMatch[1]);
  index += 1;

  const unresolvedMatch = lines[index]?.trim().match(/^UNRESOLVED ([0-9]+)$/);
  if (!unresolvedMatch) {
    return { ok: false, error: 'UNRESOLVED y is missing or misplaced' };
  }
  const unresolved = Number(unresolvedMatch[1]);

  const calculatedTotal = PHFC_GROUPS.reduce((sum, group) => sum + parsed[group], 0);
  if (displayedTotal !== calculatedTotal) {
    return {
      ok: false,
      error: 'VERIFIED_TOTAL arithmetic mismatch: displayed ' + displayedTotal + ', calculated ' + calculatedTotal,
    };
  }

  return {
    ok: true,
    counts: parsed,
    verifiedTotal: calculatedTotal,
    unresolved,
  };
}

export function assertPersonFactCountOutput(text) {
  const result = validatePersonFactCountOutput(text);
  if (!result.ok) {
    throw new Error('Invalid PHFC output: ' + result.error);
  }
  return result;
}
