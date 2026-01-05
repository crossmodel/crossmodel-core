/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { AutoComplete, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import * as React from 'react';
import { useCanRedo, useCanUndo, useDiagnosticsManager, useReadonly, useRedo, useUndo } from '../../ModelContext';
import { handleGridEditorKeyDown } from './gridKeydownHandler';

// Route ctrl/cmd + Z / Y from focused inputs to the model undo/redo handlers
const handleUndoRedoKeys = (
   e: React.KeyboardEvent,
   canUndo: (() => boolean) | undefined,
   canRedo: (() => boolean) | undefined,
   undo: (() => boolean) | undefined,
   redo: (() => boolean) | undefined
): void => {
   const isCtrlOrMeta = e.ctrlKey || e.metaKey;
   if (!isCtrlOrMeta) {
      return;
   }

   // Undo
   if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      if (canUndo && canUndo()) {
         e.preventDefault();
         e.stopPropagation();
         undo?.();
      }
      return;
   }

   // Redo
   const redoCombo = (e.key === 'z' || e.key === 'Z') && e.shiftKey;
   if (redoCombo || e.key === 'y' || e.key === 'Y') {
      if (canRedo && canRedo()) {
         e.preventDefault();
         e.stopPropagation();
         redo?.();
      }
   }
};

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
         {errorMessage && <p className='p-error block validation-error-message'>{errorMessage}</p>}
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
               {error && <small className='p-error m-0 validation-error-message'>{error}</small>}
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
               {error && <small className='p-error m-0 validation-error-message'>{error}</small>}
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
   const undo = useUndo();
   const redo = useRedo();
   const canUndo = useCanUndo();
   const canRedo = useCanRedo();

   return (
      <EditorContainer basePath={basePath} field={field} rowIdx={rowIdx}>
         {({ invalid, error, className }) => (
            <div className={`grid-cell-container ${invalid ? 'p-invalid' : ''}`} title={error || undefined}>
               <Dropdown
                  value={options.value}
                  options={dropdownOptions}
                  onChange={e => options.editorCallback(e.value)}
                  onKeyDown={e => {
                     handleGridEditorKeyDown(e);
                     handleUndoRedoKeys(e, canUndo, canRedo, undo, redo);
                  }}
                  disabled={readonly}
                  className='w-full'
               />
               {error && <small className='p-error m-0 validation-error-message'>{error}</small>}
            </div>
         )}
      </EditorContainer>
   );
}

export function GenericAutoCompleteEditor({
   options,
   basePath,
   field,
   dropdownOptions,
   placeholder
}: {
   options: any;
   basePath: string[];
   field: string;
   dropdownOptions: Array<{ label: string; value: string }>;
   placeholder?: string;
}): React.ReactElement {
   const rowIdx = options.rowData?.idx ?? -1;
   const readonly = useReadonly();
   const undo = useUndo();
   const redo = useRedo();
   const canUndo = useCanUndo();
   const canRedo = useCanRedo();
   const [suggestions, setSuggestions] = React.useState<Array<{ label: string; value: string }>>(dropdownOptions);
   const [inputValue, setInputValue] = React.useState<string>(() => {
      const initialOption = dropdownOptions.find(opt => opt.value === options.value);
      return (initialOption ? initialOption.label : typeof options.value === 'string' ? options.value : '') || '';
   });

   // Keep inputValue in sync with external value when it represents a selected option
   React.useEffect(() => {
      const selectedOption = dropdownOptions.find(opt => opt.value === options.value);
      if (selectedOption) {
         setInputValue(selectedOption.label);
      } else if (typeof options.value === 'string') {
         setInputValue(options.value);
      }
   }, [options.value, dropdownOptions]);
   const search = (event: AutoCompleteCompleteEvent): void => {
      const query = event.query.toLowerCase();
      const filtered = dropdownOptions.filter(
         option => option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query)
      );
      setSuggestions(filtered);
   };

   const onChange = (e: { value: { label: string; value: string } | string }): void => {
      if (typeof e.value === 'object' && e.value !== undefined && 'value' in e.value) {
         // user selected a suggestion
         setInputValue(e.value.label);
         options.editorCallback(e.value.value);
      } else if (typeof e.value === 'string') {
         // user is typing
         setInputValue(e.value);
         if (options.commitOnInput === true) {
            options.editorCallback(e.value);
         }
      }
   };

   const handleHide = (): void => {
      // Refocus the property widget container after autocomplete dropdown closes
      // to ensure undo/redo is available again
      setTimeout(() => {
         const propertyWidget = document.querySelector('[id="model-property-view"]');
         if (propertyWidget) {
            (propertyWidget as HTMLElement).focus();
         }
      }, 0);
   };

   return (
      <EditorContainer basePath={basePath} field={field} rowIdx={rowIdx}>
         {({ invalid, error, className }) => (
            <div className={`grid-cell-container ${invalid ? 'p-invalid' : ''}`} title={error || undefined}>
               <AutoComplete
                  value={inputValue}
                  suggestions={suggestions}
                  completeMethod={search}
                  field='label'
                  placeholder={placeholder}
                  onChange={onChange}
                  onKeyDown={e => {
                     handleGridEditorKeyDown(e);
                     handleUndoRedoKeys(e, canUndo, canRedo, undo, redo);
                  }}
                  onHide={handleHide}
                  disabled={readonly}
                  className={`w-full ${className}`}
                  autoFocus
                  dropdown
               />
               {error && <small className='p-error m-0 validation-error-message'>{error}</small>}
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

export function GenericNumberEditor({
   options,
   basePath,
   field,
   placeholder,
   disabled,
   value,
   showButtons,
   tooltip,
   forceClear
}: {
   options: any;
   basePath: string[];
   field: string;
   placeholder?: string;
   disabled?: boolean;
   value?: number | null;
   showButtons?: boolean;
   tooltip?: string;
   forceClear?: boolean;
}): React.ReactElement {
   const rowIdx = options.rowData?.idx ?? -1;
   const readonly = useReadonly();
   const isDisabled = options.disabled || readonly || disabled;

   let effectiveValue = value;
   if (forceClear) {
      effectiveValue = undefined;
   } else if (effectiveValue === undefined) {
      effectiveValue = options.value ?? undefined;
   }

   return (
      <EditorContainer basePath={basePath} field={field} rowIdx={rowIdx}>
         {({ invalid, error, className }) => (
            <div className={`grid-cell-container ${invalid ? 'p-invalid' : ''}`} title={error || tooltip || undefined}>
               <InputNumber
                  value={effectiveValue}
                  onValueChange={(e: any) => options.editorCallback(e.value)}
                  className={`w-full ${className} p-inputtext-sm`}
                  inputStyle={{ padding: '0.25rem' }}
                  onKeyDown={handleGridEditorKeyDown}
                  disabled={isDisabled}
                  autoFocus={!isDisabled}
                  useGrouping={false}
                  min={0}
                  placeholder={placeholder}
                  showButtons={showButtons}
               />
               {error && <small className='p-error m-0 validation-error-message'>{error}</small>}
            </div>
         )}
      </EditorContainer>
   );
}

export default {};
