import type { AstNode, LangiumDocument, LangiumServices } from 'langium';

// Minimal subset of the CrossModel services exposed by the generated Langium module.
// TODO: Replace these placeholders with the real service interfaces from your project.
export interface CrossModelLanguageServices extends LangiumServices {
  CrossModel: {
    serializer: CrossModelSerializer;
  };
}

export interface CrossModelServices extends CrossModelLanguageServices {
  shared: LangiumServices['shared'];
}

export interface CrossModelSerializer {
  serializeRoot(root: AstNode): string;
}

export interface CrossModelDocuments {
  getOrCreateDocument(uri: string): Promise<LangiumDocument>;
}

// TODO: Replace this module declaration with the actual exports from the CrossModel Langium package.
declare module '../../packages/server/src/language-server/crossmodel-module' {
  export function createCrossModelServices(...args: unknown[]): unknown;
}
