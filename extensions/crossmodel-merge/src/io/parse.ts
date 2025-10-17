import { EmptyFileSystem, type AstNode, type AstReflection, type LangiumDocument } from 'langium';
import { Uri } from 'vscode';
import { URI as VSURI } from 'vscode-uri';
import type { CrossModelServices } from '../types/langium-bridge';

export interface ParsedAst {
  document: LangiumDocument;
  root: AstNode;
}

let servicesPromise: Promise<CrossModelServices> | undefined;

const MODULE_PATH = '../../../../packages/server/src/language-server/cross-model-module';

function loadCreateCrossModelServices(): (...args: unknown[]) => unknown {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const moduleExports = require(MODULE_PATH) as { createCrossModelServices: (...args: unknown[]) => unknown };
  return moduleExports.createCrossModelServices;
}

async function getServices(): Promise<CrossModelServices> {
  if (!servicesPromise) {
    const factory = loadCreateCrossModelServices();
    servicesPromise = Promise.resolve(factory(EmptyFileSystem) as CrossModelServices);
  }
  return servicesPromise;
}

const cache = new Map<string, ParsedAst>();

function cacheKey(uri: Uri, ref: string): string {
  return `${ref}::${uri.toString()}`;
}

export async function parseCrossModelText(uri: Uri, text: string, ref: string): Promise<ParsedAst> {
  const key = cacheKey(uri, ref);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const services = await getServices();
  const langiumUri = VSURI.parse(uri.toString());
  const factory = services.shared.workspace.LangiumDocumentFactory;
  const document = factory.fromString(text, langiumUri as ReturnType<typeof VSURI.parse>);
  await services.shared.workspace.DocumentBuilder.build([document], { validationChecks: 'all' });
  const parsed: ParsedAst = { document, root: document.parseResult?.value as AstNode };
  cache.set(key, parsed);
  return parsed;
}

export async function getReflection(): Promise<AstReflection> {
  const services = await getServices();
  const direct = (services as unknown as { AstReflection?: AstReflection }).AstReflection;
  const crossModelServices = services as unknown as {
    CrossModel?: {
      AstReflection?: AstReflection;
      language?: { AstReflection?: AstReflection };
    };
  };
  const crossModelDirect = crossModelServices.CrossModel?.AstReflection;
  const crossModelLanguage = crossModelServices.CrossModel?.language?.AstReflection;
  const shared = (services.shared as unknown as { AstReflection?: AstReflection }).AstReflection;
  const reflection = direct ?? crossModelDirect ?? crossModelLanguage ?? shared;
  if (!reflection) {
    throw new Error('CrossModel AstReflection is not exposed. Adjust getReflection to point at the correct service.');
  }
  return reflection as AstReflection;
}

export async function getServicesOnce(): Promise<CrossModelServices> {
  return getServices();
}
