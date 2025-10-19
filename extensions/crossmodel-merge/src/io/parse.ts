/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { AstNode } from 'langium';
import { LangiumDocument } from 'langium/lsp';
import * as vscode from 'vscode';
import { URI } from 'vscode-uri';

// TODO: Fix the import path to match the actual location in the repository
import { createCrossModelServices } from '../../../packages/server/src/language-server/cross-model-module.js';
import type { CrossModelServices } from '../../../packages/server/src/language-server/cross-model-module.js';

let servicesInstance: { shared: any; CrossModel: CrossModelServices } | undefined;

/**
 * Get or create the CrossModel services instance.
 */
function getServices(): { shared: any; CrossModel: CrossModelServices } {
   if (!servicesInstance) {
      // Create services without a connection (for standalone parsing)
      servicesInstance = createCrossModelServices({ connection: undefined });
   }
   return servicesInstance;
}

/**
 * Parse a CrossModel file from text.
 * 
 * @param text File content
 * @param uri File URI
 * @returns The root AST node, or undefined if parsing failed
 */
export async function parseText(text: string, uri: vscode.Uri): Promise<AstNode | undefined> {
   const services = getServices();
   const documents = services.shared.workspace.LangiumDocuments;
   const documentBuilder = services.shared.workspace.DocumentBuilder;
   
   // Create or get the document
   const langiumUri = URI.parse(uri.toString());
   let document = documents.getDocument(langiumUri) as LangiumDocument | undefined;
   
   if (!document) {
      // Create a new document
      document = services.shared.workspace.LangiumDocumentFactory.fromString(text, langiumUri);
      documents.addDocument(document);
   } else {
      // Update existing document
      document = services.shared.workspace.LangiumDocumentFactory.fromString(text, langiumUri);
      documents.addDocument(document);
   }
   
   // Build and link the document
   await documentBuilder.build([document], { validation: false });
   
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
