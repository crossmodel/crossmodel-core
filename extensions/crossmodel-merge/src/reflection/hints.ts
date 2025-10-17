export type NodeHint = {
  keyProp?: string;
  unorderedChildren?: string[];
  hiddenProps?: string[];
  label?: (node: unknown) => string;
};

export type Hints = Record<string, NodeHint>;

export const HINTS: Hints = {
  LogicalEntity: { unorderedChildren: ['attributes'] },
  SystemDiagram: { unorderedChildren: ['nodes', 'edges'] },
};
