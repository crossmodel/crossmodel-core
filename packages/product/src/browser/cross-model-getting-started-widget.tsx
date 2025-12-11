/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import * as React from 'react';

import { injectable } from '@theia/core/shared/inversify';

import { environment, isOSX, nls } from '@theia/core';
import { codicon } from '@theia/core/lib/browser';
import { GettingStartedWidget } from '@theia/getting-started/lib/browser/getting-started-widget';

@injectable()
export class CrossModelGettingStartedWidget extends GettingStartedWidget {
   protected override renderHeader(): React.ReactNode {
      return (
         <div className='gs-header'>
            <h1>
               {this.applicationName}
               <span className='gs-sub-header'></span>
            </h1>
         </div>
      );
   }

   protected renderDevelopmentBanner(): React.ReactNode {
      return (
         <div className='gs-container gs-aifeature-container'>
            <div className='flex-grid'>
               <div className='col'>
                  <h3 className='gs-section-header'>👷 CrossModel is in active development!</h3>
                  <div className='gs-action-container'>
                     CrossModel is a new open-source project that aims to provide a powerful and flexible data modeling platform. It is
                     currently in active development, and we are excited to share our progress with the community.
                     <br />
                     <br />
                     If you have any feedback or suggestions, please feel free to reach out to us via our{' '}
                     <a href='https://crossmodel.io' target='_blank' rel='noreferrer'>
                        website
                     </a>{' '}
                     or report an issues via{' '}
                     <a href='https://github.com/crossmodel' target='_blank' rel='noreferrer'>
                        GitHub
                     </a>{' '}
                     .
                     <br />
                     <br />
                     Follow us on{' '}
                     <a href='https://www.linkedin.com/showcase/crossmodel' target='_blank' rel='noreferrer'>
                        LinkedIn
                     </a>{' '}
                     and/or{' '}
                     <a href='https://www.youtube.com/@crossmodel-io' target='_blank' rel='noreferrer'>
                        YouTube
                     </a>{' '}
                     to stay updated with the latest news and developments.
                  </div>
               </div>
            </div>
         </div>
      );
   }

   protected override renderStart(): React.ReactNode {
      const requireSingleOpen = isOSX || !environment.electron.is();

      const openFolder = !requireSingleOpen && (
         <div className='gs-action-container'>
            <a role={'button'} tabIndex={0} onClick={this.doOpenFolder} onKeyDown={this.doOpenFolderEnter}>
               {nls.localizeByDefault('Open Folder')}
            </a>
         </div>
      );

      const openWorkspace = (
         <a role={'button'} tabIndex={0} onClick={this.doOpenWorkspace} onKeyDown={this.doOpenWorkspaceEnter}>
            {nls.localizeByDefault('Open Workspace')}
         </a>
      );

      return (
         <div className='gs-section'>
            <h3 className='gs-section-header'>
               <i className={codicon('folder-opened')}></i>
               {nls.localizeByDefault('Start')}
            </h3>
            {openFolder}
            {openWorkspace}
         </div>
      );
   }

   protected override renderHelp(): React.ReactNode {
      return (
         <div className='gs-section'>
            <h3 className='gs-section-header'>
               <i className={codicon('question')}></i>
               {nls.localizeByDefault('Help')}
            </h3>
            <div className='gs-action-container'>
               <a
                  role={'button'}
                  tabIndex={0}
                  onClick={() => this.doOpenExternalLink('https://help.crossmodel.io/')}
                  onKeyDown={(e: React.KeyboardEvent) => this.doOpenExternalLinkEnter(e, 'https://help.crossmodel.io/')}
               >
                  {nls.localizeByDefault('Knowledge Base')}
               </a>
            </div>
         </div>
      );
   }

   protected override render(): React.ReactNode {
      return (
         <div className='gs-container'>
            <div className='gs-content-container'>
               <div className='gs-float shadow-pulse'>{this.renderDevelopmentBanner()}</div>
               {this.renderHeader()}
               <hr className='gs-hr' />
               <div className='flex-grid'>
                  <div className='col'>{this.renderStart()}</div>
               </div>
               <div className='flex-grid'>
                  <div className='col'>{this.renderRecentWorkspaces()}</div>
               </div>
               <div className='flex-grid'>
                  <div className='col'>{this.renderSettings()}</div>
               </div>
               <div className='flex-grid'>
                  <div className='col'>{this.renderHelp()}</div>
               </div>
               <div className='flex-grid'>
                  <div className='col'>{this.renderVersion()}</div>
               </div>
            </div>
            <div className='gs-preference-container'>{this.renderPreferences()}</div>
         </div>
      );
   }
}
