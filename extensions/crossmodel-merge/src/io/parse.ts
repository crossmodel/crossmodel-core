/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import type { AstNode } from 'langium';
import * as vscode from 'vscode';
import { URI } from 'vscode-uri';

// DocumentState enum values from Langium (avoiding runtime import)
// 0 = Parsed, 1 = IndexedContent, 2 = ComputedScopes, 3 = Linked, 4 = IndexedReferences, 5 = Validated
const LINKED_STATE = 3;

// Import CrossModel services from the server package
// This uses workspace references from tsconfig.json
import type { CrossModelServices } from '@crossmodel/server';
import { createCrossModelServices } from '@crossmodel/server';

let servicesInstance: { shared: any; CrossModel: CrossModelServices } | undefined;

/**
 * Simple empty file system provider for Langium.
 * We handle file I/O through VS Code API, so this just provides stubs.
 */
const emptyFileSystemProvider = {
   readFile: async (_uri: URI): Promise<string> => '',
   readDirectory: async (_uri: URI): Promise<any[]> => []
};

/**
 * Empty file system context for creating Langium services.
 * Matches the structure of Langium's EmptyFileSystem.
 */
const EmptyFileSystem = {
   fileSystemProvider: () => emptyFileSystemProvider
};

/**
 * Get or create the CrossModel services instance.
 */
function getServices(): { shared: any; CrossModel: CrossModelServices } {
   if (!servicesInstance) {
      // Create services with empty file system since we handle file I/O through VS Code API
      servicesInstance = createCrossModelServices(EmptyFileSystem);
   }
   return servicesInstance;
}

/**
 * Clear all cached documents from the Langium document store.
 * This is useful before starting a new diff/merge operation to avoid conflicts.
 */
export function clearDocumentCache(): void {
   if (servicesInstance) {
      // Recreate services to get a fresh document store
      // This is the cleanest way to clear all documents
      servicesInstance = undefined;
   }
}

/**
 * Parse a CrossModel file from text.
 *
 * @param text File content
 * @param uri File URI
 * @param virtualSuffix Optional suffix to create a virtual URI (for parsing different versions of same file)
 * @returns The root AST node, or undefined if parsing failed
 */
export async function parseText(text: string, uri: vscode.Uri, virtualSuffix?: string): Promise<AstNode | undefined> {
   const services = getServices();
   const documents = services.shared.workspace.LangiumDocuments;
   const documentBuilder = services.shared.workspace.DocumentBuilder;

   // Create a virtual URI if suffix is provided to avoid conflicts when parsing different versions
   const langiumUri = virtualSuffix ? URI.parse(`${uri.toString()}?version=${virtualSuffix}`) : URI.parse(uri.toString());

   // Check if document already exists
   const existingDocument = documents.getDocument(langiumUri);
   if (existingDocument) {
      // Document already parsed, return cached version
      // Wait for it to be ready first (Linked state)
      await documentBuilder.waitUntil(LINKED_STATE, langiumUri);

      if (existingDocument.parseResult.parserErrors.length > 0) {
         console.error('Parse errors:', existingDocument.parseResult.parserErrors);
         return undefined;
      }

      const root = existingDocument.parseResult.value;
      if (!root) {
         return undefined;
      }

      const crossModelRoot = root as any;
      return (
         crossModelRoot.entity ||
         crossModelRoot.relationship ||
         crossModelRoot.systemDiagram ||
         crossModelRoot.mapping ||
         crossModelRoot.datamodel
      );
   }

   // Create a new document
   const document = services.shared.workspace.LangiumDocumentFactory.fromString(text, langiumUri);
   documents.addDocument(document);

   // Build and link the document with full processing including scope computation
   // This prevents "ComputedScopes state" warnings
   await documentBuilder.build([document], { validation: false });

   // Wait for the document to reach Linked state (state 3)
   // This ensures references are properly resolved before we use the document
   await documentBuilder.waitUntil(LINKED_STATE, langiumUri);

   if (document.parseResult.parserErrors.length > 0) {
      console.error('Parse errors:', document.parseResult.parserErrors);
      return undefined;
   }

   // Return the actual root node (entity, relationship, etc.)
   const root = document.parseResult.value;
   if (!root) {
      return undefined;
   }

   // CrossModelRoot is a wrapper; extract the actual content
   const crossModelRoot = root as any;
   return (
      crossModelRoot.entity ||
      crossModelRoot.relationship ||
      crossModelRoot.systemDiagram ||
      crossModelRoot.mapping ||
      crossModelRoot.datamodel
   );
}

/**
 * Parse a file from the workspace (working tree).
 */
export async function parseFile(uri: vscode.Uri): Promise<AstNode | undefined> {
   const content = await vscode.workspace.fs.readFile(uri);
   const text = Buffer.from(content).toString('utf-8');
   return parseText(text, uri);
}

/**
 * Get the CrossModel services instance for accessing the serializer.
 */
export function getCrossModelServices(): { shared: any; CrossModel: CrossModelServices } {
   return getServices();
}
