/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import * as React from 'react';
import { Header, HeaderProps } from './Header';

export interface FormProps extends HeaderProps, React.PropsWithChildren {}

export function Form({ children, ...headerProps }: FormProps): React.ReactElement {
   return (
      <>
         <Header {...headerProps} />
         <div style={{ margin: '3px 24px 0px 24px' /* margin as in Theia Settings Pane */ }}>{children}</div>
      </>
   );
}
