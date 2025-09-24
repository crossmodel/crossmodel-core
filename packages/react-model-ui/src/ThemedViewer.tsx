/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { PrimeReactProvider } from 'primereact/api';
import * as React from 'react';
import './PrimeReactSetup';

export type ThemeType = 'light' | 'dark' | 'hc' | 'hcLight';

export interface ThemingProps {
   theme: ThemeType;
}

export function themed<P extends object, TP extends ThemingProps>(WrappedComponent: React.ComponentType<P>): React.ComponentType<P & TP> {
   return function ThemedComponent(props: P & TP): React.ReactElement {
      React.useEffect(() => {
         // Add theme class to body for overlay styling
         document.body.classList.remove('light-theme', 'dark-theme');
         document.body.classList.add(`${props.theme === 'dark' ? 'dark' : 'light'}-theme`);

         return () => {
            document.body.classList.remove('light-theme', 'dark-theme');
         };
      }, [props.theme]);

      return (
         <div className={`${props.theme === 'dark' ? 'dark' : 'light'}-theme`}>
            <PrimeReactProvider value={{ cssTransition: false, ripple: true }}>
               <WrappedComponent {...(props as P)} />
            </PrimeReactProvider>
         </div>
      );
   };
}
