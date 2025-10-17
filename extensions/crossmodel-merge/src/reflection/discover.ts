import type { AstNode, AstReflection } from 'langium';
import type { Hints } from './hints';

export interface DiscoveredProps {
  scalars: string[];
  singletons: string[];
  arrays: string[];
}

function isAstNode(value: unknown): value is AstNode {
  return typeof value === 'object' && value !== null && '$type' in (value as Record<string, unknown>);
}

function asRecord(node: AstNode): Record<string, unknown> {
  return node as unknown as Record<string, unknown>;
}

export function discoverProps(node: AstNode, _reflection: AstReflection, hints: Hints): DiscoveredProps {
  const scalars: string[] = [];
  const singletons: string[] = [];
  const arrays: string[] = [];
  const hint = hints[node.$type] ?? {};
  const hidden = new Set(hint.hiddenProps ?? []);

  for (const key of Object.keys(node)) {
    if (key.startsWith('$') || hidden.has(key)) {
      continue;
    }
    const value = asRecord(node)[key];
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      if (value.some(item => isAstNode(item))) {
        arrays.push(key);
      }
      continue;
    }
    if (isAstNode(value)) {
      singletons.push(key);
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      scalars.push(key);
    }
  }

  return { scalars, singletons, arrays };
}
