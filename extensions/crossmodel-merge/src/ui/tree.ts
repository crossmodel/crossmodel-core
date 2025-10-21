/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import * as vscode from 'vscode';
import { Change } from '../types/change.js';

export type TreeMode = 'diff' | 'merge';

/**
 * Represents a node in the tree - either a folder or a change item.
 */
type TreeNode = FolderNode | ChangeNode;

interface FolderNode {
   type: 'folder';
   name: string;
   path: string;
   children: TreeNode[];
}

interface ChangeNode {
   type: 'change';
   change: Change;
}

/**
 * Tree item for displaying changes with checkboxes in merge mode.
 */
export class ChangeTreeItem extends vscode.TreeItem {
   constructor(
      public readonly node: TreeNode,
      public readonly mode: TreeMode,
      public checked: boolean = true
   ) {
      if (node.type === 'folder') {
         super(node.name, vscode.TreeItemCollapsibleState.Collapsed);
         this.iconPath = vscode.ThemeIcon.Folder;
         this.contextValue = 'folder';
         this.description = '';
      } else {
         const change = node.change;
         const label = change.label || change.id;
         super(
            label,
            change.children && change.children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
         );

         // Set icon based on change kind
         this.iconPath = this.getIcon(change);

         // Set description to show node kind
         this.description = change.nodeKind;

         // Add checkbox in merge mode
         if (mode === 'merge') {
            this.checkboxState = checked ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked;
         }

         // Add context value for commands
         this.contextValue = `change-${change.kind}`;

         // Add tooltip with details
         this.tooltip = this.buildTooltip(change);
      }
   }

   private getIcon(change: Change): vscode.ThemeIcon {
      switch (change.kind) {
         case 'add':
            return new vscode.ThemeIcon('add', new vscode.ThemeColor('gitDecoration.addedResourceForeground'));
         case 'remove':
            return new vscode.ThemeIcon('remove', new vscode.ThemeColor('gitDecoration.deletedResourceForeground'));
         case 'update':
            return change.conflicts
               ? new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'))
               : new vscode.ThemeIcon('edit', new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'));
         case 'rename':
            return new vscode.ThemeIcon('symbol-event', new vscode.ThemeColor('gitDecoration.renamedResourceForeground'));
         default:
            return new vscode.ThemeIcon('circle-outline');
      }
   }

   private buildTooltip(change: Change): vscode.MarkdownString {
      const tooltip = new vscode.MarkdownString();
      tooltip.appendMarkdown(`**${change.kind.toUpperCase()}**: ${change.label || change.id}\n\n`);
      tooltip.appendMarkdown(`Type: ${change.nodeKind}\n\n`);

      if (change.conflicts) {
         tooltip.appendMarkdown('⚠️ **CONFLICT**\n\n');
      }

      if (change.details) {
         tooltip.appendMarkdown('**Property changes:**\n\n');
         for (const [prop, delta] of Object.entries(change.details)) {
            tooltip.appendMarkdown(`- **${prop}**:\n`);
            tooltip.appendMarkdown(`  - Base: \`${this.safeStringify(delta.base)}\`\n`);
            tooltip.appendMarkdown(`  - Ours: \`${this.safeStringify(delta.ours)}\`\n`);
            tooltip.appendMarkdown(`  - Theirs: \`${this.safeStringify(delta.theirs)}\`\n`);
         }
      }

      return tooltip;
   }

   /**
    * Safely stringify a value, handling circular references and AST nodes.
    */
   private safeStringify(value: any): string {
      if (value === null || value === undefined) {
         return String(value);
      }

      // Handle primitives
      if (typeof value !== 'object') {
         return JSON.stringify(value);
      }

      // Handle arrays
      if (Array.isArray(value)) {
         return `[${value.length} items]`;
      }

      // Handle objects - check if it's an AST node (has $type or $container)
      if (value.$type || value.$container) {
         // It's an AST node - show type and name/id if available
         const type = value.$type || 'AstNode';
         const name = value.name || value.id || '';
         return name ? `${type}:${name}` : type;
      }

      // For regular objects, try to stringify but catch circular reference errors
      try {
         return JSON.stringify(value);
      } catch (error) {
         // Fallback for circular references
         return '[Complex Object]';
      }
   }
}

/**
 * Tree data provider for CrossModel changes.
 */
export class MergeTreeDataProvider implements vscode.TreeDataProvider<ChangeTreeItem> {
   private _onDidChangeTreeData = new vscode.EventEmitter<ChangeTreeItem | undefined | null | void>();
   readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

   private changes: Change[] = [];
   private rootNodes: TreeNode[] = [];
   private mode: TreeMode = 'diff';
   private selections = new Map<string, boolean>();

   constructor() {}

   setChanges(changes: Change[], mode: TreeMode): void {
      this.changes = changes;
      this.mode = mode;

      // Build hierarchical tree structure
      this.rootNodes = this.buildTree(changes);

      // Initialize selections
      this.selections.clear();
      this.initializeSelections(changes);

      this.refresh();
   }

