/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import * as React from 'react';
import { useDiagnosticsManager, useReadonly } from '../../ModelContext';
import { handleGridEditorKeyDown } from './gridKeydownHandler';

export interface EditorContainerProps {
   basePath: string[];
   field: string;
   rowIdx: number;
   children: (props: { invalid: boolean; error?: string; className?: string }) => React.ReactNode;
}

export function EditorContainer({ basePath, field, rowIdx, children }: EditorContainerProps): React.ReactElement {
   const diagnostics = useDiagnosticsManager();
   const info = diagnostics.info(basePath, field, rowIdx);
   const invalid = !info.empty;
   const error = invalid ? info.text() : undefined;
   const className = invalid ? 'p-invalid' : '';

   return <>{children({ invalid, error, className })}</>;
}

export function EditorProperty({
   basePath,
   field,
   row,
   value
}: {
   basePath: string[];
   field: string;
   row: { idx: number };
   value: string;
}): React.ReactNode {
   const diagnostics = useDiagnosticsManager();
   const info = diagnostics.info(basePath, field, row.idx);
   const errorMessage = info.empty ? undefined : info.text();

   return (
      <div className={`grid-cell-container ${errorMessage ? 'p-invalid' : ''}`} title={errorMessage}>
         {value}
         {errorMessage && <p className='p-error block'>{errorMessage}</p>}
      </div>
   );
}

export function GenericTextEditor({ options, basePath, field }: { options: any; basePath: string[]; field: string }): React.ReactElement {
   const rowIdx = options.rowData?.idx ?? -1;
   const readonly = useReadonly();

   return (
      <EditorContainer basePath={basePath} field={field} rowIdx={rowIdx}>
         {({ invalid, error, className }) => (
            <div className={`grid-cell-container ${invalid ? 'p-invalid' : ''}`} title={error || undefined}>
               <InputText
                  value={options.value ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => options.editorCallback(e.target.value)}
                  className={className}
                  onKeyDown={handleGridEditorKeyDown}
                  disabled={readonly}
                  autoFocus
               />
               {error && <small className='p-error m-0'>{error}</small>}
            </div>
         )}
      </EditorContainer>
   );
}

export function GenericTextareaEditor({
   options,
   basePath,
   field
}: {
   options: any;
   basePath: string[];
   field: string;
}): React.ReactElement {
   const rowIdx = options.rowData?.idx ?? -1;
   const readonly = useReadonly();

   return (
      <EditorContainer basePath={basePath} field={field} rowIdx={rowIdx}>
         {({ invalid, error, className }) => (
            <div className={`grid-cell-container ${invalid ? 'p-invalid' : ''}`} title={error || undefined}>
               <InputTextarea
                  value={options.value ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => options.editorCallback(e.target.value)}
                  className={className}
                  onKeyDown={handleGridEditorKeyDown}
                  disabled={readonly}
                  autoFocus
                  rows={3}
               />
               {error && <small className='p-error m-0'>{error}</small>}
            </div>
         )}
      </EditorContainer>
   );
}

export function GenericDropdownEditor({
   options,
   basePath,
   field,
   dropdownOptions
}: {
   options: any;
   basePath: string[];
   field: string;
   dropdownOptions: any[];
}): React.ReactElement {
   const rowIdx = options.rowData?.idx ?? -1;
   const readonly = useReadonly();

   return (
      <EditorContainer basePath={basePath} field={field} rowIdx={rowIdx}>
         {({ invalid, error, className }) => (
            <div className={`grid-cell-container ${invalid ? 'p-invalid' : ''}`} title={error || undefined}>
               <Dropdown
                  value={options.value}
                  options={dropdownOptions}
                  onChange={e => options.editorCallback(e.value)}
                  onKeyDown={handleGridEditorKeyDown}
                  disabled={readonly}
                  className='w-full'
               />
               {error && <small className='p-error m-0'>{error}</small>}
            </div>
         )}
      </EditorContainer>
   );
}

export function GenericCheckboxEditor({
   options,
   basePath,
   field
}: {
   options: any;
   basePath: string[];
   field: string;
}): React.ReactElement {
   const rowIdx = options.rowData?.idx ?? -1;
   const readonly = useReadonly();

   return (
      <EditorContainer basePath={basePath} field={field} rowIdx={rowIdx}>
         {() => (
            <div className='flex align-items-center justify-content-center'>
               <Checkbox
                  checked={options.value ?? false}
                  onChange={e => options.editorCallback(e.checked ?? false)}
                  onKeyDown={handleGridEditorKeyDown}
                  disabled={readonly}
               />
            </div>
         )}
      </EditorContainer>
   );
}

export default {};
