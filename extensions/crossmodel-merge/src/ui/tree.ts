import {
  Event,
  EventEmitter,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCheckboxState,
  TreeItemCollapsibleState,
  Uri,
  window,
} from 'vscode';
import type { Change } from '../types/change';
import type { SelectionResolver } from '../apply/apply';

export type TreeElement = Change | GroupNode;

class GroupNode {
  constructor(public readonly id: string, public readonly label: string, public readonly children: Change[]) {}
}

type Mode = 'diff' | 'merge';

function changeKey(change: Change): string {
  return `${change.fileUri.toString()}::${change.nodeKind}::${change.id}`;
}

function isStructural(change: Change): boolean {
  return change.nodeKind.includes('.') && !change.details;
}

function createTreeItemLabel(change: Change): string {
  const base = change.label ?? change.nodeKind;
  return base;
}

export class MergeTreeDataProvider implements TreeDataProvider<TreeElement> {
  private readonly onDidChangeTreeDataEmitter = new EventEmitter<TreeElement | undefined | null | void>();
  private groups: GroupNode[] = [];
  private mode: Mode = 'diff';
  private selection = new Map<string, boolean>();
  private allChanges: Change[] = [];

  private readonly partialTooltip = 'Partially selected';

  readonly onDidChangeTreeData: Event<TreeElement | undefined | null | void> =
    this.onDidChangeTreeDataEmitter.event;

  setMode(mode: Mode): void {
    this.mode = mode;
    this.refresh();
  }

  setChanges(changes: Change[]): void {
    this.allChanges = changes;
    const grouped = new Map<string, Change[]>();
    for (const change of changes) {
      const bucket = change.nodeKind;
      const list = grouped.get(bucket) ?? [];
      list.push(change);
      grouped.set(bucket, list);
    }
    this.groups = Array.from(grouped.entries()).map(([kind, list]) => new GroupNode(kind, kind, list));
    this.selection.clear();
    for (const change of changes) {
      this.initialiseSelection(change);
    }
    this.refresh();
  }

  private initialiseSelection(change: Change): void {
    if (!isStructural(change)) {
      const key = changeKey(change);
      this.selection.set(key, !change.conflicts);
    }
    change.children?.forEach(child => this.initialiseSelection(child));
  }

  getTreeItem(element: TreeElement): TreeItem {
    if (element instanceof GroupNode) {
      const item = new TreeItem(element.label, TreeItemCollapsibleState.Expanded);
      item.contextValue = 'group';
      item.checkboxState = this.mode === 'merge'
        ? this.toCheckboxState(this.mergeStates(element.children.map(change => this.computeState(change))))
        : undefined;
      return item;
    }

    const collapsible = element.children && element.children.length > 0
      ? TreeItemCollapsibleState.Collapsed
      : TreeItemCollapsibleState.None;
    const item = new TreeItem(createTreeItemLabel(element), collapsible);
    item.tooltip = `${element.nodeKind} (${element.kind})`;
    item.iconPath = this.iconFor(element);
    item.contextValue = `change:${element.kind}`;
    if (this.mode === 'merge' && !isStructural(element)) {
      const selected = this.selection.get(changeKey(element)) ?? false;
      item.checkboxState = selected ? TreeItemCheckboxState.Checked : TreeItemCheckboxState.Unchecked;
    }
    if (this.mode === 'merge' && isStructural(element)) {
      const state = this.computeState(element);
      item.checkboxState = this.toCheckboxState(state);
    }
    return item;
  }

  getChildren(element?: TreeElement): TreeElement[] {
    if (!element) {
      return this.groups;
    }
    if (element instanceof GroupNode) {
      return element.children;
    }
    return element.children ?? [];
  }

  getParent(element: TreeElement): TreeElement | undefined {
    if (element instanceof GroupNode) {
      return undefined;
    }
    for (const group of this.groups) {
      if (group.children.includes(element)) {
        return group;
      }
      for (const child of group.children) {
        const parent = this.findParent(child, element);
        if (parent) {
          return parent;
        }
      }
    }
    return undefined;
  }

  private findParent(current: Change, target: Change): Change | undefined {
    if (!current.children) {
      return undefined;
    }
    for (const child of current.children) {
      if (child === target) {
        return current;
      }
      const candidate = this.findParent(child, target);
      if (candidate) {
        return candidate;
      }
    }
    return undefined;
  }

  private mergeStates(states: Array<'checked' | 'unchecked' | 'partial' | undefined>): 'checked' | 'unchecked' | 'partial' | undefined {
    let sawChecked = false;
    let sawUnchecked = false;
    for (const state of states) {
      if (!state) {
        continue;
      }
      if (state === 'partial') {
        return 'partial';
      }
      if (state === 'checked') {
        sawChecked = true;
      }
      if (state === 'unchecked') {
        sawUnchecked = true;
      }
    }
    if (sawChecked && sawUnchecked) {
      return 'partial';
    }
    if (sawChecked) {
      return 'checked';
    }
    if (sawUnchecked) {
      return 'unchecked';
    }
    return undefined;
  }

  private computeState(change: Change): 'checked' | 'unchecked' | 'partial' | undefined {
    const selfState = !isStructural(change)
      ? (this.selection.get(changeKey(change)) ? 'checked' : 'unchecked')
      : undefined;
    if (!change.children || change.children.length === 0) {
      return selfState;
    }
    const childStates = change.children.map(child => this.computeState(child));
    const merged = this.mergeStates([...childStates, selfState]);
    return merged;
  }

  private toCheckboxState(state: 'checked' | 'unchecked' | 'partial' | undefined): TreeItem['checkboxState'] | undefined {
    if (!state) {
      return undefined;
    }
    if (state === 'partial') {
      return { state: TreeItemCheckboxState.Unchecked, tooltip: this.partialTooltip };
    }
    return state === 'checked' ? TreeItemCheckboxState.Checked : TreeItemCheckboxState.Unchecked;
  }

  private iconFor(change: Change): ThemeIcon {
    switch (change.kind) {
      case 'add':
        return new ThemeIcon('diff-added');
      case 'remove':
        return new ThemeIcon('diff-removed');
      case 'rename':
        return new ThemeIcon('diff-renamed');
      case 'update':
      default:
        return new ThemeIcon('diff-modified');
    }
  }

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  updateSelection(change: Change, checked: boolean): void {
    if (isStructural(change)) {
      return;
    }
    this.selection.set(changeKey(change), checked);
    if (change.children) {
      for (const child of change.children) {
        this.updateSelection(child, checked);
      }
    }
    this.refresh();
  }

  setAllSelections(value: boolean): void {
    const assign = (change: Change): void => {
      if (!isStructural(change)) {
        this.selection.set(changeKey(change), value);
      }
      change.children?.forEach(assign);
    };
    for (const change of this.allChanges) {
      assign(change);
    }
    this.refresh();
  }

  getSelectionResolver(): SelectionResolver {
    return {
      takeTheirs: (change: Change) => {
        if (isStructural(change)) {
          const childState = this.computeState(change);
          if (childState === 'partial') {
            return false;
          }
          return childState === 'checked';
        }
        const stored = this.selection.get(changeKey(change));
        if (stored !== undefined) {
          return stored;
        }
        return change.conflicts ? false : true;
      },
    };
  }

  reveal(change: Change): void {
    const uri: Uri = change.fileUri;
    void window.showTextDocument(uri, { preview: true });
  }
}
