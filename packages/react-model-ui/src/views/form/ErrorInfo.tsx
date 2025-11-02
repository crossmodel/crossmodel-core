/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import * as React from 'react';
import { DiagnosticInfo } from '../../ModelContext';

export interface FullErrorMessageProps extends React.HTMLProps<HTMLElement> {
   elementPath: string | string[];
   property?: string;
   idx?: number;
}

export interface ErrorMessageProps extends React.HTMLProps<HTMLElement> {
   diagnostic: DiagnosticInfo;
}

export function ErrorInfo({ diagnostic, ...props }: ErrorMessageProps): React.ReactNode {
   return diagnostic.empty ? undefined : (
      <small {...props} className={'p-error ' + props.className}>
         {diagnostic.text()}
      </small>
   );
}
