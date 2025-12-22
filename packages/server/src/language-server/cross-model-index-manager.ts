/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { AstNode, AstNodeDescription, DefaultIndexManager, URI } from 'langium';
import { CrossModelSharedServices } from './cross-model-module.js';
import { SemanticRoot, findSemanticRoot } from './util/ast-util.js';

export class CrossModelIndexManager extends DefaultIndexManager {
   constructor(protected services: CrossModelSharedServices) {
      super(services);
   }

   getElementById(globalId: string, type?: string): AstNodeDescription | undefined {
      return this.allElements().find(desc => desc.name === globalId && (!type || desc.type === type));
   }

   allElementsInDataModel(type: string, dataModelId: string) {
      const dataModelManager = this.services.workspace.DataModelManager;
      return this.allElements(type).filter(desc => {
         const candidateDataModelId = dataModelManager.getDataModelIdByUri(desc.documentUri);
         return candidateDataModelId === dataModelId;
      });
   }

   resolveElement(description?: AstNodeDescription): AstNode | undefined {
      if (!description) {
         return undefined;
      }
      const document = this.services.workspace.LangiumDocuments.getDocument(description.documentUri);
      return document
         ? this.serviceRegistry.getServices(document.uri).workspace.AstNodeLocator.getAstNode(document.parseResult.value, description.path)
         : undefined;
   }

   resolveElementById(globalId: string, type?: string): AstNode | undefined {
      return this.resolveElement(this.getElementById(globalId, type));
   }

   resolveSemanticElement(uri: URI): SemanticRoot | undefined {
      const document = this.services.workspace.LangiumDocuments.getDocument(uri);
      return document ? findSemanticRoot(document) : undefined;
   }
}
