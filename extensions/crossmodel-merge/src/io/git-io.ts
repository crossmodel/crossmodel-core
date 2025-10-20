/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import * as vscode from 'vscode';

interface GitExtension {
   getAPI(version: number): GitAPI;
}

interface GitAPI {
   repositories: Repository[];
}

interface Repository {
   rootUri: vscode.Uri;
   getMergeBase(ref1: string, ref2: string): Promise<string>;
   show(ref: string, path: string): Promise<string>;
   state: RepositoryState;
}

interface RepositoryState {
   HEAD?: { commit?: string };
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
   
   try {
      return await repo.show(ref, relativePath);
   } catch (error) {
      // File doesn't exist at this ref
      throw new Error(`File not found at ref ${ref}: ${relativePath}`);
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
 * Convert an absolute URI to a path relative to the workspace root.
 */
export function getRelativePath(uri: vscode.Uri): string {
   const root = getWorkspaceRoot();
   if (!root) {
      return uri.fsPath;
   }
   
   return vscode.workspace.asRelativePath(uri, false);
}
