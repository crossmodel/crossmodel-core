/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import type { AstNode } from 'langium';
import * as vscode from 'vscode';
import { applySelected } from '../apply/apply.js';
import { diff3Node } from '../diff3/diff-nodes.js';
import { serializeWithCrossModel } from '../io/emit.js';
import { applyFileChanges } from '../io/fs.js';
import { findFiles, getChangedFiles, getMergeBase, getRelativePath, getRepository, readFileAtRef } from '../io/git-io.js';
import { clearDocumentCache, getCrossModelServices, parseFile, parseText } from '../io/parse.js';
import { HINTS } from '../reflection/hints.js';
import { Change } from '../types/change.js';
import { MergeTreeDataProvider } from './tree.js';

/**
 * Register all commands for the merge extension.
 */
export function registerCommands(context: vscode.ExtensionContext, treeProvider: MergeTreeDataProvider): void {
   context.subscriptions.push(
      vscode.commands.registerCommand('crossmodel.previewDiff', () => previewDiff(treeProvider)),
      vscode.commands.registerCommand('crossmodel.mergeFromRef', () => mergeFromRef(treeProvider)),
      vscode.commands.registerCommand('crossmodel.applySelected', () => applySelectedChanges(treeProvider)),
      vscode.commands.registerCommand('crossmodel.submitChanges', () => submitChanges()),
      vscode.commands.registerCommand('crossmodel.refreshChanges', () => refresh(treeProvider)),
      vscode.commands.registerCommand('crossmodel.acceptAllOurs', () => acceptAllOurs(treeProvider)),
      vscode.commands.registerCommand('crossmodel.acceptAllTheirs', () => acceptAllTheirs(treeProvider)),
      vscode.commands.registerCommand('crossmodel.showRawDiff', () => showRawDiff())
   );
}

/**
 * Preview diff between HEAD and working tree (2-way).
 */
async function previewDiff(treeProvider: MergeTreeDataProvider): Promise<void> {
   try {
      await vscode.window.withProgress(
         {
            location: vscode.ProgressLocation.Notification,
            title: 'Computing diff...',
            cancellable: false
         },
         async () => {
            // Clear document cache to avoid conflicts on refresh
            clearDocumentCache();

            const config = vscode.workspace.getConfiguration('crossmodelMerge');
            const modelGlob = config.get<string>('modelGlob', '**/*.cm');

            // Only get files that Git reports as changed
            const files = await getChangedFiles(modelGlob);
            const changes: Change[] = [];

            const services = getCrossModelServices();
            const reflection = services.shared.AstReflection;

            for (const fileUri of files) {
               try {
                  // Parse working tree version
                  const ours = await parseFile(fileUri);
                  if (!ours) {
                     continue;
                  }

                  // Try to get HEAD version
                  const relativePath = await getRelativePath(fileUri);
                  let base: AstNode | undefined;

                  try {
                     const baseText = await readFileAtRef('HEAD', relativePath);
                     // Use virtual URI with 'HEAD' suffix to avoid conflicts with working tree version
                     base = await parseText(baseText, fileUri, 'HEAD');
                  } catch (error) {
                     // File doesn't exist in HEAD - it's new
                     base = undefined;
                  }

                  // Compute 2-way diff (HEAD vs working tree)
                  // For 2-way diff: base=HEAD, ours=working tree, theirs=HEAD (to indicate no third-party changes)
                  const change = diff3Node(base, ours, base, fileUri, reflection, HINTS);
                  if (change) {
                     changes.push(change);
                  }
               } catch (error) {
                  console.error(`Error processing file ${fileUri.fsPath}:`, error);
               }
            }

            treeProvider.setChanges(changes, 'diff');
            vscode.window.showInformationMessage(`Found ${changes.length} changed file(s)`);
         }
      );
   } catch (error) {
      vscode.window.showErrorMessage(`Failed to preview diff: ${error}`);
   }
}

/**
 * Merge from a ref (3-way).
 */
