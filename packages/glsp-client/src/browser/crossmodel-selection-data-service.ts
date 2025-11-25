/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { CrossReference, REFERENCE_CONTAINER_TYPE, REFERENCE_PROPERTY, REFERENCE_VALUE, RenderProps } from '@crossmodel/protocol';
import { GModelElement, GModelRoot, hasArgs } from '@eclipse-glsp/client';
import { GlspSelectionDataService } from '@eclipse-glsp/theia-integration';
import { isDefined } from '@theia/core';
import { inject, injectable } from '@theia/core/shared/inversify';
import { PropertiesActivationStore } from './properties-activation-store';

@injectable()
export class CrossModelGLSPSelectionDataService extends GlspSelectionDataService {
   constructor(@inject(PropertiesActivationStore) protected readonly propertiesActivationStore: PropertiesActivationStore) {
      super();
   }

   async getSelectionData(root: Readonly<GModelRoot>, selectedElementIds: string[]): Promise<CrossModelSelectionData> {
      const selection = selectedElementIds.map(id => root.index.getById(id)).filter(isDefined);
      const showProperties = this.propertiesActivationStore.consume(selectedElementIds);
      return getSelectionDataFor(selection, showProperties);
   }
}

export interface GModelElementInfo {
   type: string;
   reference?: CrossReference;
   renderProps?: Partial<RenderProps>;
}

export interface CrossModelSelectionData {
   selectionDataMap: Map<string, GModelElementInfo>;
   showProperties?: boolean;
}

export function getSelectionDataFor(selection: GModelElement[], showProperties = false): CrossModelSelectionData {
   const selectionDataMap = new Map<string, GModelElementInfo>();
   selection.forEach(element => selectionDataMap.set(element.id, getElementInfo(element)));
   return { selectionDataMap, showProperties };
}

export function getElementInfo(element: GModelElement): GModelElementInfo {
   return { type: element.type, reference: getCrossReference(element), renderProps: getRenderProps(element) };
}

export function getCrossReference(element: GModelElement): CrossReference | undefined {
   if (hasArgs(element)) {
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
