import type { ExtensionContext } from 'vscode';
import { commands, window, workspace } from 'vscode';
import { MergeTreeDataProvider } from './tree';
import type { Change } from '../types/change';
import { diff3Node } from '../diff3/diff-nodes';
import { HINTS } from '../reflection/hints';
import { applySelected, type SelectionResolver } from '../apply/apply';
import { serializeWithCrossModel } from '../io/emit';
import { applyFileOperations, type FileOperation } from '../io/fs';
import { commitAndPush, getMergeBaseWith, readFileAtRef } from '../io/git-io';
import { getReflection, getServicesOnce, parseCrossModelText } from '../io/parse';
import type { ParsedAst } from '../io/parse';

interface FileMergeData {
  uri: import('vscode').Uri;
  base?: ParsedAst;
  ours?: ParsedAst;
  theirs?: ParsedAst;
  change?: Change;
}

type SessionMode = 'diff' | 'merge';

export class MergeController {
  private session: { mode: SessionMode; files: FileMergeData[] } | undefined;

  constructor(private readonly tree: MergeTreeDataProvider) {}

  async previewDiff(): Promise<void> {
    await this.loadSession('diff');
  }

  async mergeFromRef(): Promise<void> {
    const configRef = workspace.getConfiguration('crossmodelMerge').get<string>('git.targetRef');
    const ref = configRef || (await window.showInputBox({ prompt: 'Enter the target ref/branch to merge', placeHolder: 'origin/main' }));
    if (!ref) {
      return;
    }
    const mergeBase = await getMergeBaseWith(ref);
    await this.loadSession('merge', mergeBase, ref);
  }

  async applySelected(): Promise<void> {
    if (!this.session) {
      void window.showWarningMessage('Load a diff before applying changes.');
      return;
    }
    const resolver = this.tree.getSelectionResolver();
    const reflection = await getReflection();
    const services = await getServicesOnce();
    const operations: FileOperation[] = [];

    for (const file of this.session.files) {
      if (!file.change) {
        continue;
      }
      const topChange = file.change;
      const takeTheirs = resolver.takeTheirs(topChange);
      if (topChange.kind === 'add') {
        if (!takeTheirs || !file.theirs) {
          continue;
        }
        const text = serializeWithCrossModel(file.theirs.root, services);
        operations.push({ kind: file.ours ? 'replace' : 'create', uri: file.uri, contents: text });
        continue;
      }
      if (topChange.kind === 'remove') {
        if (!takeTheirs) {
          continue;
        }
        operations.push({ kind: 'delete', uri: file.uri });
        continue;
      }
      if (!file.ours) {
        continue;
      }
      applySelected(file.ours.root, topChange, resolver as SelectionResolver, reflection, HINTS);
      const updated = serializeWithCrossModel(file.ours.root, services);
      operations.push({ kind: 'replace', uri: file.uri, contents: updated });
    }

    if (operations.length === 0) {
      void window.showInformationMessage('No CrossModel changes selected for apply.');
      return;
    }

    const success = await applyFileOperations(operations);
    if (!success) {
      void window.showErrorMessage('Failed to apply file edits.');
    }
  }

  async submitChanges(): Promise<void> {
    try {
      await commitAndPush();
    } catch (error) {
      void window.showErrorMessage(`Unable to submit changes: ${String(error)}`);
    }
  }

  acceptAllOurs(): void {
    this.tree.setAllSelections(false);
  }

  acceptAllTheirs(): void {
    this.tree.setAllSelections(true);
  }

  async refresh(): Promise<void> {
    if (!this.session) {
      await this.previewDiff();
      return;
    }
    const { mode } = this.session;
    if (mode === 'merge') {
      await this.mergeFromRef();
    } else {
      await this.previewDiff();
    }
  }

  private async loadSession(mode: SessionMode, baseRef = 'HEAD', theirsRef?: string): Promise<void> {
    const pattern = workspace.getConfiguration('crossmodelMerge').get<string>('modelGlob', '**/*.cmodel.yaml');
    const files = await workspace.findFiles(pattern);
    if (files.length === 0) {
      void window.showInformationMessage(`No files found for pattern ${pattern}.`);
      return;
    }

    const reflection = await getReflection();
    const results: FileMergeData[] = [];

    for (const fileUri of files) {
      const baseText = await this.readRefOrUndefined(fileUri, baseRef);
      const oursText = await this.readWorkspaceFile(fileUri);
      const theirsText = theirsRef ? await this.readRefOrUndefined(fileUri, theirsRef) : undefined;

      const baseAst = baseText !== undefined ? await parseCrossModelText(fileUri, baseText, baseRef) : undefined;
      const oursAst = oursText !== undefined ? await parseCrossModelText(fileUri, oursText, 'workspace') : undefined;
      const theirsAst = theirsText !== undefined ? await parseCrossModelText(fileUri, theirsText, theirsRef ?? 'target') : undefined;

      const change = diff3Node(baseAst?.root, oursAst?.root, theirsAst?.root, fileUri, reflection, HINTS);
      if (change) {
        results.push({ uri: fileUri, base: baseAst, ours: oursAst, theirs: theirsAst, change });
      }
    }

    this.session = { mode, files: results };
    const topLevelChanges = results.map(result => result.change!).filter(Boolean);
    this.tree.setMode(mode);
    this.tree.setChanges(topLevelChanges);
  }

  private async readRefOrUndefined(uri: import('vscode').Uri, ref: string): Promise<string | undefined> {
    try {
      const content = await readFileAtRef(uri, ref);
      return content ?? undefined;
    } catch {
      return undefined;
    }
  }

  private async readWorkspaceFile(uri: import('vscode').Uri): Promise<string | undefined> {
    try {
      const data = await workspace.fs.readFile(uri);
      return new TextDecoder().decode(data);
    } catch {
      return undefined;
    }
  }
}

export function registerCommands(context: ExtensionContext, tree: MergeTreeDataProvider): MergeController {
  const controller = new MergeController(tree);
  context.subscriptions.push(
    commands.registerCommand('crossmodel.previewDiff', () => controller.previewDiff()),
    commands.registerCommand('crossmodel.mergeFromRef', () => controller.mergeFromRef()),
    commands.registerCommand('crossmodel.applySelected', () => controller.applySelected()),
    commands.registerCommand('crossmodel.submitChanges', () => controller.submitChanges()),
    commands.registerCommand('crossmodel.acceptAllOurs', () => controller.acceptAllOurs()),
    commands.registerCommand('crossmodel.acceptAllTheirs', () => controller.acceptAllTheirs()),
    commands.registerCommand('crossmodel.refreshView', () => controller.refresh()),
    commands.registerCommand('crossmodel.showRawDiff', () => commands.executeCommand('git.openChange'))
  );

  return controller;
}
