/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { EmptyFileSystem, URI } from 'langium';
import { parseDocument as langiumParseDocument } from 'langium/test';
import path from 'path';
import { createCrossModelServices } from '../../../src/language-server/cross-model-module.js';
import { isDataModel, isLogicalEntity, isMapping, isRelationship, isSystemDiagram } from '../../../src/language-server/generated/ast.js';
import { findSemanticRoot } from '../../../src/language-server/util/ast-util.js';
export function createCrossModelTestServices(context = EmptyFileSystem) {
   return createCrossModelServices(context).CrossModel;
}
export async function parseDocument(input) {
   if (input.documentUri) {
      const fileSystemProvider = input.services.shared.workspace.FileSystemProvider;
      if (fileSystemProvider instanceof MockFileSystemProvider) {
         fileSystemProvider.setFile(URI.parse(input.documentUri), input.text);
      }
   }
   return langiumParseDocument(input.services, input.text, input);
}
export async function parseDocuments(...inputs) {
   return Promise.all(inputs.map(parseDocument));
}
export async function parseSemanticRoot(input, assert, guard) {
   const document = await parseDocument(input);
   expect(document.parseResult.lexerErrors).toHaveLength(assert.lexerErrors ?? 0);
   expect(document.parseResult.parserErrors).toHaveLength(assert.parserErrors ?? 0);
   const semanticRoot = findSemanticRoot(document, guard);
   expect(semanticRoot).toBeDefined();
   semanticRoot.$document = document;
   return semanticRoot;
}
export async function parseLogicalEntity(input, assert = {}) {
   return parseSemanticRoot(input, assert, isLogicalEntity);
}
export async function parseRelationship(input, assert = {}) {
   return parseSemanticRoot(input, assert, isRelationship);
}
export async function parseSystemDiagram(input, assert = {}) {
   return parseSemanticRoot(input, assert, isSystemDiagram);
}
export async function parseMapping(input, assert = {}) {
   return parseSemanticRoot(input, assert, isMapping);
}
export async function parseDataModel(input, assert = {}) {
   return parseSemanticRoot(input, assert, isDataModel);
}
export const MockFileSystem = {
   fileSystemProvider: () => new MockFileSystemProvider()
};
export class MockFileSystemProvider {
   constructor() {
      this.fileContent = new Map();
   }
   setFile(uri, content) {
      this.fileContent.set(uri.toString(), content);
   }
   async readFile(uri) {
      return this.fileContent.get(uri.toString()) ?? '';
   }
   async readDirectory(uri) {
      return [];
   }
}
export function testUri(...segments) {
   // making sure the URI works on both Windows and Unix
   return 'test:///' + path.posix.join(...segments);
}
//# sourceMappingURL=utils.js.map
