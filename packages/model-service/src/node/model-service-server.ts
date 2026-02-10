/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import {
   CloseModel,
   CloseModelArgs,
   CrossModelDocument,
   CrossModelRoot,
   CrossReference,
   CrossReferenceContext,
   DataModelInfo,
   DataModelInfoArgs,
   DataModelUpdatedEvent,
   FindIdArgs,
   FindNextId,
   FindReferenceableElements,
   MODELSERVER_PORT_COMMAND,
   OnDataModelsUpdated,
   OnModelSaved,
   OnModelUpdated,
   OpenModel,
   OpenModelArgs,
   ReferenceableElement,
   RequestDataModelInfo,
   RequestDataModelInfos,
   RequestModel,
   ResolveReference,
   ResolvedElement,
   SaveModel,
   SaveModelArgs,
   UpdateModel,
   UpdateModelArgs
} from '@crossmodel/protocol';
import { CommandService, MessageService } from '@theia/core';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { inject, injectable } from '@theia/core/shared/inversify';
import * as net from 'net';
import * as rpc from 'vscode-jsonrpc/node';
import { ModelServiceClient, ModelServiceServer } from '../common/model-service-rpc';

/**
 * Backend service implementation that mainly forwards all requests from the Theia frontend to the model server exposed on a given socket.
 */
@injectable()
export class ModelServiceServerImpl implements ModelServiceServer {
   protected initialized?: Deferred<void>;
   protected connection: rpc.MessageConnection;
   protected client?: ModelServiceClient;

   @inject(MessageService) protected messageService: MessageService;
   @inject(CommandService) protected commandService: CommandService;

   setClient(client: ModelServiceClient): void {
      if (this.client) {
         this.dispose();
      }
      this.client = client;
      this.initializeServerConnection();
   }

   getClient(): ModelServiceClient | undefined {
      return this.client;
   }

   protected async initializeServerConnection(): Promise<void> {
      if (this.initialized) {
         return this.initialized.promise;
      }
      this.initialized = new Deferred<void>();
      const progress = await this.messageService.showProgress({
         text: 'Connecting to Model Server',
         options: { cancelable: false }
      });
      try {
         progress.report({ message: 'Waiting for port information...' });
         const port = await this.findPort();
         progress.report({ message: 'Waiting for connection on port ' + port + '...' });
         await this.connectToServer(port);
         progress.cancel();
         this.messageService.info('Connected to Model Server on port ' + port, { timeout: 3000 });
         this.initialized.resolve();
         this.client?.ready();
      } catch (error) {
         progress.cancel();
         this.messageService.error('Could not connect to Model Server: ' + error);
         this.initialized.reject(error);
      }
   }

   protected async connectToServer(port: number): Promise<any> {
      // Create the deferred object which exposes the Promise of the connection with the ModelServer.
      const connected = new Deferred<void>();

      // Create the socket, reader, writer and rpc-connection.
      const socket = new net.Socket();
      const reader = new rpc.SocketMessageReader(socket);
      const writer = new rpc.SocketMessageWriter(socket);
      this.connection = rpc.createMessageConnection(reader, writer);

      // Configure connection promise results for the rpc connection.
      this.connection.onClose(() => connected.reject('Connection with the ModelServer was closed.'));
      this.connection.onError(error => connected.reject('Error occurred with the connection to the ModelServer: ' + JSON.stringify(error)));

      // Configure connection promise results for the socket.
      socket.on('ready', () => connected.resolve());
      socket.on('close', () => connected.reject('Socket from ModelService to ModelServer was closed.'));
      socket.on('error', error => console.error('Error occurred with the ModelServer socket: %s; %s', error.name, error.message));

      // Connect to the ModelServer on the given port.
      socket.connect({ port });
      this.connection.listen();

      this.setUpListeners();
      setTimeout(() => connected.reject('Timeout reached.'), 10000);
      return connected.promise;
   }

   /**
    * Unique token for the current findPort loop. Each call to findPort() creates a fresh token.
    * When dispose() is called, the token is set to undefined, causing any in-flight retry loop
    * to detect the mismatch and stop. This also handles the case where findPort() is called
    * multiple times: only the most recent loop's token matches, so older loops stop automatically.
    */
   protected _findPortToken?: object;

   /** Handle for the current setTimeout so dispose() can cancel a pending retry. */
   protected _findPortTimer?: ReturnType<typeof setTimeout>;

