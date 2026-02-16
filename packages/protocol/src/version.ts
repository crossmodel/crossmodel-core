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
const CROSSMODEL_EDITION_PREFIX = 'crossmodel-';

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

function populatePackageMetadata(): void {
   if (cachedVersion !== undefined && cachedEdition !== undefined) {
      // Already cached, no need to read again
      return;
   }
   const pkg = getPackageJson();
   cachedVersion = pkg?.version ?? '0.0.0';
   if (pkg?.name?.startsWith(CROSSMODEL_EDITION_PREFIX)) {
      // Extract edition from package name (e.g., 'crossmodel-core' -> 'core')
      cachedEdition = pkg.name.substring(CROSSMODEL_EDITION_PREFIX.length);
   } else {
      cachedEdition = 'core'; // fallback
   }
}

function getVersionFromPackage(): string {
   populatePackageMetadata();
   return cachedVersion!;
}

function getEditionFromPackage(): string {
   populatePackageMetadata();
   return cachedEdition!;
}

export function getCrossModelVersion(): string {
   return getVersionFromPackage();
}

export function getCrossModelEdition(): string {
   return getEditionFromPackage();
}

/**
 * Returns the major version component of the CrossModel version as a number.
 * Minor and patch versions don't cause breaking grammar changes, so only the major version
 * is stored in datamodel.cm files for migration detection.
 *
 * @returns the major version number, or undefined if it cannot be parsed
 */
export function getCrossModelMajorVersion(): number | undefined {
   const version = getVersionFromPackage();
   return parseInt(version.split('.')[0], 10);
}
