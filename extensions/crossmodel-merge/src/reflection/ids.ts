import type { AstNode, AstReflection } from 'langium';
import { discoverProps } from './discover';
import { HINTS } from './hints';

const syntheticIds = new WeakMap<AstNode, string>();
const counterByKey = new Map<string, number>();

function asRecord(node: AstNode): Record<string, unknown> {
  return node as unknown as Record<string, unknown>;
}

export function resolveId(node: AstNode, reflection: AstReflection, hints = HINTS): string {
  const hint = hints[node.$type];
  const keyProp = hint?.keyProp;
  if (keyProp) {
    const record = asRecord(node);
    const value = record[keyProp];
    if (typeof value === 'string') {
      return value;
    }
  }

  const idValue = asRecord(node).id;
  if (typeof idValue === 'string' && idValue.length > 0) {
    return idValue;
  }

  const props = discoverProps(node, reflection, hints);
  for (const prop of props.scalars) {
    const value = asRecord(node)[prop];
    if (typeof value === 'string' && value.length > 0) {
      return `${node.$type}:${value}`;
    }
  }

  const existing = syntheticIds.get(node);
  if (existing) {
    return existing;
  }

  const record = asRecord(node);
  const baseKey = `${node.$type}:${JSON.stringify(props.scalars.map(prop => record[prop]))}`;
  const count = (counterByKey.get(baseKey) ?? 0) + 1;
  counterByKey.set(baseKey, count);
  const synthetic = `${baseKey}#${count}`;
  syntheticIds.set(node, synthetic);
  return synthetic;
}