   /**
    * Polls for the server port by repeatedly querying the command service.
    *
    * The language server registers the port command handler only after workspace initialization
    * completes (all models indexed). Until then, executeCommand either throws (command not yet
    * registered) or returns undefined (server not ready). This method retries until a valid
    * port is returned.
    *
    * @param timeout - Delay in ms between retry attempts (default: 500ms)
    * @param attempts - Max number of retries on error. -1 means unlimited (default: -1)
    */
   protected async findPort(timeout = 500, attempts = -1): Promise<number> {
      const pendingContent = new Deferred<number>();
      // Create a unique ownership token for this findPort invocation.
      // If dispose() or a subsequent findPort() call changes _findPortToken,
      // this loop detects the mismatch and stops.
      const token = {};
      this._findPortToken = token;
      let counter = 0;
      const tryQueryingPort = (): void => {
         this._findPortTimer = setTimeout(async () => {
            // Check if this loop has been cancelled (dispose called or new findPort started)
            if (this._findPortToken !== token) {
               return;
            }
            try {
               const portPromise = this.commandService.executeCommand<number>(MODELSERVER_PORT_COMMAND);
               // Race against a 5s per-attempt timeout. If the language server is busy
               // (e.g. indexing a large workspace), executeCommand may hang indefinitely.
               // The timeout ensures we keep retrying instead of being blocked forever.
               const port = await Promise.race([
                  portPromise,
                  new Promise<number | undefined>(resolve => setTimeout(() => resolve(undefined), 5000))
               ]);
               // Re-check cancellation after the async gap
               if (this._findPortToken !== token) {
                  return;
               }
               if (port) {
                  pendingContent.resolve(port);
               } else {
                  // Port not available yet (server still starting) — retry
                  tryQueryingPort();
               }
            } catch (error) {
               // Re-check cancellation after the async gap
               if (this._findPortToken !== token) {
                  return;
               }
               counter++;
               if (attempts >= 0 && counter > attempts) {
                  pendingContent.reject(error);
               } else {
                  tryQueryingPort();
               }
            }
         }, timeout);
      };
      tryQueryingPort();
      return pendingContent.promise;
   }

   async open(args: OpenModelArgs): Promise<CrossModelDocument | undefined> {
      await this.initializeServerConnection();
      return this.connection.sendRequest(OpenModel, args);
   }

   async close(args: CloseModelArgs): Promise<void> {
      await this.initializeServerConnection();
      await this.connection.sendRequest(CloseModel, args);
   }

   async request(uri: string): Promise<CrossModelDocument | undefined> {
      await this.initializeServerConnection();
      return this.connection.sendRequest(RequestModel, uri);
   }

   async update(args: UpdateModelArgs<CrossModelRoot>): Promise<CrossModelDocument> {
      await this.initializeServerConnection();
      return this.connection.sendRequest(UpdateModel, args);
   }

   async save(args: SaveModelArgs<CrossModelRoot>): Promise<void> {
      await this.initializeServerConnection();
      return this.connection.sendRequest(SaveModel, args);
   }

   dispose(): void {
      // Cancel any running findPort retry loop by invalidating its ownership token
      // and clearing the pending timer.
      this._findPortToken = undefined;
      if (this._findPortTimer) {
         clearTimeout(this._findPortTimer);
         this._findPortTimer = undefined;
      }
      if (this.initialized) {
         this.initialized.resolve();
         this.initialized = undefined;
      }
   }

   async findReferenceableElements(args: CrossReferenceContext): Promise<ReferenceableElement[]> {
      await this.initializeServerConnection();
      return this.connection.sendRequest(FindReferenceableElements, args);
   }

   async resolveReference(reference: CrossReference): Promise<ResolvedElement | undefined> {
      await this.initializeServerConnection();
      return this.connection.sendRequest(ResolveReference, reference);
   }

   async findNextId(args: FindIdArgs): Promise<string> {
      await this.initializeServerConnection();
      return this.connection.sendRequest(FindNextId, args);
   }

   async getDataModelInfos(): Promise<DataModelInfo[]> {
      await this.initializeServerConnection();
      return this.connection.sendRequest(RequestDataModelInfos, undefined);
   }

   async getDataModelInfo(args: DataModelInfoArgs): Promise<DataModelInfo | undefined> {
      await this.initializeServerConnection();
      return this.connection.sendRequest(RequestDataModelInfo, args);
   }

   protected setUpListeners(): void {
      this.connection.onNotification(OnModelSaved, event => {
         this.client?.updateModel({ ...event, reason: 'saved' });
      });
      this.connection.onNotification(OnModelUpdated, event => {
         this.client?.updateModel(event);
      });
      this.connection.onNotification(OnDataModelsUpdated, (event: DataModelUpdatedEvent) => {
         this.client?.updateDataModel(event);
      });
   }
}
