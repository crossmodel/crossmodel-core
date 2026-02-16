/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { AstNode } from 'langium';

export interface Serializer<T = AstNode> {
   /**
    * Serializes the given semantic model to a String representation that can be parsed into the semantic model again.
    *
    * @param model semantic model
    */
   serialize(model: T): string;
}
