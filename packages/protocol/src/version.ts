/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/

/**
 * Current CrossModel edition and version information.
 * These are automatically written to datamodel.cm files to enable detection of breaking changes
 * when models are opened in different CrossModel versions.
 *
 * The version is sourced from the package.json file, which is kept in sync with lerna.json
 * by the monorepo build system. The edition is always 'core' for CrossModel Core Edition.
 */

// The version is dynamically obtained from package.json to avoid duplication with lerna.json.
// This is loaded at runtime, ensuring the value is always up-to-date.
let cachedVersion: string | undefined;

function getVersionFromPackage(): string {
   if (cachedVersion === undefined) {
      try {
         // Use dynamic require to read package.json at runtime
         // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
         cachedVersion = require('../../package.json').version;
         if (!cachedVersion) {
            cachedVersion = '0.0.0';
         }
      } catch {
         cachedVersion = '0.0.0';
      }
   }
   return cachedVersion;
}

export const CROSSMODEL_EDITION = 'core';

export function getCrossModelVersion(): string {
   return getVersionFromPackage();
}

// For backward compatibility and convenience, also export as a constant
// This is evaluated at module load time, so if you need the truly
// up-to-date version at runtime, use getCrossModelVersion() instead.
export const CROSSMODEL_VERSION: string = (() => getVersionFromPackage())();
