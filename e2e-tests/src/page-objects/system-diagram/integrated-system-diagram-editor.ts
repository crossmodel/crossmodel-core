/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { GLSPBaseCommandPalette, InteractablePosition, PModelElement, PModelElementConstructor } from '@eclipse-glsp/glsp-playwright';
import { normalizeId } from '@theia/playwright';
import { CMCompositeEditor, hasViewError } from '../cm-composite-editor';
import { IntegratedEditor } from '../cm-integrated-editor';
import { EntityPropertiesView } from '../cm-properties-view';
import { CMTheiaIntegration } from '../cm-theia-integration';
import { LogicalEntity } from './diagram-elements';
import { SystemDiagram, WaitForModelUpdateOptions } from './system-diagram';
import { SystemTools } from './system-tool-box';

export class IntegratedSystemDiagramEditor extends IntegratedEditor {
   readonly diagram: SystemDiagram;
   constructor(filePath: string, parent: CMCompositeEditor, tabSelector: string) {
      super(
         {
            tabSelector,
            viewSelector: normalizeId(`#system-diagram:${parent.app.workspace.pathAsUrl(filePath)}`)
         },
         parent
      );
      this.diagram = this.createSystemDiagram(parent.app.integration);
   }

   get globalCommandPalette(): GLSPBaseCommandPalette {
      return this.diagram.globalCommandPalette;
   }

   override waitForVisible(): Promise<void> {
      return this.diagram.graph.waitForVisible();
   }

   protected createSystemDiagram(integration: CMTheiaIntegration): SystemDiagram {
      return new SystemDiagram({ type: 'integration', integration });
   }

   async hasError(errorMessage: string): Promise<boolean> {
      return hasViewError(this.page, this.viewSelector, errorMessage);
   }

   async enableTool(tool: SystemTools['default']): Promise<void> {
      const paletteItem = await this.diagram.toolPalette.content.toolElement('default', tool);
      return paletteItem.click();
   }

   async getLogicalEntity(logicalEntityLabel: string): Promise<LogicalEntity> {
      return this.diagram.graph.getNodeByLabel(logicalEntityLabel, LogicalEntity);
   }

   async getLogicalEntities(logicalEntityLabel: string): Promise<LogicalEntity[]> {
      return this.diagram.graph.getNodesByLabel(logicalEntityLabel, LogicalEntity);
   }

   async findLogicalEntity(logicalEntityLabel: string): Promise<LogicalEntity | undefined> {
      const logicalEntities = await this.diagram.graph.getNodesByLabel(logicalEntityLabel, LogicalEntity);
      return logicalEntities.length > 0 ? logicalEntities[0] : undefined;
   }

   async selectLogicalEntityAndOpenProperties(logicalEntityLabel: string): Promise<EntityPropertiesView> {
      const logicalEntity = await this.diagram.graph.getNodeByLabel(logicalEntityLabel, LogicalEntity);
      await logicalEntity.select();
      const view = new EntityPropertiesView(this.app);
      await view.open();
      return view;
   }

   /**
    * Invoke the 'Show Entity` tool at the given position.
    * i.e. select the tool and click at the given position.
    */
   async invokeShowLogicalEntityToolAtPosition(position: InteractablePosition): Promise<GLSPBaseCommandPalette> {
      await this.enableTool('Show Entity');
      // Wait for the insert-indicator to appear
      await this.page.waitForSelector('.insert-indicator', { state: 'attached' });
      await position.move();
      // Wait for the insert-indicator to be moved to the correct position
      await this.page.waitForFunction(
         ({ expectedPosition, tolerance }) => {
            const insertIndicator = document.querySelector('.insert-indicator');
            const boundingBox = insertIndicator?.getBoundingClientRect();
            if (!boundingBox) {
               return false;
            }
            const { x, y } = boundingBox;
            return Math.abs(x - expectedPosition.x) <= tolerance && Math.abs(y - expectedPosition.y) <= tolerance;
         },
         { expectedPosition: position.data, tolerance: 20 }
      );
      await position.click();
      return this.diagram.entityCommandPalette;
   }

   waitForModelUpdate(executor: () => Promise<void>, options?: WaitForModelUpdateOptions): Promise<void> {
      return this.diagram.graph.waitForModelUpdate(executor, options);
   }

   waitForCreationOfType<TElement extends PModelElement>(
      constructor: PModelElementConstructor<TElement>,
      creator: () => Promise<void>
   ): Promise<TElement[]> {
      return this.diagram.graph.waitForCreationOfType(constructor, creator);
   }

   override isDirty(): Promise<boolean> {
      return this.parent.isDirty();
   }

   override isClosable(): Promise<boolean> {
      return this.parent.isClosable();
   }

   override closeWithoutSave(): Promise<void> {
      return this.parent.closeWithoutSave();
   }
}
