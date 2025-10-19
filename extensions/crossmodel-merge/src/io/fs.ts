/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import * as vscode from 'vscode';

/**
 * Apply file system changes using a WorkspaceEdit.
 */
export async function applyFileChanges(changes: Map<vscode.Uri, string | null>): Promise<boolean> {
   const edit = new vscode.WorkspaceEdit();
   
   for (const [uri, content] of changes) {
      if (content === null) {
         // Delete file
         edit.deleteFile(uri);
      } else {
         try {
            // Check if file exists
            await vscode.workspace.fs.stat(uri);
            // File exists, replace content
            const fullRange = new vscode.Range(
               new vscode.Position(0, 0),
               new vscode.Position(Number.MAX_SAFE_INTEGER, 0)
            );
            edit.replace(uri, fullRange, content);
         } catch {
            // File doesn't exist, create it
            edit.createFile(uri, { overwrite: false });
            // Then insert content
            edit.insert(uri, new vscode.Position(0, 0), content);
         }
      }
   }
   
   return vscode.workspace.applyEdit(edit);
}

/**
 * Rename a file.
 */
export async function renameFile(oldUri: vscode.Uri, newUri: vscode.Uri): Promise<boolean> {
   const edit = new vscode.WorkspaceEdit();
   edit.renameFile(oldUri, newUri);
   return vscode.workspace.applyEdit(edit);
}
