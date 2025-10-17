import type { AstNode, AstReflection } from 'langium';
import { resolveId } from '../reflection/ids';
import type { Hints } from '../reflection/hints';
import type { Change } from '../types/change';
import { getChangeNodes } from '../diff3/diff-nodes';

function asWritable(node: AstNode | undefined): Record<string, unknown> | undefined {
  if (!node) {
    return undefined;
  }
  return node as unknown as Record<string, unknown>;
}

export interface SelectionResolver {
  takeTheirs(change: Change): boolean;
  takeTheirsForProp?(change: Change, prop: string): boolean | undefined;
}

function cloneNode(node: AstNode): AstNode {
  const plain = JSON.parse(
    JSON.stringify(node, (key, value) => {
      if (key === '$container' || key === '$containerProperty' || key === '$containerIndex' || key === '$document') {
        return undefined;
      }
      return value;
    })
  );
  return plain as AstNode;
}

function updateArrayContainers(array: AstNode[], parent: AstNode, property: string): void {
  array.forEach((item, index) => {
    const writable = asWritable(item);
    if (!writable) {
      return;
    }
    writable['$container'] = parent;
    writable['$containerProperty'] = property;
    writable['$containerIndex'] = index;
  });
}

function applyScalarChanges(change: Change, oursNode: AstNode, selection: SelectionResolver): void {
  if (!change.details) {
    return;
  }
  for (const [prop, delta] of Object.entries(change.details)) {
    const decision = selection.takeTheirsForProp?.(change, prop);
    let takeTheirs: boolean;
    if (decision !== undefined) {
      takeTheirs = decision;
    } else if (selection.takeTheirs(change)) {
      takeTheirs = true;
    } else {
      const oursChanged = delta.base !== delta.ours;
      const theirsChanged = delta.base !== delta.theirs;
      if (oursChanged && !theirsChanged) {
        takeTheirs = false;
      } else if (!oursChanged && theirsChanged) {
        takeTheirs = true;
      } else {
        takeTheirs = false;
      }
    }
    const value = takeTheirs ? delta.theirs : delta.ours;
    const writable = asWritable(oursNode);
    if (writable) {
      writable[prop] = value as unknown;
    }
  }
}

function removeChild(parent: AstNode | undefined, property: string | undefined, child: AstNode | undefined, reflection: AstReflection, hints: Hints): void {
  if (!parent || !property || !child) {
    return;
  }
  const parentWritable = asWritable(parent);
  if (!parentWritable) {
    return;
  }
  const containerValue = parentWritable[property];
  if (Array.isArray(containerValue)) {
    const idToRemove = resolveId(child, reflection, hints);
    const filtered = (containerValue as AstNode[]).filter(item => resolveId(item, reflection, hints) !== idToRemove);
    parentWritable[property] = filtered;
    updateArrayContainers(filtered, parent, property);
  } else {
    parentWritable[property] = undefined;
  }
}

function addChild(parent: AstNode | undefined, property: string | undefined, node: AstNode | undefined): void {
  if (!parent || !property || !node) {
    return;
  }
  const clone = cloneNode(node);
  const parentWritable = asWritable(parent);
  if (!parentWritable) {
    return;
  }
  const value = parentWritable[property];
  if (Array.isArray(value)) {
    const array = value as AstNode[];
    array.push(clone);
    updateArrayContainers(array, parent, property);
  } else {
    parentWritable[property] = clone;
    const cloneWritable = asWritable(clone);
    if (cloneWritable) {
      cloneWritable['$container'] = parent;
      cloneWritable['$containerProperty'] = property;
      cloneWritable['$containerIndex'] = 0;
    }
  }
}

function applyRecursive(
  change: Change,
  selection: SelectionResolver,
  reflection: AstReflection,
  hints: Hints
): void {
  const nodes = getChangeNodes(change);
  if (nodes) {
    const takeTheirs = selection.takeTheirs(change);
    switch (change.kind) {
      case 'add': {
        if (takeTheirs) {
          addChild(nodes.parentOurs ?? nodes.parentTheirs, nodes.parentProp, nodes.theirs ?? nodes.base);
        }
        break;
      }
      case 'remove': {
        if (takeTheirs) {
          removeChild(nodes.parentOurs ?? nodes.parentTheirs, nodes.parentProp, nodes.ours ?? nodes.base, reflection, hints);
        }
        break;
      }
      case 'rename':
      case 'update': {
        if (nodes.ours && (change.details || change.kind === 'rename')) {
          applyScalarChanges(change, nodes.ours, selection);
        }
        break;
      }
    }
  }

  if (change.children) {
    for (const child of change.children) {
      applyRecursive(child, selection, reflection, hints);
    }
  }
}

export function applySelected(
  oursRoot: AstNode,
  rootChange: Change,
  selection: SelectionResolver,
  reflection: AstReflection,
  hints: Hints
): AstNode {
  applyRecursive(rootChange, selection, reflection, hints);
  return oursRoot;
}
