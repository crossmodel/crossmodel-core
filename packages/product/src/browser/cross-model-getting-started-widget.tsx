/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import * as React from 'react';

import { injectable } from '@theia/core/shared/inversify';

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
            {this.renderVersion()}
         </div>
      );
   }

   protected override renderNews(): React.ReactNode {
      return (
         <div className='gs-section'>
            <h3 className='gs-section-header'>🚀 CrossModel is in active development! ✨</h3>
            <div className='gs-action-container'>
               CrossModel is a new open-source project that aims to provide a powerful and flexible data modeling platform. It is currently
               in active development, and we are excited to share our progress with the community.
               <br />
               <br />
               If you have any feedback or suggestions, please feel free to reach out to us via [GitHub](https://github.com/crossmodel) or
               our [website](https://crossmodel.io).
               <br />
               <br />
               Follow us on [LinkedIn](https://www.linkedin.com/showcase/crossmodel) and/or
               [YouTube](https://www.youtube.com/@crossmodel-io) to stay updated with the latest news and developments.
            </div>
         </div>
      );
   }

   protected override render(): React.ReactNode {
      return (
         <div className='gs-container'>
            <div className='gs-content-container'>
               {this.renderHeader()}
               <hr className='gs-hr' />
               <div className='flex-grid'>
                  <div className='col'>{this.renderNews()}</div>
               </div>
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