   /**
    * Build a hierarchical tree from flat list of changes.
    * Groups changes by their directory structure.
    */
   private buildTree(changes: Change[]): TreeNode[] {
      const rootMap = new Map<string, TreeNode>();

      for (const change of changes) {
         const fileUri = change.fileUri;
         if (!fileUri) {
            // If no URI, add directly to root
            rootMap.set(change.id, { type: 'change', change });
            continue;
         }

         // Get relative path components
         const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
         const relativePath = workspaceFolder ? vscode.workspace.asRelativePath(fileUri, false) : fileUri.fsPath;

         // Split path into segments
         const segments = relativePath.split(/[/\\]/);

         // Skip the file name (last segment) for now
         const dirSegments = segments.slice(0, -1);

         if (dirSegments.length === 0) {
            // File is at root
            rootMap.set(change.id, { type: 'change', change });
            continue;
         }

         // Build folder hierarchy
         let currentPath = '';
         let parentFolder: FolderNode | null = null;

         for (let i = 0; i < dirSegments.length; i++) {
            const segment = dirSegments[i];
            currentPath = currentPath ? `${currentPath}/${segment}` : segment;

            // Look for existing folder at this level
            let folderNode: FolderNode | undefined;

            if (i === 0) {
               // Root level
               const existing = rootMap.get(currentPath);
               if (existing && existing.type === 'folder') {
                  folderNode = existing;
               }
            } else if (parentFolder) {
               // Child level
               const existing = parentFolder.children.find(child => child.type === 'folder' && child.path === currentPath);
               if (existing && existing.type === 'folder') {
                  folderNode = existing;
               }
            }

            // Create folder if it doesn't exist
            if (!folderNode) {
               folderNode = {
                  type: 'folder',
                  name: segment,
                  path: currentPath,
                  children: []
               };

               if (i === 0) {
                  rootMap.set(currentPath, folderNode);
               } else if (parentFolder) {
                  parentFolder.children.push(folderNode);
               }
            }

            // If this is the last segment, add the change
            if (i === dirSegments.length - 1) {
               folderNode.children.push({ type: 'change', change });
            }

            parentFolder = folderNode;
         }
      }

      return Array.from(rootMap.values());
   }

   private initializeSelections(changes: Change[]): void {
      for (const change of changes) {
         // Non-conflicting changes are checked by default
         const checked = !change.conflicts;
         this.selections.set(change.id, checked);

         if (change.children) {
            this.initializeSelections(change.children);
         }
      }
   }

   getChanges(): Change[] {
      return this.changes;
   }

   getMode(): TreeMode {
      return this.mode;
   }

   isSelected(changeId: string): boolean {
      return this.selections.get(changeId) ?? true;
   }

   setSelected(changeId: string, selected: boolean): void {
      this.selections.set(changeId, selected);
   }

   acceptAllOurs(): void {
      // For conflicts, choose ours
      for (const change of this.flattenChanges(this.changes)) {
         if (change.conflicts) {
            this.selections.set(change.id, true);
         }
      }
      this.refresh();
   }

   acceptAllTheirs(): void {
      // For conflicts, choose theirs
      for (const change of this.flattenChanges(this.changes)) {
         if (change.conflicts) {
            this.selections.set(change.id, true);
         }
      }
      this.refresh();
   }

   private flattenChanges(changes: Change[]): Change[] {
      const result: Change[] = [];
      for (const change of changes) {
         result.push(change);
         if (change.children) {
            result.push(...this.flattenChanges(change.children));
         }
      }
      return result;
   }

   refresh(): void {
      this._onDidChangeTreeData.fire();
   }

   getTreeItem(element: ChangeTreeItem): vscode.TreeItem {
      return element;
   }

   getChildren(element?: ChangeTreeItem): vscode.ProviderResult<ChangeTreeItem[]> {
      if (!element) {
         // Root level - return hierarchical structure
         return this.rootNodes.map(node => {
            if (node.type === 'folder') {
               return new ChangeTreeItem(node, this.mode, true);
            } else {
               const checked = this.selections.get(node.change.id) ?? true;
               return new ChangeTreeItem(node, this.mode, checked);
            }
         });
      }

      // Get children based on node type
      if (element.node.type === 'folder') {
         return element.node.children.map(node => {
            if (node.type === 'folder') {
               return new ChangeTreeItem(node, this.mode, true);
            } else {
               const checked = this.selections.get(node.change.id) ?? true;
               return new ChangeTreeItem(node, this.mode, checked);
            }
         });
      } else {
         // Change node - show its children if any
         const change = element.node.change;
         if (change.children) {
            return change.children.map(child => {
               const checked = this.selections.get(child.id) ?? true;
               const childNode: ChangeNode = { type: 'change', change: child };
               return new ChangeTreeItem(childNode, this.mode, checked);
            });
         }
      }

      return [];
   }

   getParent(_element: ChangeTreeItem): vscode.ProviderResult<ChangeTreeItem> {
      // Not implemented - not required for basic functionality
      return undefined;
   }
}
