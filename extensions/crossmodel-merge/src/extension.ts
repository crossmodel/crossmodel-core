import type { ExtensionContext, TreeCheckboxChangeEvent } from 'vscode';
import { TreeItemCheckboxState, window } from 'vscode';
import { MergeTreeDataProvider, type TreeElement } from './ui/tree';
import { registerCommands } from './ui/commands';

export function activate(context: ExtensionContext): void {
  const provider = new MergeTreeDataProvider();
  const scmView = window.createTreeView<TreeElement>('crossmodelMergeView', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });
  const explorerView = window.createTreeView<TreeElement>('crossmodelMergeViewExplorer', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });
  context.subscriptions.push(scmView, explorerView);

  const controller = registerCommands(context, provider);
  void controller.previewDiff();

  const handleCheckboxChange = (event: TreeCheckboxChangeEvent<TreeElement>): void => {
    for (const [item, state] of event.items) {
      if (isChangeElement(item)) {
        provider.updateSelection(item, state === TreeItemCheckboxState.Checked);
      }
    }
  };

  context.subscriptions.push(
    scmView.onDidChangeCheckboxState(handleCheckboxChange),
    explorerView.onDidChangeCheckboxState(handleCheckboxChange)
  );
}

function isChangeElement(element: TreeElement): element is import('./types/change').Change {
  return 'fileUri' in element;
}

export function deactivate(): void {}
