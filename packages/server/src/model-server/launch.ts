/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { MODELSERVER_PORT_COMMAND } from '@crossmodel/protocol';
import console from 'console';
import { Deferred } from 'langium';
import * as net from 'net';
import * as rpc from 'vscode-jsonrpc/node.js';
import { URI } from 'vscode-uri';
import { CrossModelLSPServices, IntegratedServer } from '../integration.js';
import { ModelServer } from './model-server.js';

const currentConnections: rpc.MessageConnection[] = [];

/**
 * Creates a socket-based RPC model server that acts as a facade to the Langium-based semantic model index (documents).
 *
 * @param services language services
 * @returns a promise that is resolved as soon as the server is shut down or rejects if an error occurs
 */
export function startModelServer(services: CrossModelLSPServices, workspaceFolder: URI): IntegratedServer {
   const started = new Deferred();
   const stopped = new Deferred();

   const logger = services.shared.logger.ClientLogger;
   const netServer = net.createServer(socket => createClientConnection(socket, services));
   netServer.listen(0);
   netServer.on('listening', () => {
      const addressInfo = netServer.address();
      if (!addressInfo) {
         logger.error('[ModelServer] Could not resolve address info. Shutting down.');
         close(netServer);
         return;
      } else if (typeof addressInfo === 'string') {
         logger.error(`[ModelServer] Unexpectedly listening to pipe or domain socket "${addressInfo}". Shutting down.`);
         close(netServer);
         return;
      }
      logger.info(`[ModelServer] Ready to accept new client requests on port: ${addressInfo.port}`);
      services.shared.lsp.Connection?.onRequest(MODELSERVER_PORT_COMMAND, () => addressInfo.port);
      started.resolve();
   });
   netServer.on('error', err => {
      console.log('[ModelServer] Error: ', err);
      logger.error('[ModelServer] Error: ' + err.message);
      close(netServer);
   });
   netServer.on('close', () => {
      started.reject();
      stopped.resolve();
   });
   netServer.on('error', error => {
      started.reject(error);
   });

   return {
      started: started.promise,
      stopped: stopped.promise
   };
}

/**
 * Create a new connection for an incoming client on the given socket. Each client gets their own connection and model server instance.
 *
 * @param socket socket connection
 * @param services language services
 * @returns a promise that is resolved as soon as the connection is closed or rejects if an error occurs
 */
async function createClientConnection(socket: net.Socket, services: CrossModelLSPServices): Promise<void> {
   services.shared.logger.ClientLogger.info(`[ModelServer] Starting model server connection for client: '${socket.localAddress}'`);
   const connection = createConnection(socket);
   currentConnections.push(connection);

   const modelServer = new ModelServer(connection, services.shared.model.ModelService);
   connection.onDispose(() => modelServer.dispose());
   socket.on('close', () => modelServer.dispose());

   connection.listen();
   services.shared.logger.ClientLogger.info(`[ModelServer] Connecting to client: '${socket.localAddress}'`);

   return new Promise((resolve, rejects) => {
      connection.onClose(() => resolve(undefined));
      connection.onError(error => rejects(error));
   });
}

/**
 * Creates an RPC-message connection for the given socket.
 *
 * @param socket socket
 * @returns message connection
 */
function createConnection(socket: net.Socket): rpc.MessageConnection {
   return rpc.createMessageConnection(new rpc.SocketMessageReader(socket), new rpc.SocketMessageWriter(socket), console);
}

/**
 * Closes the server.
 *
 * @param netServer server to be closed
 */
function close(netServer: net.Server): void {
   currentConnections.forEach(connection => connection.dispose());
   netServer.close();
}
