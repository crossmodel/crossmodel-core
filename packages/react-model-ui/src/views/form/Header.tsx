/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { ERRONEOUS_MODEL, ModelDiagnostic } from '@crossmodel/protocol';
import { Button } from 'primereact/button';
import { Toolbar } from 'primereact/toolbar';
import { useDiagnostics, useDirty, useModelOpen, useModelSave, useUntitled } from '../../ModelContext';
import { createEditorError } from '../common/EditorError';
import React = require('react');

export interface HeaderProps {
   name: string;
   id?: string;
   iconClass?: string;
}

export function Header({ name, id, iconClass }: HeaderProps): React.ReactElement {
   const saveModel = useModelSave();
   const openModel = useModelOpen();
   const dirty = useDirty();
   const untitled = useUntitled();
   const diagnostics = useDiagnostics();

   const startContent = (
      <div style={{ display: 'flex', flexGrow: 1, gap: '1em', alignItems: 'center' }}>
         {iconClass && <i className={`codicon ${iconClass}`} style={{ fontSize: '1.7em' }} />}
         <h5 style={{ margin: 0, fontWeight: 500 }} className='form-title'>
            {name}
            {saveModel && dirty ? '*' : ''}
         </h5>
         {!untitled && (
            <span style={{ paddingTop: '.25em', marginLeft: '1em', fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.7 }}>
               ID: {id}
            </span>
         )}
      </div>
   );

   const endContent = (
      <div style={{ display: 'flex', gap: '0.5rem' }}>
         {openModel && <Button onClick={openModel} icon='pi pi-external-link' label='Open' text />}
         {saveModel && <Button onClick={saveModel} icon='pi pi-save' label='Save' text disabled={!dirty} />}
      </div>
   );

   return (
      <div style={{ position: 'sticky', top: 0, zIndex: 1000, backgroundColor: 'var(--surface-b)' }}>
         {ModelDiagnostic.hasParseErrors(diagnostics) && createEditorError(ERRONEOUS_MODEL)}
         <Toolbar
            start={startContent}
            end={endContent}
            style={{ minHeight: '40px', padding: '0.5rem 1rem', borderRadius: 0, border: 'none', background: 'transparent' }}
         />
      </div>
   );
}
