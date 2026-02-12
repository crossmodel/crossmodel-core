/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/

import { getCrossModelEdition, getCrossModelMajorVersion } from '@crossmodel/protocol';
import { CrossModelEditionInfo, DataModel } from '../generated/ast.js';

/**
 * Checks if the datamodel has no CrossModel version/edition stored yet.
 *
 * @param dataModel the datamodel to check
 * @returns true if the datamodel has no crossmodel info
 */
export function isMissingCrossModelVersion(dataModel: DataModel): boolean {
   return !dataModel.crossmodel;
}

/**
 * Checks if the datamodel's major version differs from the current CrossModel major version,
 * indicating that a migration may be needed.
 *
 * @param dataModel the datamodel to check
 * @returns true if the major version differs and migration is needed
 */
export function needsCrossModelMigration(dataModel: DataModel): boolean {
   if (!dataModel.crossmodel) {
      return false;
   }
   return dataModel.crossmodel.edition !== getCrossModelEdition() || dataModel.crossmodel.version !== getCrossModelMajorVersion();
}

/**
 * Updates the CrossModel version and edition in a datamodel to the current values.
 * Stores only the major version since minor/patch don't cause breaking grammar changes.
 * Creates the crossmodel object if it doesn't exist.
 *
 * @param dataModel the datamodel to update
 */
export function updateCrossModelVersion(dataModel: DataModel): boolean {
   const crossModelEdition = getCrossModelEdition();
   const crossModelMajorVersion = getCrossModelMajorVersion();
   if (crossModelEdition === undefined || crossModelMajorVersion === undefined) {
      return false;
   }
   if (!dataModel.crossmodel) {
      // Create the crossmodel object
      (dataModel as any).crossmodel = {
         $type: 'CrossModelEditionInfo',
         edition: crossModelEdition,
         version: crossModelMajorVersion
      } as CrossModelEditionInfo;
   } else {
      dataModel.crossmodel.edition = crossModelEdition;
      dataModel.crossmodel.version = crossModelMajorVersion;
   }
   return true;
}
