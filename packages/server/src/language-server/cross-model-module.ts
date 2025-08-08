/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { AstNode, DefaultServiceRegistry, IndentationAwareLexer, Module, ServiceRegistry, inject } from 'langium';
import {
   DefaultSharedModuleContext,
   LangiumServices,
   LangiumSharedServices,
   PartialLangiumServices,
   PartialLangiumSharedServices,
   createDefaultModule,
   createDefaultSharedModule
} from 'langium/lsp';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { AddedSharedModelServices } from '../model-server/model-module.js';
import { ModelService } from '../model-server/model-service.js';
import { OpenTextDocumentManager } from '../model-server/open-text-document-manager.js';
import { OpenableTextDocuments } from '../model-server/openable-text-documents.js';
import { Serializer } from '../model-server/serializer.js';
import { ClientLogger } from './cross-model-client-logger.js';
import { CrossModelCodeActionProvider } from './cross-model-code-action-provider.js';
import { CrossModelCompletionProvider } from './cross-model-completion-provider.js';
import { CrossModelDataModelManager } from './cross-model-datamodel-manager.js';
import { CrossModelDocumentBuilder } from './cross-model-document-builder.js';
import { CrossModelModelFormatter } from './cross-model-formatter.js';
import { CrossModelIndexManager } from './cross-model-index-manager.js';
import { CrossModelLangiumDocuments } from './cross-model-langium-documents.js';
import { CrossModelLanguageServer } from './cross-model-language-server.js';
import { DefaultIdProvider } from './cross-model-naming.js';
import { CrossModelScopeProvider } from './cross-model-scope-provider.js';
import { CrossModelScopeComputation } from './cross-model-scope.js';
import { CrossModelSerializer } from './cross-model-serializer.js';
import { CrossModelValidator, registerValidationChecks } from './cross-model-validator.js';
import { CrossModelWorkspaceManager } from './cross-model-workspace-manager.js';
import { CrossModelGeneratedModule, CrossModelGeneratedSharedModule } from './generated/module.js';
import { CrossModelTokenBuilder } from './parser/cross-model-indentation-aware.js';
import { CrossModelLinker } from './references/cross-model-linker.js';

/***************************
 * Shared Module
 ***************************/
export type ExtendedLangiumServices = LangiumServices & {
   serializer: {
      Serializer: Serializer<AstNode>;
   };
};

export class DefaultExtendedServiceRegistry extends DefaultServiceRegistry {
   protected _crossModelService!: CrossModelServices;

   get CrossModel(): CrossModelServices {
      return this._crossModelService;
   }

   set CrossModel(service: CrossModelServices) {
      this._crossModelService = service;
   }

   override register(language: ExtendedLangiumServices): void {
      super.register(language);
   }

   override getServices(uri: URI): ExtendedLangiumServices {
      return super.getServices(uri) as ExtendedLangiumServices;
   }
}

export interface ExtendedServiceRegistry extends ServiceRegistry {
   CrossModel: CrossModelServices;
   register(language: ExtendedLangiumServices): void;
   getServices(uri: URI): ExtendedLangiumServices;
}

/**
 * Declaration of custom services - add your own service classes here.
 */
export interface CrossModelAddedSharedServices {
   /* override */
   ServiceRegistry: ExtendedServiceRegistry;

   workspace: {
      /* override */ WorkspaceManager: CrossModelWorkspaceManager;
      DataModelManager: CrossModelDataModelManager;
      LangiumDocuments: CrossModelLangiumDocuments;
      IndexManager: CrossModelIndexManager;
   };
   logger: {
      ClientLogger: ClientLogger;
   };
   lsp: {
      /* override */ LanguageServer: CrossModelLanguageServer;
   };
}

export const CrossModelSharedServices = Symbol('CrossModelSharedServices');
export type CrossModelSharedServices = Omit<LangiumSharedServices, 'ServiceRegistry'> &
   CrossModelAddedSharedServices &
   AddedSharedModelServices;

