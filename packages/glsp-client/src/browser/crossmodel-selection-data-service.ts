/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import {
   CrossReference,
   REFERENCE_CONTAINER_TYPE,
   REFERENCE_PROPERTY,
   REFERENCE_VALUE,
   RenderProps,
   SemanticUri
} from '@crossmodel/protocol';
import { GModelElement, GModelRoot, hasArgs } from '@eclipse-glsp/client';
import { GlspSelectionDataService } from '@eclipse-glsp/theia-integration';
import { isDefined } from '@theia/core';
import { injectable } from '@theia/core/shared/inversify';

@injectable()
export class CrossModelGLSPSelectionDataService extends GlspSelectionDataService {
   async getSelectionData(root: Readonly<GModelRoot>, selectedElementIds: string[]): Promise<CrossModelSelectionData> {
      const selection = selectedElementIds.map(id => root.index.getById(id)).filter(isDefined);
      return getSelectionDataFor(selection);
   }
}

export interface GModelElementInfo {
   type: string;
   reference?: CrossReference | string;
   renderProps?: Partial<RenderProps>;
}

export interface CrossModelSelectionData {
   selectionDataMap: Map<string, GModelElementInfo>;
}

export function getSelectionDataFor(selection: GModelElement[]): CrossModelSelectionData {
   const selectionDataMap = new Map<string, GModelElementInfo>();
   selection.forEach(element => selectionDataMap.set(element.id, getElementInfo(element)));
   return { selectionDataMap };
}

export function getElementInfo(element: GModelElement): GModelElementInfo {
   return { type: element.type, reference: getCrossReference(element), renderProps: getRenderProps(element) };
}

export function getCrossReference(element: GModelElement): GModelElementInfo['reference'] | undefined {
   if (hasArgs(element)) {
      const semanticUri = SemanticUri.read(element.args);
      if (semanticUri) {
         return semanticUri;
      }

      const referenceContainerType = element.args[REFERENCE_CONTAINER_TYPE];
      const referenceProperty = element.args[REFERENCE_PROPERTY];
      const referenceValue = element.args[REFERENCE_VALUE];
      if (referenceProperty && referenceContainerType && referenceValue) {
         return {
            container: { globalId: element.id, type: referenceContainerType.toString() },
            property: referenceProperty.toString(),
            value: referenceValue.toString()
         };
      }
   }
   return undefined;
}

export function getRenderProps(element: GModelElement): Partial<RenderProps> {
   return hasArgs(element) ? RenderProps.read(element.args) : {};
}
