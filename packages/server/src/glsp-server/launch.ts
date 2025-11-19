/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { GLSP_PORT_COMMAND } from '@crossmodel/protocol';
import {
   Deferred,
   InjectionContainer,
   LogLevel,
   Logger,
   LoggerFactory,
   ServerModule,
   SocketLaunchOptions,
   SocketServerLauncher,
   defaultSocketLaunchOptions,
   getRequestParentName
} from '@eclipse-glsp/server/node.js';
import { Container, ContainerModule } from 'inversify';
import { AddressInfo } from 'net';
import { URI } from 'vscode-uri';
import { CrossModelLSPServices, IntegratedServer } from '../integration.js';
import { ClientLogger } from '../language-server/cross-model-client-logger.js';
import { CrossModelServices, CrossModelSharedServices } from '../language-server/cross-model-module.js';
import { MappingDiagramModule } from './mapping-diagram/mapping-diagram-module.js';
import { SystemDiagramModule } from './system-diagram/system-diagram-module.js';

/**
 * Launches a GLSP server with access to the given language services on the default port.
 *
 * @param services language services
 * @returns a promise that is resolved as soon as the server is shut down or rejects if an error occurs
 */
export function startGLSPServer(services: CrossModelLSPServices, workspaceFolder: URI): IntegratedServer {
   const launchOptions: SocketLaunchOptions = { ...defaultSocketLaunchOptions, host: '127.0.0.1', logLevel: LogLevel.info };

   // create module based on launch options, e.g., logging etc.
   const appModule = createAppModule(launchOptions, services.shared.logger.ClientLogger);
   // create custom module to bind language services to support injection within GLSP classes
   const lspModule = createLSPModule(services);

   // create app container will all necessary modules and retrieve launcher
   const appContainer = new Container();
   appContainer.load(appModule, lspModule);

   // create server module with our cross model diagram
   const serverModule = new ServerModule()
      .configureDiagramModule(new SystemDiagramModule())
      .configureDiagramModule(new MappingDiagramModule());

   const logger = appContainer.get<LoggerFactory>(LoggerFactory)('CrossModelServer');
   const launcher = appContainer.resolve<SocketServerLauncher>(SocketServerLauncher);
   launcher.configure(serverModule);
   try {
      const started = new Deferred<void>();
      const stop = launcher.start(launchOptions);
      launcher['netServer'].on('listening', () => {
         services.shared.lsp.Connection?.onRequest(GLSP_PORT_COMMAND, () => getPort(launcher['netServer'].address()));
         started.resolve();
      });
      return {
         started: started.promise,
         stopped: Promise.resolve(stop)
      };
   } catch (error) {
      logger.error('Error in GLSP server launcher:', error);
      return {
         started: Promise.reject(error),
         stopped: Promise.resolve()
      };
   }
}

function getPort(address: AddressInfo | string | null): number | undefined {
   return address && !(typeof address === 'string') ? address.port : undefined;
}

/**
 * Custom module to bind language services so that they can be injected in other classes created through DI.
 *
 * @param services language services
 * @returns container module
 */
export function createLSPModule(services: CrossModelLSPServices): ContainerModule {
   return new ContainerModule(bind => {
      bind(CrossModelLSPServices).toConstantValue(services);
      bind(CrossModelSharedServices).toConstantValue(services.shared);
      bind(CrossModelServices).toConstantValue(services.language);
   });
}

export function createAppModule(launchOptions: SocketLaunchOptions, logger: ClientLogger): ContainerModule {
   return new ContainerModule(bind => {
      bind(InjectionContainer).toDynamicValue(dynamicContext => dynamicContext.container);
      bind(Logger).toDynamicValue(dynamicContext => new GLSPLogger(logger, launchOptions.logLevel, getRequestParentName(dynamicContext)));
      bind(LoggerFactory).toFactory(() => (caller: string) => new GLSPLogger(logger, launchOptions.logLevel, caller));
   });
}

export class GLSPLogger extends Logger {
   constructor(
      protected baseLogger: ClientLogger,
      public logLevel: LogLevel,
      public caller?: string
   ) {
      super();
   }

   info(message: string, ...params: any): void {
      if (this.logLevel !== LogLevel.none && LogLevel.info <= this.logLevel) {
         this.baseLogger.info(this.combinedMessage(message, ...params));
      }
   }

   warn(message: string, ...params: any[]): void {
      if (this.logLevel !== LogLevel.none && LogLevel.warn <= this.logLevel) {
         this.baseLogger.warn(this.combinedMessage(message, ...params));
      }
   }

   error(message: string, ...params: any[]): void {
      if (this.logLevel !== LogLevel.none && LogLevel.error <= this.logLevel) {
         this.baseLogger.error(this.combinedMessage(message, ...params));
      }
   }

   debug(message: string, ...params: any[]): void {
      if (this.logLevel !== LogLevel.none && LogLevel.debug <= this.logLevel) {
         this.baseLogger.debug(this.combinedMessage(message, ...params));
      }
   }

   combinedMessage(message: string, ...params: any[]): string {
      const caller = this.caller ? `[${this.caller}]` : '';
      const additional = this.logAdditionals(...params);
      return `${caller} ${message} ${additional}`;
   }

   logAdditionals(...params: any[]): string {
      if (!params || params.length === 0) {
         return '';
      }
      return params.map(param => this.toString(param)).join(',\n');
   }

   override toString(param: unknown): string {
      if (param instanceof Error) {
         return `${param.message}
            ${param.stack || ''}`;
      }
      try {
         return JSON.stringify(param, undefined, 4);
      } catch (_) {
         return '';
      }
   }
}
