import * as path from 'path';
import { commands, extensions, Uri, window } from 'vscode';

async function getGitApi(): Promise<any> {
  const gitExtension = extensions.getExtension('vscode.git');
  if (!gitExtension) {
    throw new Error('Git extension is not enabled.');
  }
  const extensionExports = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
  return extensionExports.getAPI(1);
}

export async function getRepository(): Promise<any> {
  const api = await getGitApi();
  const repo = api.repositories[0];
  if (!repo) {
    throw new Error('No Git repository found for the current workspace.');
  }
  return repo;
}

function toRepoPath(repo: any, fileUri: Uri): string {
  const repoFsPath = repo.rootUri.fsPath;
  return path.relative(repoFsPath, fileUri.fsPath).replace(/\\/g, '/');
}

export async function readFileAtRef(fileUri: Uri, ref: string): Promise<string | undefined> {
  const repo = await getRepository();
  try {
    const relative = toRepoPath(repo, fileUri);
    return await repo.show(ref, relative);
  } catch (error) {
    console.warn(`Unable to read ${fileUri.toString()} at ref ${ref}:`, error);
    return undefined;
  }
}

export async function getMergeBaseWith(ref: string): Promise<string | undefined> {
  const repo = await getRepository();
  if (typeof repo.getMergeBase === 'function') {
    return repo.getMergeBase('HEAD', ref);
  }
  if (typeof repo.mergeBase === 'function') {
    return repo.mergeBase('HEAD', ref);
  }
  void window.showWarningMessage('Git API does not expose mergeBase. Falling back to HEAD.');
  return 'HEAD';
}

export async function commitAndPush(): Promise<void> {
  const repo = await getRepository();
  try {
    await commands.executeCommand('git.commit');
  } catch (err) {
    const changes: any[] = repo.state?.workingTreeChanges ?? [];
    if (typeof repo.add === 'function') {
      for (const change of changes) {
        if (change.uri) {
          await repo.add([change.uri]);
        }
      }
    }
    if (typeof repo.commit === 'function') {
      await repo.commit('CrossModel merge', { all: true, amend: false });
    } else {
      throw err;
    }
  }
  try {
    await commands.executeCommand('git.push');
  } catch (pushErr) {
    if (typeof repo.push === 'function') {
      await repo.push();
    } else {
      throw pushErr;
    }
  }
}
