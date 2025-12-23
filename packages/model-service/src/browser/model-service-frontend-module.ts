/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { RemoteConnectionProvider, ServiceConnectionProvider } from '@theia/core/lib/browser';
import { ContainerModule } from '@theia/core/shared/inversify';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import type { ModelServiceClient, ModelServiceServer } from '../common/model-service-rpc';
import {
   MODEL_SERVICE_PATH,
   ModelService,
   ModelServiceClient as ModelServiceClientSymbol,
   ModelServiceServer as ModelServiceServerSymbol
} from '../common/model-service-rpc';
import { ModelServiceImpl } from './model-service';
import { ModelServiceClientImpl } from './model-service-client';

export default new ContainerModule(bind => {
   bind(ModelServiceClientImpl).toSelf().inSingletonScope();
   bind(ModelServiceClientSymbol).toService(ModelServiceClientImpl);
   bind(ModelServiceServerSymbol)
      .toDynamicValue(ctx => {
         // Lazily establish the proxy-based connection to the Theia backend service with our client implementation
         // The proxy (and thus the backend `setClient` call) is only created once a workspace is opened. This
         // prevents the backend from attempting to connect to servers when the editor starts without a workspace.
         const connection: ServiceConnectionProvider = ctx.container.get(RemoteConnectionProvider);
         const backendClient: ModelServiceClient = ctx.container.get(ModelServiceClientSymbol);
         const workspaceService: WorkspaceService = ctx.container.get(WorkspaceService);

         let proxy: ModelServiceServer | undefined;
         const createProxy = (): ModelServiceServer => {
            if (!proxy) {
               proxy = connection.createProxy<ModelServiceServer>(MODEL_SERVICE_PATH, backendClient);
            }
            return proxy;
         };

         // If workspace already opened, create proxy immediately.
         if (workspaceService.opened) {
            return createProxy();
         }

         // Otherwise, return a lazy proxy that will create the real proxy once a workspace is opened.
         workspaceService.onWorkspaceChanged(roots => {
            if (roots && roots.length > 0) {
               createProxy();
            }
         });

         // Use a JavaScript `Proxy` to forward property access and method calls to the real
         // proxy once `createProxy()` has been invoked. The `get` handler returns a function
         // wrapper for methods (so callers can invoke them) and returns direct property values
         // for non-function members. The returned Proxy is cast to `ModelServiceServer` to
         // satisfy Theia's DI typing.
         const handler: ProxyHandler<object> = {
            get: (_t, prop: PropertyKey) => {
               if (prop === 'then') {
                  // Avoid treating our proxy like a promise
                  return undefined;
               }
               return (...args: any[]) => {
                  const real = createProxy() as unknown as Record<string, any>;
                  const key = prop as keyof typeof real;
                  const target = real[key];
                  if (typeof target === 'function') {
                     return target.apply(real, args);
                  }
                  return target;
               };
            }
         };

         return new Proxy({}, handler) as unknown as ModelServiceServer;
      })
      .inSingletonScope();
   bind(ModelServiceImpl).toSelf().inSingletonScope();
   bind(ModelService).toService(ModelServiceImpl);
});
