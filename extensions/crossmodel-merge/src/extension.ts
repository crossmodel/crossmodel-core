/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import * as vscode from 'vscode';
import { onRepositoryChange } from './io/git-io.js';
import { registerCommands } from './ui/commands.js';
import { MergeTreeDataProvider } from './ui/tree.js';

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

   // Set up auto-refresh on Git state changes (only in diff mode)
   onRepositoryChange(async () => {
      console.log('[CrossModel Merge] Git state changed');
      const mode = treeProvider.getMode();
      console.log('[CrossModel Merge] Current mode:', mode);
      if (mode === 'diff') {
         // Auto-refresh only if we're in diff mode (HEAD vs working tree)
         // Use the refresh command to update the view
         console.log('[CrossModel Merge] Auto-refreshing changes...');
         await vscode.commands.executeCommand('crossmodel.refreshChanges');
      }
   }).then(disposable => {
      if (disposable) {
         console.log('[CrossModel Merge] Git state change listener registered');
         context.subscriptions.push(disposable);
      } else {
         console.log('[CrossModel Merge] Failed to register Git state change listener - no repository found');
      }
   });

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
