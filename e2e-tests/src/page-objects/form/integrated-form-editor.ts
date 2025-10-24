/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { normalizeId } from '@theia/playwright';
import { CMCompositeEditor, hasViewError } from '../cm-composite-editor';
import { IntegratedEditor } from '../cm-integrated-editor';
import { CMForm } from './cm-form';
import { DataModelForm } from './datamodel-form';
import { LogicalEntityForm } from './entity-form';
import { RelationshipForm } from './relationship-form';
export class IntegratedFormEditor extends IntegratedEditor {
   constructor(filePath: string, parent: CMCompositeEditor, tabSelector: string) {
      super(
         {
            tabSelector,
            viewSelector: normalizeId(
               // eslint-disable-next-line max-len
               `#form-editor-opener:${
                  parent.scheme === 'file'
                     ? parent.app.workspace.pathAsUrl(filePath)
                     : parent.app.workspace.pathAsUrl(filePath).replace('file://', `${parent.scheme}:`)
               }`
            )
         },
         parent
      );
   }

   async hasError(errorMessage: string): Promise<boolean> {
      return hasViewError(this.page, this.viewSelector, errorMessage);
   }

   async formFor(logicalEntity: 'entity'): Promise<LogicalEntityForm>;
   async formFor(relationship: 'relationship'): Promise<RelationshipForm>;
   async formFor(dataModel: 'dataModel'): Promise<DataModelForm>;
   async formFor(string: 'entity' | 'relationship' | 'dataModel'): Promise<CMForm> {
      if (string === 'entity') {
         const form = new LogicalEntityForm(this, this.viewSelector, 'LogicalEntity');
         await form.waitForVisible();
         return form;
      } else if (string === 'dataModel') {
         const form = new DataModelForm(this, this.viewSelector, 'DataModel');
         await form.waitForVisible();
         return form;
      } else {
         const form = new RelationshipForm(this, this.viewSelector, 'Relationship');
         await form.waitForVisible();
         return form;
      }
   }
}
