import type { Uri } from 'vscode';

export type ChangeKind = 'add' | 'remove' | 'update' | 'rename';
export type NodeKind = string;

export interface PropDelta {
  base?: unknown;
  ours?: unknown;
  theirs?: unknown;
}

export interface Change {
  id: string;
  nodeKind: NodeKind;
  fileUri: Uri;
  kind: ChangeKind;
  details?: Record<string, PropDelta>;
  conflicts?: boolean;
  children?: Change[];
  label?: string;
}
