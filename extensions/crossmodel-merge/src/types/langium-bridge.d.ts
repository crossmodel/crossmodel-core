/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { AstNode } from 'langium';

/**
 * Bridge interface to the existing CrossModel serializer.
 * 
 * TODO: This should be connected to the actual CrossModel serializer from the services.
 * The serializer is available at: services.CrossModel.serializer.Serializer
 * 
 * Example usage:
 * ```typescript
 * const services = createCrossModelServices({ connection });
 * const serializer = services.CrossModel.serializer.Serializer;
 * const text = serializer.serialize(root, destinationUri);
 * ```
 */
export interface CrossModelSerializer {
   /**
    * Serialize a CrossModel root node to text.
    * @param root The AST root node to serialize
    * @param destinationUri The URI where the serialized content will be written
    * @returns The serialized text representation
    */
   serializeRoot(root: AstNode, destinationUri?: string): string;
}
