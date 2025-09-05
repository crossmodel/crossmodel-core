/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteDropdownClickEvent } from 'primereact/autocomplete';
import { ProgressSpinner } from 'primereact/progressspinner';
import * as React from 'react';
import { useReadonly } from '../../ModelContext';
import { handleGridEditorKeyDown } from './gridKeydownHandler';

export interface AsyncAutoCompleteProps<T = string> {
   label: string;
   optionLoader: () => Promise<T[]>;
   onOptionsLoaded?: (options: T[]) => void;
   value: T;
   onChange: (event: { value: T }) => void;
   disabled?: boolean;
   required?: boolean;
   className?: string;
   error?: boolean;
   helperText?: string;
   forceSelection?: boolean;
   field?: keyof T;
}

export default function AsyncAutoComplete<T = string>({
   label,
   optionLoader,
   onOptionsLoaded,
   value,
   onChange,
   disabled = false,
   required = false,
   className = '',
   error = false,
   helperText = '',
   forceSelection = false,
   field
}: AsyncAutoCompleteProps<T>): React.ReactElement {
   const [options, setOptions] = React.useState<T[]>([]);
   const [loading, setLoading] = React.useState(false);
   const readonly = useReadonly() || disabled;
   // eslint-disable-next-line no-null/no-null
   const autoCompleteRef = React.useRef<AutoComplete>(null);
   const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

   const loadSuggestions = async (event: AutoCompleteCompleteEvent) => {
      setLoading(true);
      try {
         const allOptions = await optionLoader();
         const filtered = !event.query.trim()
            ? allOptions
            : allOptions.filter(opt =>
                 String(field ? opt[field] : opt)
                    .toLowerCase()
                    .startsWith(event.query.toLowerCase())
              );
         setOptions(filtered);
         onOptionsLoaded?.(filtered);
      } finally {
         setLoading(false);
      }
   };

   const handleDropdownClick = (event: AutoCompleteDropdownClickEvent) => {
      // Check if dropdown is currently visible
      setTimeout(() => {
         const panel = autoCompleteRef.current?.getOverlay();
         // eslint-disable-next-line no-null/no-null
         const isVisible = panel && panel.style.display !== 'none' && panel.offsetParent !== null;

         if (isVisible) {
            // If visible, hide it
            autoCompleteRef.current?.hide();
            setIsDropdownOpen(false);
         } else {
            // If not visible, trigger search to show options
            autoCompleteRef.current?.search(event.originalEvent, '', 'dropdown');
            setIsDropdownOpen(true);
         }
      }, 10);
   };

   const onShow = () => {
      setIsDropdownOpen(true);
   };

   const onHide = () => {
      setIsDropdownOpen(false);
   };

   // Handle click outside to close dropdown
   React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (autoCompleteRef.current && !autoCompleteRef.current.getElement()?.contains(event.target as Node)) {
            // Small delay to allow selection to complete first
            setTimeout(() => {
               const panel = autoCompleteRef.current?.getOverlay();
               if (panel && panel.style.display !== 'none') {
                  autoCompleteRef.current?.hide();
                  setIsDropdownOpen(false);
               }
            }, 100);
         }
      };

      document.addEventListener('mouseup', handleClickOutside);
      return () => {
         document.removeEventListener('mouseup', handleClickOutside);
      };
   }, []);

   return (
      <div className='p-field p-fluid' style={{ position: 'relative' }}>
         <div>
            <label htmlFor={label}>{label}</label>
            <AutoComplete<T>
               ref={autoCompleteRef}
               value={value}
               suggestions={options as (T extends any[] ? T[number] : T)[]}
               completeMethod={loadSuggestions}
               onChange={e => onChange({ value: e.value })}
               disabled={readonly}
               className={`${className} ${error ? 'p-invalid' : ''} ${isDropdownOpen ? 'autocomplete-dropdown-open' : ''}`}
               dropdown
               onDropdownClick={handleDropdownClick}
               onShow={onShow}
               onHide={onHide}
               forceSelection={forceSelection}
               field={field ? String(field) : undefined}
               onKeyDown={handleGridEditorKeyDown}
            />
         </div>
         {error && helperText && <small className='p-error'>{helperText}</small>}
         {loading && (
            <div
               style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)'
               }}
            >
               <ProgressSpinner style={{ width: '20px', height: '20px' }} strokeWidth='4' />
            </div>
         )}
      </div>
   );
}
