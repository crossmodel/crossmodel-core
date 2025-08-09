/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { TypeGuard } from '@crossmodel/protocol';
import { FileSystemNode, FileSystemProvider, LangiumDocument, URI } from 'langium';
import { DefaultSharedModuleContext, LangiumServices } from 'langium/lsp';
import { ParseHelperOptions } from 'langium/test';
import { CrossModelServices } from '../../../src/language-server/cross-model-module.js';
import {
   CrossModelRoot,
   DataModel,
   LogicalEntity,
   Mapping,
   Relationship,
   SystemDiagram
} from '../../../src/language-server/generated/ast.js';
import { SemanticRoot, WithDocument } from '../../../src/language-server/util/ast-util.js';
export declare function createCrossModelTestServices(context?: DefaultSharedModuleContext): CrossModelServices;
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
export declare function parseDocument(input: DocumentInput): Promise<LangiumDocument<CrossModelRoot>>;
export declare function parseDocuments(...inputs: DocumentInput[]): Promise<LangiumDocument<CrossModelRoot>[]>;
export declare function parseSemanticRoot<T extends SemanticRoot>(
   input: DocumentInput,
   assert: ParseAssert,
   guard: TypeGuard<T>
): Promise<WithDocument<T>>;
export declare function parseLogicalEntity(input: DocumentInput, assert?: ParseAssert): Promise<WithDocument<LogicalEntity>>;
export declare function parseRelationship(input: DocumentInput, assert?: ParseAssert): Promise<WithDocument<Relationship>>;
export declare function parseSystemDiagram(input: DocumentInput, assert?: ParseAssert): Promise<WithDocument<SystemDiagram>>;
export declare function parseMapping(input: DocumentInput, assert?: ParseAssert): Promise<WithDocument<Mapping>>;
export declare function parseDataModel(input: DocumentInput, assert?: ParseAssert): Promise<WithDocument<DataModel>>;
export declare const MockFileSystem: DefaultSharedModuleContext;
export declare class MockFileSystemProvider implements FileSystemProvider {
   protected fileContent: Map<string, string>;
   setFile(uri: URI, content: string): void;
   readFile(uri: URI): Promise<string>;
   readDirectory(uri: URI): Promise<FileSystemNode[]>;
}
export declare function testUri(...segments: string[]): string;
//# sourceMappingURL=utils.d.ts.map
