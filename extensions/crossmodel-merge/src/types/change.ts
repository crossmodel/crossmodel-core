/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import * as vscode from 'vscode';

export type ChangeKind = 'add' | 'remove' | 'update' | 'rename';
export type NodeKind = string; // use $type values

export interface PropDelta {
   base?: unknown;
   ours?: unknown;
   theirs?: unknown;
}

export interface Change {
   id: string; // stable identity (root or child, from IdentifiedObject.id if present)
   nodeKind: NodeKind; // e.g., 'LogicalEntity', 'Attribute', ...
   fileUri: vscode.Uri;
   kind: ChangeKind;
   details?: Record<string, PropDelta>; // for updates: property-level deltas
   conflicts?: boolean; // any property conflict?
   children?: Change[]; // nested changes (sections / child nodes)
   label?: string; // for UI: nice name if available
}
