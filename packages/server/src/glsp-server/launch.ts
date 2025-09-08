/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { GLSP_PORT_COMMAND } from '@crossmodel/protocol';
import {
   LogLevel,
   LoggerFactory,
   MaybePromise,
   ServerModule,
   SocketLaunchOptions,
   SocketServerLauncher,
   createAppModule,
   defaultSocketLaunchOptions
} from '@eclipse-glsp/server/node.js';
import { Container, ContainerModule } from 'inversify';
import { AddressInfo } from 'net';
import { URI } from 'vscode-uri';
import { CrossModelLSPServices } from '../integration.js';
import { CrossModelServices, CrossModelSharedServices } from '../language-server/cross-model-module.js';
import { MappingDiagramModule } from './mapping-diagram/mapping-diagram-module.js';
import { SystemDiagramModule } from './system-diagram/system-diagram-module.js';

/**
 * Launches a GLSP server with access to the given language services on the default port.
 *
 * @param services language services
 * @returns a promise that is resolved as soon as the server is shut down or rejects if an error occurs
 */
export function startGLSPServer(services: CrossModelLSPServices, workspaceFolder: URI): MaybePromise<void> {
   const launchOptions: SocketLaunchOptions = { ...defaultSocketLaunchOptions, host: '127.0.0.1', logLevel: LogLevel.info };

   // create module based on launch options, e.g., logging etc.
   const appModule = createAppModule(launchOptions);
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
      const stop = launcher.start(launchOptions);
      launcher['netServer'].on(
         'listening',
         () => services.shared.lsp.Connection?.onRequest(GLSP_PORT_COMMAND, () => getPort(launcher['netServer'].address()))
      );
      return stop;
   } catch (error) {
      logger.error('Error in GLSP server launcher:', error);
   }

   // Attach a generic unhandled rejection handler to prevent the process from crashing in case of an error
   process.on('unhandledRejection', error => console.log('Unhandled rejection', error));
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
