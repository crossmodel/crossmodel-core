/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/

import { CROSSMODEL_EDITION, getCrossModelVersion } from '@crossmodel/protocol';
import { CrossModelEditionInfo, DataModel } from '../language-server/generated/ast.js';

/**
 * Checks if a datamodel's stored CrossModel version/edition differs from the current one.
 *
 * @param dataModel the datamodel to check
 * @returns true if the datamodel needs an update
 */
export function needsCrossModelVersionUpdate(dataModel: DataModel): boolean {
   const currentVersion = getCrossModelVersion();
   if (!dataModel.crossmodel) {
      // No crossmodel info stored, needs update
      return true;
   }
   return dataModel.crossmodel.edition !== CROSSMODEL_EDITION || dataModel.crossmodel.version !== currentVersion;
}

/**
 * Updates the CrossModel version and edition in a datamodel to the current values.
 * Creates the crossmodel object if it doesn't exist.
 *
 * @param dataModel the datamodel to update
 */
export function updateCrossModelVersion(dataModel: DataModel): void {
   const currentVersion = getCrossModelVersion();
   if (!dataModel.crossmodel) {
      // Create the crossmodel object
      (dataModel as any).crossmodel = {
         $type: 'CrossModelEditionInfo',
         edition: CROSSMODEL_EDITION,
         version: currentVersion
      } as CrossModelEditionInfo;
   } else {
      dataModel.crossmodel.edition = CROSSMODEL_EDITION;
      dataModel.crossmodel.version = currentVersion;
   }
}

/**
 * Ensures a datamodel has the current CrossModel version/edition info.
 * Updates it if needed.
 *
 * @param dataModel the datamodel to update
 * @returns true if an update was performed
 */
export function ensureCrossModelVersion(dataModel: DataModel): boolean {
   if (needsCrossModelVersionUpdate(dataModel)) {
      updateCrossModelVersion(dataModel);
      return true;
   }
   return false;
}
