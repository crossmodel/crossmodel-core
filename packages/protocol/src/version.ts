/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/

/**
 * Current CrossModel edition and version information.
 * These are automatically written to datamodel.cm files to enable detection of breaking changes
 * when models are opened in different CrossModel versions.
 *
 * The version and edition are sourced from the package.json file,
 * which is kept in sync with lerna.json by the monorepo build system.
 */

// Cache for version and edition to avoid repeated file reads
let cachedVersion: string | undefined;
let cachedEdition: string | undefined;

function getPackageJson(): { name?: string; version?: string } | undefined {
   try {
      // Try to read using require (Node.js environment)
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, import/no-dynamic-require
      const pkg = require('../package.json');
      if (pkg?.version) {
         return pkg;
      }
      return pkg;
   } catch {
      // If require fails (browser environment), version will be set to 0.0.0
      return undefined;
   }
}

function getVersionFromPackage(): string {
   if (cachedVersion === undefined) {
      const pkg = getPackageJson();
      cachedVersion = pkg?.version ?? '0.0.0';
   }
   return cachedVersion;
}

function getEditionFromPackage(): string {
   if (cachedEdition === undefined) {
      const pkg = getPackageJson();
      if (pkg?.name?.startsWith('crossmodel-')) {
         // Extract edition from package name (e.g., 'crossmodel-core' -> 'core')
         cachedEdition = pkg.name.substring('crossmodel-'.length);
      } else {
         cachedEdition = 'core'; // fallback
      }
   }
   return cachedEdition;
}

export function getCrossModelVersion(): string {
   return getVersionFromPackage();
}

export function getCrossModelEdition(): string {
   return getEditionFromPackage();
}

// For backward compatibility and convenience, also export as constants
// These are evaluated at module load time, so if you need the truly
// up-to-date values at runtime, use getCrossModelVersion() and getCrossModelEdition() instead.
export const CROSSMODEL_VERSION: string = (() => getVersionFromPackage())();
export const CROSSMODEL_EDITION: string = (() => getEditionFromPackage())();
