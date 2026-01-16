/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { ModelFileExtensions } from '@crossmodel/protocol';
import { GLSPDiagramLanguage } from '@eclipse-glsp/theia-integration/lib/common';

// use same contributionId for all languages to ensure we communicate with the same GLSP server
export const CrossModelLanguageContributionId = 'crossmodel-contribution';

export const SystemDiagramLanguage: GLSPDiagramLanguage = {
   contributionId: CrossModelLanguageContributionId,
   label: 'Diagram',
   diagramType: 'diagram',
   fileExtensions: [ModelFileExtensions.Diagram, ModelFileExtensions.SystemDiagram]
};

export const MappingDiagramLanguage: GLSPDiagramLanguage = {
   contributionId: CrossModelLanguageContributionId,
   label: 'Mapping Diagram',
   diagramType: 'mapping-diagram',
   fileExtensions: [ModelFileExtensions.Mapping]
};
