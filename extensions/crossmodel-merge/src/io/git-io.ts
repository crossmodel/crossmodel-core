/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import * as vscode from 'vscode';

interface GitExtension {
   getAPI(version: number): GitAPI;
}

interface GitAPI {
   repositories: Repository[];
   onDidOpenRepository: vscode.Event<Repository>;
   onDidCloseRepository: vscode.Event<Repository>;
}

interface Resource {
   resource: {
      _resourceUri: vscode.Uri;
   };
}

interface Repository {
   rootUri: vscode.Uri;
   getMergeBase(ref1: string, ref2: string): Promise<string>;
   show(ref: string, path: string): Promise<string>;
   state: RepositoryState;
}

interface RepositoryState {
   HEAD?: { commit?: string };
   workingTreeChanges: Resource[];
   indexChanges: Resource[];
   onDidChange: vscode.Event<void>;
}

/**
 * Get the Git repository for the workspace.
 */
export async function getRepository(): Promise<Repository | undefined> {
   const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
   if (!gitExtension) {
      throw new Error('Git extension not found');
   }

   const git = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
   const api = git.getAPI(1);

   if (api.repositories.length === 0) {
      return undefined;
   }

   return api.repositories[0];
}

/**
 * Get the merge base between two refs.
 */
export async function getMergeBase(ref1: string, ref2: string): Promise<string> {
   const repo = await getRepository();
   if (!repo) {
      throw new Error('No Git repository found');
   }

   return repo.getMergeBase(ref1, ref2);
}

/**
 * Read a file at a specific ref.
 */
export async function readFileAtRef(ref: string, relativePath: string): Promise<string> {
   const repo = await getRepository();
   if (!repo) {
      throw new Error('No Git repository found');
   }

   // Resolve HEAD to actual commit hash since VS Code Git extension doesn't handle "HEAD" well
   let resolvedRef = ref;
   if (ref === 'HEAD') {
      resolvedRef = await getHeadCommit();
   }

   try {
      // Try the VS Code Git extension API first
      const content = await repo.show(resolvedRef, relativePath);
      return content;
   } catch (error) {
      // Fallback to direct git command execution
      try {
         const { exec } = await import('child_process');
         const { promisify } = await import('util');
         const execAsync = promisify(exec);

         const { stdout } = await execAsync(`git show ${resolvedRef}:${relativePath}`, {
            cwd: repo.rootUri.fsPath,
            encoding: 'utf8'
         });

         return stdout;
      } catch (gitError) {
         // File doesn't exist at this ref
         throw new Error(`File not found at ref ${ref}: ${relativePath}`);
      }
   }
}

/**
 * Get the current HEAD commit.
 */
export async function getHeadCommit(): Promise<string> {
   const repo = await getRepository();
   if (!repo) {
      throw new Error('No Git repository found');
   }

   const head = repo.state.HEAD?.commit;
   if (!head) {
      throw new Error('No HEAD commit found');
   }

   return head;
}

/**
 * Get all files matching a glob pattern.
 */
export async function findFiles(pattern: string): Promise<vscode.Uri[]> {
   return vscode.workspace.findFiles(pattern);
}

/**
 * Get the workspace root URI.
 */
export function getWorkspaceRoot(): vscode.Uri | undefined {
   return vscode.workspace.workspaceFolders?.[0]?.uri;
}

/**
 * Convert an absolute URI to a path relative to the Git repository root.
 * This is needed because Git commands operate relative to the repository root,
 * not the workspace root (which might be a subdirectory).
 */
export async function getRelativePath(uri: vscode.Uri): Promise<string> {
   const repo = await getRepository();
   if (!repo) {
      // Fallback to workspace-relative path if no repo found
      const root = getWorkspaceRoot();
      return root ? vscode.workspace.asRelativePath(uri, false) : uri.fsPath;
   }

   // Calculate path relative to repository root
   const repoPath = repo.rootUri.fsPath;
   const filePath = uri.fsPath;

   if (!filePath.startsWith(repoPath)) {
      // File is outside the repository
      return uri.fsPath;
   }

   // Get relative path and normalize to forward slashes for Git
   const relativePath = filePath.substring(repoPath.length + 1);
   return relativePath.replace(/\\/g, '/');
}

/**
 * Get all changed files (modified, added, deleted) in the working tree compared to HEAD.
 * Only returns files matching the given glob pattern.
 */
export async function getChangedFiles(pattern: string): Promise<vscode.Uri[]> {
   const repo = await getRepository();
   if (!repo) {
      // Fallback to all files if no Git repository
      return vscode.workspace.findFiles(pattern);
   }

   // Get all changes from Git extension state
   const changes = [...(repo.state.workingTreeChanges || []), ...(repo.state.indexChanges || [])];

   // If no changes, return empty array
   if (changes.length === 0) {
      return [];
   }

   // Extract unique file URIs and filter by extension
   const changedUris = new Set<string>();
   for (const change of changes) {
      const uri = change.resource?._resourceUri;
      // Skip if resourceUri is undefined or null
      if (!uri || !uri.fsPath) {
         continue;
      }
      // Simple pattern matching: check if file ends with .cm
      if (uri.fsPath.endsWith('.cm')) {
         changedUris.add(uri.toString());
      }
   }

   // Convert to Uri array
   return Array.from(changedUris).map(uriStr => vscode.Uri.parse(uriStr));
}

/**
 * Register a listener for Git repository state changes.
 * Returns a disposable to unregister the listener.
 * If no repository is available yet, waits for one to be opened.
 */
export async function onRepositoryChange(callback: () => void): Promise<vscode.Disposable | undefined> {
   const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
   if (!gitExtension) {
      return undefined;
   }

   const git = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
   const api = git.getAPI(1);

   // If we already have a repository, listen to its state changes
   if (api.repositories.length > 0) {
      const repo = api.repositories[0];
      return repo.state.onDidChange(callback);
   }

   // Otherwise, wait for a repository to be opened
   const disposables: vscode.Disposable[] = [];

   const openListener = api.onDidOpenRepository(repo => {
      // Repository opened, set up the state change listener
      const stateListener = repo.state.onDidChange(callback);
      disposables.push(stateListener);

      // Dispose the open listener since we only need it once
      openListener.dispose();
   });

   disposables.push(openListener);

   // Return a composite disposable
   return {
      dispose: () => {
         for (const disposable of disposables) {
            disposable.dispose();
         }
      }
   };
}