async function mergeFromRef(treeProvider: MergeTreeDataProvider): Promise<void> {
   try {
      // Prompt for ref
      const config = vscode.workspace.getConfiguration('crossmodelMerge');
      const defaultRef = config.get<string>('git.targetRef', '');

      const ref = await vscode.window.showInputBox({
         prompt: 'Enter the ref/branch to merge from',
         value: defaultRef,
         placeHolder: 'e.g., main, develop, origin/main'
      });

      if (!ref) {
         return;
      }

      await vscode.window.withProgress(
         {
            location: vscode.ProgressLocation.Notification,
            title: `Computing 3-way merge with ${ref}...`,
            cancellable: false
         },
         async () => {
            // Clear document cache to avoid conflicts on refresh
            clearDocumentCache();

            const modelGlob = config.get<string>('modelGlob', '**/*.cm');
            const files = await findFiles(modelGlob);
            const changes: Change[] = [];

            const services = getCrossModelServices();
            const reflection = services.shared.AstReflection;

            // Get merge base
            const mergeBase = await getMergeBase('HEAD', ref);

            for (const fileUri of files) {
               try {
                  const relativePath = await getRelativePath(fileUri);

                  // Parse base version
                  let base: AstNode | undefined;
                  try {
                     const baseText = await readFileAtRef(mergeBase, relativePath);
                     // Use virtual URI with 'base' suffix to avoid conflicts
                     base = await parseText(baseText, fileUri, 'base');
                  } catch {
                     base = undefined;
                  }

                  // Parse ours version (working tree)
                  const ours = await parseFile(fileUri);

                  // Parse theirs version
                  let theirs: AstNode | undefined;
                  try {
                     const theirsText = await readFileAtRef(ref, relativePath);
                     // Use virtual URI with 'theirs' suffix to avoid conflicts
                     theirs = await parseText(theirsText, fileUri, 'theirs');
                  } catch {
                     theirs = undefined;
                  }

                  // Compute 3-way diff
                  const change = diff3Node(base, ours, theirs, fileUri, reflection, HINTS);
                  if (change) {
                     changes.push(change);
                  }
               } catch (error) {
                  console.error(`Error processing file ${fileUri.fsPath}:`, error);
               }
            }

            treeProvider.setChanges(changes, 'merge');
            vscode.window.showInformationMessage(`Found ${changes.length} changed file(s). Conflicts are marked with ⚠️`);
         }
      );
   } catch (error) {
      vscode.window.showErrorMessage(`Failed to merge from ref: ${error}`);
   }
}

/**
 * Apply selected changes to working tree.
 */
async function applySelectedChanges(treeProvider: MergeTreeDataProvider): Promise<void> {
   try {
      const changes = treeProvider.getChanges();
      if (changes.length === 0) {
         vscode.window.showInformationMessage('No changes to apply');
         return;
      }

      await vscode.window.withProgress(
         {
            location: vscode.ProgressLocation.Notification,
            title: 'Applying changes...',
            cancellable: false
         },
         async () => {
            const services = getCrossModelServices();
            const reflection = services.shared.AstReflection;
            const fileChanges = new Map<vscode.Uri, string | null>();

            for (const change of changes) {
               if (!treeProvider.isSelected(change.id)) {
                  continue;
               }

               try {
                  // Parse the current file
                  const ours = await parseFile(change.fileUri);
                  if (!ours) {
                     console.error(`Failed to parse ${change.fileUri.fsPath}`);
                     continue;
                  }

                  // Apply the change
                  const modified = applySelected(ours, change, c => treeProvider.isSelected(c.id), reflection, HINTS);

                  // Serialize the modified AST
                  const newText = serializeWithCrossModel(modified, change.fileUri);
                  fileChanges.set(change.fileUri, newText);
               } catch (error) {
                  console.error(`Error applying change to ${change.fileUri.fsPath}:`, error);
               }
            }

            // Apply all file changes
            const success = await applyFileChanges(fileChanges);
            if (success) {
               vscode.window.showInformationMessage(`Applied changes to ${fileChanges.size} file(s)`);
               // Refresh the tree
               await refresh(treeProvider);
            } else {
               vscode.window.showErrorMessage('Failed to apply some changes');
            }
         }
      );
   } catch (error) {
      vscode.window.showErrorMessage(`Failed to apply changes: ${error}`);
   }
}

/**
 * Submit changes (commit and push).
 */
async function submitChanges(): Promise<void> {
   try {
      const repo = await getRepository();
      if (!repo) {
         vscode.window.showErrorMessage('No Git repository found');
         return;
      }

      // Use the built-in Git commands
      await vscode.commands.executeCommand('git.commitAll');
      await vscode.commands.executeCommand('git.push');

      vscode.window.showInformationMessage('Changes committed and pushed');
   } catch (error) {
      vscode.window.showErrorMessage(`Failed to submit changes: ${error}`);
   }
}

/**
 * Refresh the current view.
 */
async function refresh(treeProvider: MergeTreeDataProvider): Promise<void> {
   const mode = treeProvider.getMode();
   if (mode === 'diff') {
      await previewDiff(treeProvider);
   } else {
      // For merge mode, we need to know the ref - prompt again
      vscode.window.showInformationMessage('Use "Merge from Ref" to compute a new merge');
   }
}

/**
 * Accept all ours for conflicts.
 */
function acceptAllOurs(treeProvider: MergeTreeDataProvider): void {
   treeProvider.acceptAllOurs();
   vscode.window.showInformationMessage('Accepted all ours for conflicts');
}

/**
 * Accept all theirs for conflicts.
 */
function acceptAllTheirs(treeProvider: MergeTreeDataProvider): void {
   treeProvider.acceptAllTheirs();
   vscode.window.showInformationMessage('Accepted all theirs for conflicts');
}

/**
 * Show raw diff in editor.
 */
async function showRawDiff(): Promise<void> {
   vscode.window.showInformationMessage('Raw diff view not yet implemented');
}
