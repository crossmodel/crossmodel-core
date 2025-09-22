/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { injectable } from '@theia/core/shared/inversify';
import { CrossModelDiagramWidget } from '../crossmodel-diagram-widget';

/**
 * Customization of the default GLSP diagram widget that adds support for dropping files from the file navigator on the diagram.
 */
@injectable()
export class SystemDiagramWidget extends CrossModelDiagramWidget {}
