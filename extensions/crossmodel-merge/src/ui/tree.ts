/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import * as vscode from 'vscode';
import { Change } from '../types/change.js';

export type TreeMode = 'diff' | 'merge';

/**
 * Tree item for displaying changes with checkboxes in merge mode.
 */
export class ChangeTreeItem extends vscode.TreeItem {
   constructor(
      public readonly change: Change,
      public readonly mode: TreeMode,
      public checked: boolean = true
   ) {
      const label = change.label || change.id;
      super(label, change.children && change.children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
      
      // Set icon based on change kind
      this.iconPath = this.getIcon();
      
      // Set description to show file path for root nodes
      this.description = change.nodeKind;
      
      // Add checkbox in merge mode
      if (mode === 'merge') {
         this.checkboxState = checked
            ? vscode.TreeItemCheckboxState.Checked
            : vscode.TreeItemCheckboxState.Unchecked;
      }
      
      // Add context value for commands
      this.contextValue = `change-${change.kind}`;
      
      // Add tooltip with details
      this.tooltip = this.buildTooltip();
   }
   
   private getIcon(): vscode.ThemeIcon {
      switch (this.change.kind) {
         case 'add':
            return new vscode.ThemeIcon('add', new vscode.ThemeColor('gitDecoration.addedResourceForeground'));
         case 'remove':
            return new vscode.ThemeIcon('remove', new vscode.ThemeColor('gitDecoration.deletedResourceForeground'));
         case 'update':
            return this.change.conflicts
               ? new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'))
               : new vscode.ThemeIcon('edit', new vscode.ThemeColor('gitDecoration.modifiedResourceForeground'));
         case 'rename':
            return new vscode.ThemeIcon('symbol-event', new vscode.ThemeColor('gitDecoration.renamedResourceForeground'));
         default:
            return new vscode.ThemeIcon('circle-outline');
      }
   }
   
   private buildTooltip(): vscode.MarkdownString {
      const tooltip = new vscode.MarkdownString();
      tooltip.appendMarkdown(`**${this.change.kind.toUpperCase()}**: ${this.change.label || this.change.id}\n\n`);
      tooltip.appendMarkdown(`Type: ${this.change.nodeKind}\n\n`);
      
      if (this.change.conflicts) {
         tooltip.appendMarkdown('⚠️ **CONFLICT**\n\n');
      }
      
      if (this.change.details) {
         tooltip.appendMarkdown('**Property changes:**\n\n');
         for (const [prop, delta] of Object.entries(this.change.details)) {
            tooltip.appendMarkdown(`- **${prop}**:\n`);
            tooltip.appendMarkdown(`  - Base: \`${JSON.stringify(delta.base)}\`\n`);
            tooltip.appendMarkdown(`  - Ours: \`${JSON.stringify(delta.ours)}\`\n`);
            tooltip.appendMarkdown(`  - Theirs: \`${JSON.stringify(delta.theirs)}\`\n`);
         }
      }
      
      return tooltip;
   }
}

/**
 * Tree data provider for CrossModel changes.
 */
export class MergeTreeDataProvider implements vscode.TreeDataProvider<ChangeTreeItem> {
   private _onDidChangeTreeData = new vscode.EventEmitter<ChangeTreeItem | undefined | null | void>();
   readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
   
   private changes: Change[] = [];
   private mode: TreeMode = 'diff';
   private selections = new Map<string, boolean>();
   
   constructor() {}
   
   setChanges(changes: Change[], mode: TreeMode): void {
      this.changes = changes;
      this.mode = mode;
      
      // Initialize selections
      this.selections.clear();
      this.initializeSelections(changes);
      
      this.refresh();
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
         // Root level - group by file
         return this.changes.map(change => {
            const checked = this.selections.get(change.id) ?? true;
            return new ChangeTreeItem(change, this.mode, checked);
         });
      }
      
      // Child level
      if (element.change.children) {
         return element.change.children.map(change => {
            const checked = this.selections.get(change.id) ?? true;
            return new ChangeTreeItem(change, this.mode, checked);
         });
      }
      
      return [];
   }
   
   getParent(element: ChangeTreeItem): vscode.ProviderResult<ChangeTreeItem> {
      // Not implemented - not required for basic functionality
      return undefined;
   }
}
