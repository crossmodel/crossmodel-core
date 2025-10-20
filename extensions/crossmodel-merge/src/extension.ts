/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import * as vscode from 'vscode';
import { MergeTreeDataProvider } from './ui/tree.js';
import { registerCommands } from './ui/commands.js';

let treeView: vscode.TreeView<any> | undefined;

/**
 * Activate the CrossModel Merge extension.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
   console.log('CrossModel Merge extension is now active');
   
   // Create the tree data provider
   const treeProvider = new MergeTreeDataProvider();
   
   // Register the tree view
   treeView = vscode.window.createTreeView('crossmodelChanges', {
      treeDataProvider: treeProvider,
      showCollapseAll: true,
      canSelectMany: false
   });
   
   context.subscriptions.push(treeView);
   
   // Handle checkbox changes
   treeView.onDidChangeCheckboxState(e => {
      for (const [item, state] of e.items) {
         const checked = state === vscode.TreeItemCheckboxState.Checked;
         treeProvider.setSelected(item.change.id, checked);
      }
   });
   
   // Register commands
   registerCommands(context, treeProvider);
   
   vscode.window.showInformationMessage('CrossModel Merge extension activated');
}

/**
 * Deactivate the extension.
 */
export function deactivate(): void {
   if (treeView) {
      treeView.dispose();
   }
}