export const CrossModelSharedModule: Module<
   CrossModelSharedServices,
   PartialLangiumSharedServices & CrossModelAddedSharedServices & AddedSharedModelServices
> = {
   ServiceRegistry: () => new DefaultExtendedServiceRegistry(),
   workspace: {
      WorkspaceManager: services => new CrossModelWorkspaceManager(services),
      DataModelManager: services => new CrossModelDataModelManager(services),
      LangiumDocuments: services => new CrossModelLangiumDocuments(services),
      TextDocuments: services => new OpenableTextDocuments(TextDocument, services),
      TextDocumentManager: services => new OpenTextDocumentManager(services),
      DocumentBuilder: services => new CrossModelDocumentBuilder(services),
      IndexManager: services => new CrossModelIndexManager(services)
   },
   logger: {
      ClientLogger: services => new ClientLogger(services)
   },
   lsp: {
      LanguageServer: services => new CrossModelLanguageServer(services)
   },
   model: {
      ModelService: services => new ModelService(services)
   }
};

/***************************
 * Language Module
 ***************************/

export interface CrossModelModuleContext {
   shared: CrossModelSharedServices;
}

/**
 * Declaration of custom services - add your own service classes here.
 */
export interface CrossModelAddedServices {
   references: {
      IdProvider: DefaultIdProvider;
      Linker: CrossModelLinker;
      ScopeProvider: CrossModelScopeProvider;
   };
   validation: {
      CrossModelValidator: CrossModelValidator;
   };
   serializer: {
      Serializer: CrossModelSerializer;
   };
   parser: {
      TokenBuilder: CrossModelTokenBuilder;
   };
   lsp: {
      /* implement */ CodeActionProvider: CrossModelCodeActionProvider;
   };
   /* override */ shared: CrossModelSharedServices;
}

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type CrossModelServices = ExtendedLangiumServices & CrossModelAddedServices;
export const CrossModelServices = Symbol('CrossModelServices');

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export function createCrossModelModule(
   context: CrossModelModuleContext
): Module<CrossModelServices, PartialLangiumServices & CrossModelAddedServices> {
   return {
      references: {
         ScopeComputation: services => new CrossModelScopeComputation(services),
         ScopeProvider: services => new CrossModelScopeProvider(services),
         IdProvider: services => new DefaultIdProvider(services),
         NameProvider: services => services.references.IdProvider,
         Linker: services => new CrossModelLinker(services)
      },
      validation: {
         CrossModelValidator: services => new CrossModelValidator(services)
      },
      lsp: {
         CodeActionProvider: () => new CrossModelCodeActionProvider(),
         CompletionProvider: services => new CrossModelCompletionProvider(services),
         Formatter: () => new CrossModelModelFormatter()
      },
      serializer: {
         Serializer: services => new CrossModelSerializer(services.Grammar)
      },
      parser: {
         TokenBuilder: () => new CrossModelTokenBuilder(),
         Lexer: services => new IndentationAwareLexer(services)
      },
      shared: () => context.shared
   };
}

/**
 * Create the full set of services required by Langium.
 *
 * First inject the shared services by merging two modules:
 *  - Langium default shared services
 *  - Services generated by langium-cli
 *
 * Then inject the language-specific services by merging three modules:
 *  - Langium default language-specific services
 *  - Services generated by langium-cli
 *  - Services specified in this file
 *
 * @param context Optional module context with the LSP connection
 * @returns An object wrapping the shared services and the language-specific services
 */
export function createCrossModelServices(context: DefaultSharedModuleContext): {
   shared: CrossModelSharedServices;
   CrossModel: CrossModelServices;
} {
   const shared = inject(createDefaultSharedModule(context), CrossModelGeneratedSharedModule, CrossModelSharedModule);
   const CrossModel = inject(createDefaultModule({ shared }), CrossModelGeneratedModule, createCrossModelModule({ shared }));
   shared.ServiceRegistry.CrossModel = CrossModel;
   shared.ServiceRegistry.register(CrossModel);
   registerValidationChecks(CrossModel);
   return { shared, CrossModel };
}
