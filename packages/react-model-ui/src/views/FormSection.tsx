/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { Accordion, AccordionTab } from 'primereact/accordion';
import * as React from 'react';

export interface FormSectionProps extends React.PropsWithChildren {
   label: string;
   /** If true the section will be collapsed by default */
   defaultCollapsed?: boolean;
}

export function FormSection({ label, children, defaultCollapsed = false }: FormSectionProps): React.ReactElement {
   const [activeIndex, setActiveIndex] = React.useState<number[] | number>(defaultCollapsed ? [] : [0]);

   // Ensure component responds if defaultCollapsed prop changes after mount
   React.useEffect(() => {
      setActiveIndex(defaultCollapsed ? [] : [0]);
   }, [defaultCollapsed]);

   return (
      <Accordion
         multiple
         activeIndex={activeIndex}
         onTabChange={e => setActiveIndex(typeof (e as any)?.index !== 'undefined' ? (e as any).index : activeIndex)}
      >
         <AccordionTab header={label}>{children}</AccordionTab>
      </Accordion>
   );
}
