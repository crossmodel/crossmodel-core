/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import { test } from '@playwright/test';
import { CMApp } from '../../../page-objects/cm-app';

test.describe('Filter attributes in entity property view', () => {
   let app: CMApp;
   const FILTER_DIAGRAM_PATH = 'system-diagram/diagrams/FilterAttributesDiagram.system-diagram.cm';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });
   test.afterAll(async () => {
      await app.page.close();
   });

   test('Filter attributes by data type', async () => {
      // Open the diagram with pre-created entity containing attributes for filtering
      const FILTER_ENTITY_ID = 'FilterByDataTypeEntity';

      const diagramEditorForFilter = await app.openCompositeEditor(FILTER_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForFilter = await diagramEditorForFilter.selectLogicalEntityAndOpenProperties(FILTER_ENTITY_ID);
      const formForFilter = await propertyViewForFilter.form();

      // Ensure attributes section is expanded
      const header = formForFilter.attributesSection.locator.locator('.p-accordion-header');
      const isExpanded = (await header.getAttribute('class'))?.includes('p-highlight');
      if (!isExpanded) {
         await header.click();
      }

      const rows = formForFilter.attributesSection.locator.locator('table tbody tr');
      await expect(rows).toHaveCount(2);

      await formForFilter.attributesSection.setGlobalFilter('Boolean');

      await expect(rows).toHaveCount(1);
      const visibleAttr = await formForFilter.attributesSection.findAttribute('BooleanAttribute');
      expect(visibleAttr).toBeDefined();

      // Clear filters
      await formForFilter.attributesSection.clickClearFilters();
      await expect(rows).toHaveCount(2);

      await diagramEditorForFilter.closeWithoutSave();
   });

   test('Filter attributes using text field', async () => {
      // Open the diagram with pre-created entity containing attributes for filtering
      const FILTER_ENTITY_ID = 'FilterByTextEntity';

      const diagramEditorForFilter = await app.openCompositeEditor(FILTER_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForFilter = await diagramEditorForFilter.selectLogicalEntityAndOpenProperties(FILTER_ENTITY_ID);
      const formForFilter = await propertyViewForFilter.form();

      // Ensure attributes section is expanded
      const header = formForFilter.attributesSection.locator.locator('.p-accordion-header');
      const isExpanded = (await header.getAttribute('class'))?.includes('p-highlight');
      if (!isExpanded) {
         await header.click();
      }

      const rows = formForFilter.attributesSection.locator.locator('table tbody tr');

      // Verify all attributes are visible initially
      await expect(rows).toHaveCount(3);

      await formForFilter.attributesSection.setGlobalFilter('Customer');

      // Verify only Customer attributes are visible
      await expect(rows).toHaveCount(2);
      expect(await formForFilter.attributesSection.findAttribute('CustomerName')).toBeDefined();
      expect(await formForFilter.attributesSection.findAttribute('CustomerEmail')).toBeDefined();
      expect(await formForFilter.attributesSection.findAttribute('OrderId')).toBeUndefined();

      // Clear filters and verify all attributes are visible again
      await formForFilter.attributesSection.clickClearFilters();
      await expect(rows).toHaveCount(3);

      await diagramEditorForFilter.closeWithoutSave();
   });

   test('Clear filters button clears all filters', async () => {
      // Open the diagram with pre-created entity containing attributes for filtering
      const FILTER_ENTITY_ID = 'FilterByTextEntity';

      const diagramEditorForFilter = await app.openCompositeEditor(FILTER_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForFilter = await diagramEditorForFilter.selectLogicalEntityAndOpenProperties(FILTER_ENTITY_ID);
      const formForFilter = await propertyViewForFilter.form();

      // Ensure attributes section is expanded
      const header = formForFilter.attributesSection.locator.locator('.p-accordion-header');
      const isExpanded = (await header.getAttribute('class'))?.includes('p-highlight');
      if (!isExpanded) {
         await header.click();
      }

      const rows = formForFilter.attributesSection.locator.locator('table tbody tr');

      // Verify all attributes are visible initially
      await expect(rows).toHaveCount(3);

      // Apply global text filter
      await formForFilter.attributesSection.setGlobalFilter('Customer');

      // Verify only matching attributes are visible
      await expect(rows).toHaveCount(2);
      const visibleAttr1 = await formForFilter.attributesSection.findAttribute('CustomerName');
      const visibleAttr2 = await formForFilter.attributesSection.findAttribute('CustomerEmail');
      expect(visibleAttr1).toBeDefined();
      expect(visibleAttr2).toBeDefined();

      // Click clear filters button
      await formForFilter.attributesSection.clickClearFilters();

      // Verify all filters are cleared and all attributes are visible again
      await expect(rows).toHaveCount(3);

      // Verify the global filter input is empty
      const filterInput = await formForFilter.attributesSection.getGlobalFilterInput();
      expect(await filterInput.inputValue()).toBe('');

      await diagramEditorForFilter.closeWithoutSave();
   });
});
