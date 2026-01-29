/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { SOURCE_OBJECT_NODE_TYPE, TARGET_OBJECT_NODE_TYPE } from '@crossmodel/protocol';
import { GModelElement } from '@eclipse-glsp/client';
import { RectangularNode } from 'sprotty';
import { LibavoidEdge } from '../libavoid';

export class SourceObjectNode extends RectangularNode {
   static is(element?: GModelElement): element is SourceObjectNode {
      return !!element && element.type === SOURCE_OBJECT_NODE_TYPE;
   }
}

export class SourceNumberNode extends RectangularNode {}

export class SourceStringNode extends RectangularNode {}

export class TargetObjectNode extends RectangularNode {
   static is(element?: GModelElement): element is TargetObjectNode {
      return !!element && element.type === TARGET_OBJECT_NODE_TYPE;
   }
}

export class AttributeMappingEdge extends LibavoidEdge {}
