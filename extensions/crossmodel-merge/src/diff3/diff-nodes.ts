import type { AstNode, AstReflection } from 'langium';
import { Uri } from 'vscode';
import { discoverProps } from '../reflection/discover';
import { resolveId } from '../reflection/ids';
import { HINTS, type Hints } from '../reflection/hints';
import type { Change } from '../types/change';
import { diffScalarProps, hasConflicts } from './diff-values';

function asRecord(node: AstNode | undefined): Record<string, unknown> | undefined {
  if (!node) {
    return undefined;
  }
  return node as unknown as Record<string, unknown>;
}

export interface ChangeNodes {
  base?: AstNode;
  ours?: AstNode;
  theirs?: AstNode;
  parentOurs?: AstNode;
  parentTheirs?: AstNode;
  parentProp?: string;
}

const NODE_DATA = new WeakMap<Change, ChangeNodes>();

export function registerChangeNodes(change: Change, data: ChangeNodes): void {
  NODE_DATA.set(change, data);
}

export function getChangeNodes(change: Change): ChangeNodes | undefined {
  return NODE_DATA.get(change);
}

function signature(node: AstNode, reflection: AstReflection, hints: Hints): string {
  const props = discoverProps(node, reflection, hints);
  const record = asRecord(node);
  const pairs = props.scalars
    .filter(prop => prop !== 'id')
    .map(prop => [prop, record ? record[prop] : undefined] as const)
    .sort(([a], [b]) => String(a).localeCompare(String(b)));
  return JSON.stringify([node.$type, pairs]);
}

interface Slot {
  key: string;
  base?: AstNode;
  ours?: AstNode;
  theirs?: AstNode;
  baseId?: string;
  oursId?: string;
  theirsId?: string;
  signature?: string;
}

function ensureSlot(slots: Map<string, Slot>, key: string): Slot {
  let slot = slots.get(key);
  if (!slot) {
    slot = { key };
    slots.set(key, slot);
  }
  return slot;
}

function tryMatchBySignature(slots: Map<string, Slot>, sig: string | undefined): Slot | undefined {
  if (!sig) {
    return undefined;
  }
  for (const slot of slots.values()) {
    if (!slot.ours && slot.signature === sig) {
      return slot;
    }
  }
  return undefined;
}

function classifyKind(base: AstNode | undefined, ours: AstNode | undefined, theirs: AstNode | undefined, details?: Change['details']): Change['kind'] {
  if (!base) {
    return 'add';
  }
  if (!ours && theirs) {
    return 'add';
  }
  if (ours && !theirs && !base) {
    return 'add';
  }
  if (!ours) {
    return 'remove';
  }
  if (!theirs) {
    return 'update';
  }
  if (details) {
    const renameProps = ['id'];
    for (const prop of Object.keys(details)) {
      if (renameProps.includes(prop)) {
        return 'rename';
      }
    }
  }
  return 'update';
}

function labelFor(node: AstNode | undefined): string | undefined {
  if (!node) {
    return undefined;
  }
  const hint = HINTS[node.$type];
  if (hint?.label) {
    try {
      return hint.label(node);
    } catch {
      // ignore label errors
    }
  }
  const record = asRecord(node);
  const nameValue = record?.name;
  if (typeof nameValue === 'string' && nameValue.length > 0) {
    return nameValue;
  }
  return undefined;
}

