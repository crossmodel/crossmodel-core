/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { ApplicationShell, FrontendApplication, WidgetManager } from '@theia/core/lib/browser';
import { inject } from '@theia/core/shared/inversify';
import { PROBLEMS_WIDGET_ID } from '@theia/markers/lib/browser/problem/problem-widget';
import { NavigatorWidgetFactory } from '@theia/navigator/lib/browser/navigator-widget-factory';
import { PropertyViewWidget } from '@theia/property-view/lib/browser/property-view-widget';
import { SCM_VIEW_CONTAINER_ID } from '@theia/scm/lib/browser/scm-contribution';
import { SearchInWorkspaceWidget } from '@theia/search-in-workspace/lib/browser/search-in-workspace-widget';

export class CrossModelFrontendApplication extends FrontendApplication {
   @inject(WidgetManager) protected readonly widgetManager: WidgetManager;

   protected override async createDefaultLayout(): Promise<void> {
      // ignores all FrontendApplicationContribution.initializeLayout calls and focusses on a very clean interface
      await this.showWidget(NavigatorWidgetFactory.ID, 'left');
      await this.showWidget(SearchInWorkspaceWidget.ID, 'left', false);
      await this.showWidget(SCM_VIEW_CONTAINER_ID, 'left', false);
      await this.showWidget(PropertyViewWidget.ID, 'right', false);
      await this.showWidget(PROBLEMS_WIDGET_ID, 'bottom', false);
   }

   protected async showWidget(widgetId: string, area: ApplicationShell.Area, reveal = true, rank = 100): Promise<void> {
      const sdvTreeWidget = await this.widgetManager.getOrCreateWidget(widgetId);
      this.shell.addWidget(sdvTreeWidget, { area, rank });
      if (reveal) {
         this.shell.revealWidget(widgetId);
      }
   }
}
