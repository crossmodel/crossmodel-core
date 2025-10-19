/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { AstNode } from 'langium';
import * as vscode from 'vscode';
import { getCrossModelServices } from './parse.js';
import type { CrossModelSerializer } from '../types/langium-bridge.js';

/**
 * Serialize a CrossModel root node to text using the existing CrossModel serializer.
 * 
 * @param root The AST root node to serialize
 * @param uri The destination URI (used by the serializer)
 * @returns The serialized text
 */
export function serializeWithCrossModel(root: AstNode, uri: vscode.Uri): string {
   const services = getCrossModelServices();
   
   // Access the CrossModel serializer from services
   // The serializer is at: services.CrossModel.serializer.Serializer
   const serializer = services.CrossModel.serializer.Serializer as any;
   
   if (!serializer) {
      throw new Error('CrossModel serializer not found in services');
   }
   
   // The CrossModel serializer expects a root node and a destination URI
   // Check the serialize method signature
   if (typeof serializer.serialize === 'function') {
      // The actual method is serialize(root, destinationUri)
      return serializer.serialize(root, uri.toString());
   }
   
   throw new Error('CrossModel serializer does not have expected serialize method');
}

/**
 * Adapter class to match the bridge interface.
 */
export class CrossModelSerializerAdapter implements CrossModelSerializer {
   serializeRoot(root: AstNode, destinationUri?: string): string {
      const services = getCrossModelServices();
      const serializer = services.CrossModel.serializer.Serializer as any;
      
      if (!serializer || typeof serializer.serialize !== 'function') {
         throw new Error('CrossModel serializer not available');
      }
      
      return serializer.serialize(root, destinationUri || '');
   }
}