export function diff3Node(
  base: AstNode | undefined,
  ours: AstNode | undefined,
  theirs: AstNode | undefined,
  fileUri: Uri,
  reflection: AstReflection,
  hints: Hints
): Change | undefined {
  if (!base && !ours && !theirs) {
    return undefined;
  }
  const node = ours ?? theirs ?? base;
  if (!node) {
    return undefined;
  }

  const discovered = discoverProps(node, reflection, hints);
  const hidden = new Set((hints[node.$type]?.hiddenProps) ?? []);

  const scalarDetails = diffScalarProps(
    asRecord(base),
    asRecord(ours),
    asRecord(theirs),
    hidden
  );

  const children: Change[] = [];

  for (const prop of discovered.singletons) {
    const baseChild = (asRecord(base) as Record<string, AstNode | undefined> | undefined)?.[prop];
    const oursChild = (asRecord(ours) as Record<string, AstNode | undefined> | undefined)?.[prop];
    const theirsChild = (asRecord(theirs) as Record<string, AstNode | undefined> | undefined)?.[prop];
    const childChange = diff3Node(baseChild, oursChild, theirsChild, fileUri, reflection, hints);
    if (childChange) {
      registerChangeNodes(childChange, {
        base: baseChild,
        ours: oursChild,
        theirs: theirsChild,
        parentOurs: ours,
        parentTheirs: theirs,
        parentProp: prop,
      });
      children.push(childChange);
    }
  }

  for (const prop of discovered.arrays) {
    const baseItems = ((asRecord(base) as Record<string, AstNode[] | undefined> | undefined)?.[prop] ?? []) as AstNode[];
    const oursItems = ((asRecord(ours) as Record<string, AstNode[] | undefined> | undefined)?.[prop] ?? []) as AstNode[];
    const theirsItems = ((asRecord(theirs) as Record<string, AstNode[] | undefined> | undefined)?.[prop] ?? []) as AstNode[];

    const slots = new Map<string, Slot>();
    for (const item of baseItems) {
      const id = resolveId(item, reflection, hints);
      const slot = ensureSlot(slots, id);
      slot.base = item;
      slot.baseId = id;
      slot.signature = signature(item, reflection, hints);
    }

    for (const item of oursItems) {
      const id = resolveId(item, reflection, hints);
      let slot = slots.get(id);
      if (!slot) {
        slot = tryMatchBySignature(slots, signature(item, reflection, hints));
      }
      if (!slot) {
        slot = ensureSlot(slots, id);
      }
      slot.ours = item;
      slot.oursId = id;
    }

    for (const item of theirsItems) {
      const id = resolveId(item, reflection, hints);
      let slot = slots.get(id);
      if (!slot) {
        slot = tryMatchBySignature(slots, signature(item, reflection, hints));
      }
      if (!slot) {
        slot = ensureSlot(slots, id);
      }
      slot.theirs = item;
      slot.theirsId = id;
    }

    const childChanges: Change[] = [];
    for (const slot of slots.values()) {
      const childChange = diff3Node(slot.base, slot.ours, slot.theirs, fileUri, reflection, hints);
      if (childChange) {
        registerChangeNodes(childChange, {
          base: slot.base,
          ours: slot.ours,
          theirs: slot.theirs,
          parentOurs: ours,
          parentTheirs: theirs,
          parentProp: prop,
        });
        childChanges.push(childChange);
      }
    }

    if (childChanges.length > 0) {
      children.push({
        id: `${resolveId(node, reflection, hints)}::${prop}`,
        nodeKind: `${node.$type}.${prop}`,
        fileUri,
        kind: 'update',
        label: prop,
        children: childChanges,
      });
    }
  }

  const details = Object.keys(scalarDetails).length > 0 ? scalarDetails : undefined;
  const conflicts = details ? hasConflicts(details) : false;
  const id = resolveId(node, reflection, hints);

  const change: Change = {
    id,
    nodeKind: node.$type,
    fileUri,
    kind: classifyKind(base, ours, theirs, details),
    details,
    conflicts,
    children: children.length > 0 ? children : undefined,
    label: labelFor(ours ?? theirs ?? base),
  };

  const childConflict = children.some(child => child.conflicts);
  if (childConflict) {
    change.conflicts = true;
  }

  if (change.kind === 'update' && !change.details && (!change.children || change.children.length === 0)) {
    return undefined;
  }

  registerChangeNodes(change, {
    base,
    ours,
    theirs,
  });

  return change;
}
