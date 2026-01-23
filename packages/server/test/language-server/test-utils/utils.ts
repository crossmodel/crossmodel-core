/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { TypeGuard } from '@crossmodel/protocol';
import { EmptyFileSystem, EmptyFileSystemProvider, FileSystemNode, FileSystemProvider, LangiumDocument, URI } from 'langium';
import { DefaultSharedModuleContext, LangiumServices } from 'langium/lsp';
import { ParseHelperOptions, parseDocument as langiumParseDocument } from 'langium/test';
import path from 'path';
import { CrossModelServices, createCrossModelServices } from '../../../src/language-server/cross-model-module';
import {
   CrossModelRoot,
   DataModel,
   LogicalEntity,
   Mapping,
   Relationship,
   SystemDiagram,
   isDataModel,
   isLogicalEntity,
   isMapping,
   isRelationship,
   isSystemDiagram
} from '../../../src/language-server/generated/ast';
import { SemanticRoot, WithDocument, findSemanticRoot } from '../../../src/language-server/util/ast-util';

export function createCrossModelTestServices(context: DefaultSharedModuleContext = EmptyFileSystem): CrossModelServices {
   return createCrossModelServices(context).CrossModel;
}

export interface ProjectInput {
   documents: DocumentInput[];
}

export interface DocumentInput extends ParseHelperOptions {
   services: LangiumServices;
   text: string;
}

export interface ParseAssert {
   lexerErrors?: number;
   parserErrors?: number;
}

export async function parseDocument(input: DocumentInput): Promise<LangiumDocument<CrossModelRoot>> {
   if (input.documentUri) {
      const fileSystemProvider = input.services.shared.workspace.FileSystemProvider;
      if (fileSystemProvider instanceof MockFileSystemProvider) {
         fileSystemProvider.setFile(URI.parse(input.documentUri), input.text);
      }
   }
   return langiumParseDocument<CrossModelRoot>(input.services, input.text, input);
}

export async function parseDocuments(...inputs: DocumentInput[]): Promise<LangiumDocument<CrossModelRoot>[]> {
   return Promise.all(inputs.map(parseDocument));
}

export async function parseSemanticRoot<T extends SemanticRoot>(
   input: DocumentInput,
   assert: ParseAssert,
   guard: TypeGuard<T>
): Promise<WithDocument<T>> {
   const document = await parseDocument(input);
   expect(document.parseResult.lexerErrors).toHaveLength(assert.lexerErrors ?? 0);
   expect(document.parseResult.parserErrors).toHaveLength(assert.parserErrors ?? 0);
   const semanticRoot = findSemanticRoot(document, guard);
   expect(semanticRoot).toBeDefined();
   (semanticRoot as any).$document = document;
   return semanticRoot as WithDocument<T>;
}

export async function parseLogicalEntity(input: DocumentInput, assert: ParseAssert = {}): Promise<WithDocument<LogicalEntity>> {
   return parseSemanticRoot(input, assert, isLogicalEntity);
}

export async function parseRelationship(input: DocumentInput, assert: ParseAssert = {}): Promise<WithDocument<Relationship>> {
   return parseSemanticRoot(input, assert, isRelationship);
}

export async function parseSystemDiagram(input: DocumentInput, assert: ParseAssert = {}): Promise<WithDocument<SystemDiagram>> {
   return parseSemanticRoot(input, assert, isSystemDiagram);
}

export async function parseMapping(input: DocumentInput, assert: ParseAssert = {}): Promise<WithDocument<Mapping>> {
   return parseSemanticRoot(input, assert, isMapping);
}

export async function parseDataModel(input: DocumentInput, assert: ParseAssert = {}): Promise<WithDocument<DataModel>> {
   return parseSemanticRoot(input, assert, isDataModel);
}

export const MockFileSystem: DefaultSharedModuleContext = {
   fileSystemProvider: () => new MockFileSystemProvider()
};

export class MockFileSystemProvider implements FileSystemProvider {
   protected delegate = new EmptyFileSystemProvider();
   protected fileContent = new Map<string, string>();

   setFile(uri: URI, content: string): void {
      this.fileContent.set(uri.toString(), content);
   }

   deleteFile(uri: URI): void {
      this.fileContent.delete(uri.toString());
   }

   protected hasFile(uri: URI): boolean {
      return this.fileContent.has(uri.toString());
   }

   protected isDirectory(uri: URI): boolean {
      const uriStr = uri.toString();
      const prefix = uriStr.endsWith('/') ? uriStr : uriStr + '/';
      for (const key of this.fileContent.keys()) {
         if (key.startsWith(prefix)) {
            return true;
         }
      }
      return false;
   }

   protected createFileNode(uri: URI): FileSystemNode {
      return { uri, isFile: true, isDirectory: false };
   }

   protected createDirectoryNode(uri: URI): FileSystemNode {
      return { uri, isFile: false, isDirectory: true };
   }

   stat(uri: URI): Promise<FileSystemNode> {
      return Promise.resolve(this.statSync(uri));
   }

   statSync(uri: URI): FileSystemNode {
      if (this.hasFile(uri)) {
         return this.createFileNode(uri);
      }
      if (this.isDirectory(uri)) {
         return this.createDirectoryNode(uri);
      }
      return this.delegate.statSync(uri);
   }

   exists(uri: URI): Promise<boolean> {
      return Promise.resolve(this.existsSync(uri));
   }

   existsSync(uri: URI): boolean {
      return this.hasFile(uri) || this.isDirectory(uri);
   }

   readBinary(uri: URI): Promise<Uint8Array> {
      return Promise.resolve(this.readBinarySync(uri));
   }

   readBinarySync(uri: URI): Uint8Array {
      const content = this.fileContent.get(uri.toString());
      if (content !== undefined) {
         return new TextEncoder().encode(content);
      }
      return this.delegate.readBinarySync();
   }

   readFile(uri: URI): Promise<string> {
      return Promise.resolve(this.readFileSync(uri));
   }

   readFileSync(uri: URI): string {
      return this.fileContent.get(uri.toString()) ?? this.delegate.readFileSync();
   }

   readDirectory(uri: URI): Promise<FileSystemNode[]> {
      return Promise.resolve(this.readDirectorySync(uri));
   }

   readDirectorySync(uri: URI): FileSystemNode[] {
      const uriStr = uri.toString();
      const prefix = uriStr.endsWith('/') ? uriStr : uriStr + '/';
      const children = new Map<string, FileSystemNode>();

      for (const key of this.fileContent.keys()) {
         if (key.startsWith(prefix)) {
            const relativePath = key.substring(prefix.length);
            const firstSegment = relativePath.split('/')[0];
            const childUri = URI.parse(prefix + firstSegment);
            const childUriStr = childUri.toString();

            if (!children.has(childUriStr)) {
               const isFile = !relativePath.includes('/');
               children.set(childUriStr, {
                  uri: childUri,
                  isFile,
                  isDirectory: !isFile
               });
            }
         }
      }

      return Array.from(children.values());
   }
}

export function testUri(...segments: string[]): string {
   // making sure the URI works on both Windows and Unix
   return 'test:///' + path.posix.join(...segments);
}
