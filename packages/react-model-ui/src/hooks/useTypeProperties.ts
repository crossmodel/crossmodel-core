/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { ResolvedInheritedProperties, ResolvedObjectDefinition, ResolvedPropertyDefinition } from '@crossmodel/protocol';
import * as React from 'react';
import { useModelQueryApi, useUri } from '../ModelContext';

export interface UseTypePropertiesResult {
   propertyDefinitions: ResolvedPropertyDefinition[];
   inheritedProperties?: ResolvedInheritedProperties;
   loading: boolean;
   definitionName?: string;
   resolvedDefinition?: ResolvedObjectDefinition;
}

/**
 * React hook that resolves an ObjectDefinition type reference and returns
 * all property definitions from the full extends chain.
 *
 * @param type The type reference string (e.g., "LogicalDataModel"), or undefined if no type is set
 */
export function useTypeProperties(type: string | undefined): UseTypePropertiesResult {
   const api = useModelQueryApi();
   const uri = useUri();
   const [result, setResult] = React.useState<UseTypePropertiesResult>({
      propertyDefinitions: [],
      loading: false
   });
   const lastTypeRef = React.useRef<string | undefined>(undefined);

   React.useEffect(() => {
      if (!type || !uri) {
         if (lastTypeRef.current !== type) {
            lastTypeRef.current = type;
            setResult({ propertyDefinitions: [], loading: false });
         }
         return;
      }

      if (type === lastTypeRef.current) {
         return;
      }
      lastTypeRef.current = type;

      let cancelled = false;
      setResult(prev => ({ ...prev, loading: true }));

      api.resolveObjectDefinition({ type, contextUri: uri }).then(resolved => {
         if (cancelled) {
            return;
         }
         if (resolved) {
            setResult({
               propertyDefinitions: resolved.propertyDefinitions,
               inheritedProperties: resolved.inheritedProperties,
               loading: false,
               definitionName: resolved.name,
               resolvedDefinition: resolved
            });
         } else {
            setResult({ propertyDefinitions: [], loading: false });
         }
      }).catch(() => {
         if (!cancelled) {
            setResult({ propertyDefinitions: [], loading: false });
         }
      });

      return () => {
         cancelled = true;
      };
   }, [type, uri, api]);

   return result;
}
