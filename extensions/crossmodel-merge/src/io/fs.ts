import { Position, Range, Uri, WorkspaceEdit, workspace } from 'vscode';

export type FileOperation =
  | { kind: 'create'; uri: Uri; contents: string; overwrite?: boolean }
  | { kind: 'replace'; uri: Uri; contents: string }
  | { kind: 'delete'; uri: Uri }
  | { kind: 'rename'; oldUri: Uri; newUri: Uri; overwrite?: boolean };

const FULL_RANGE = new Range(0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

export async function applyFileOperations(operations: FileOperation[]): Promise<boolean> {
  if (operations.length === 0) {
    return true;
  }
  const edit = new WorkspaceEdit();
  for (const op of operations) {
    switch (op.kind) {
      case 'create':
        edit.createFile(op.uri, { overwrite: op.overwrite === true });
        edit.insert(op.uri, new Position(0, 0), op.contents);
        break;
      case 'replace':
        edit.replace(op.uri, FULL_RANGE, op.contents);
        break;
      case 'delete':
        edit.deleteFile(op.uri);
        break;
      case 'rename':
        edit.renameFile(op.oldUri, op.newUri, { overwrite: op.overwrite === true });
        break;
    }
  }
  return workspace.applyEdit(edit);
}
