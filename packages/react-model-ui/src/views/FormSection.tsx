/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { Accordion, AccordionTab } from 'primereact/accordion';
import * as React from 'react';

export interface FormSectionProps extends React.PropsWithChildren {
   label: string;
}

export function FormSection({ label, children }: FormSectionProps): React.ReactElement {
   return (
      <Accordion multiple activeIndex={[0]}>
         <AccordionTab header={label}>{children}</AccordionTab>
      </Accordion>
   );
}
