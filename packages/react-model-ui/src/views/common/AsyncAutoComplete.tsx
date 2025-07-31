import { AutoComplete, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { ProgressSpinner } from 'primereact/progressspinner';
import * as React from 'react';
import { useReadonly } from '../../ModelContext';

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

   return (
      <div className='p-field p-fluid' style={{ marginBottom: '1rem', position: 'relative' }}>
         <span className='p-float-label'>
            <AutoComplete<T>
               value={value}
               suggestions={options as (T extends any[] ? T[number] : T)[]}
               completeMethod={loadSuggestions}
               onChange={e => onChange({ value: e.value })}
               disabled={readonly}
               className={`${className} ${error ? 'p-invalid' : ''}`}
               dropdown
               forceSelection={forceSelection}
               field={field ? String(field) : undefined}
            />
            <label htmlFor={label}>{label}</label>
         </span>
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
