import type { PropDelta } from '../types/change';

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

export function diffScalarProps(
  base: Record<string, unknown> | undefined,
  ours: Record<string, unknown> | undefined,
  theirs: Record<string, unknown> | undefined,
  hidden: Set<string>
): Record<string, PropDelta> {
  const details: Record<string, PropDelta> = {};
  const keys = new Set<string>();
  for (const source of [base, ours, theirs]) {
    if (!source) {
      continue;
    }
    for (const key of Object.keys(source)) {
      if (!key.startsWith('$') && !hidden.has(key)) {
        keys.add(key);
      }
    }
  }

  for (const key of keys) {
    const delta: PropDelta = {
      base: base?.[key],
      ours: ours?.[key],
      theirs: theirs?.[key],
    };
    if (!valuesEqual(delta.base, delta.ours) || !valuesEqual(delta.base, delta.theirs)) {
      details[key] = delta;
    }
  }

  return details;
}

export function hasConflicts(details: Record<string, PropDelta>): boolean {
  return Object.values(details).some(delta => {
    const base = delta.base;
    const ours = delta.ours;
    const theirs = delta.theirs;
    const oursChanged = ours !== base;
    const theirsChanged = theirs !== base;
    return oursChanged && theirsChanged && ours !== theirs;
  });
}
