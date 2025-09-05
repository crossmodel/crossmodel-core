/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { PrimeReactProvider } from 'primereact/api';
import * as React from 'react';
import './PrimeReactSetup';

export type ThemeType = 'light' | 'dark' | 'hc' | 'hcLight';

interface ThemeStyles extends React.CSSProperties {
   '--primary-color': string;
   '--primary-color-text': string;
   '--surface-ground': string;
   '--text-color': string;
   '--surface-card': string;
   '--surface-border': string;
   '--surface-hover': string;
   '--focus-ring': string;
}

const lightTheme: ThemeStyles = {
   '--primary-color': '#007acc',
   '--primary-color-text': '#ffffff',
   '--surface-ground': '#ffffff',
   '--text-color': '#000000',
   '--surface-card': '#ffffff',
   '--surface-border': '#dfe7ef',
   '--surface-hover': '#f6f9fc',
   '--focus-ring': '0 0 0 0.2rem #007acc40'
} as ThemeStyles;

const darkTheme: ThemeStyles = {
   '--primary-color': '#0e639c',
   '--primary-color-text': '#ffffff',
   '--surface-ground': '#1e1e1e',
   '--text-color': '#d4d4d4',
   '--surface-card': '#252526',
   '--surface-border': '#404040',
   '--surface-hover': '#2a2d2e',
   '--focus-ring': '0 0 0 0.2rem #0e639c40'
} as ThemeStyles;

const getTheme = (type: ThemeType): ThemeStyles => (type === 'dark' ? darkTheme : lightTheme);

export interface ThemingProps {
   theme: ThemeType;
}

export function themed<P extends object, TP extends ThemingProps>(WrappedComponent: React.ComponentType<P>): React.ComponentType<P & TP> {
   return function ThemedComponent(props: P & TP): React.ReactElement {
      return React.createElement(
         'div',
         {
            style: getTheme(props.theme),
            className: `${props.theme === 'dark' ? 'dark' : 'light'}-theme`
         },
         React.createElement(
            PrimeReactProvider,
            {
               value: { cssTransition: false, ripple: true },
               children: undefined
            },
            React.createElement(WrappedComponent, props as P)
         )
      );
   };
}
