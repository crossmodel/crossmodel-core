import type { AstNode } from 'langium';
import type { CrossModelServices, CrossModelSerializer } from '../types/langium-bridge';

function resolveSerializer(services: CrossModelServices): CrossModelSerializer {
  const serializer = services.CrossModel?.serializer;
  if (!serializer) {
    throw new Error(
      'CrossModel serializer is not wired. Update langium-bridge.d.ts with the correct field exposing serializeRoot.'
    );
  }
  return serializer;
}

export function serializeWithCrossModel(root: AstNode, services: CrossModelServices): string {
  const serializer = resolveSerializer(services);
  return serializer.serializeRoot(root);
}
