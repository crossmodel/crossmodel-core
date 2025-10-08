/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { SelectableTreeNode } from '@theia/core/lib/browser';
import { injectable, interfaces } from '@theia/core/shared/inversify';
import { FileNavigatorWidget } from '@theia/navigator/lib/browser';
import { createFileNavigatorContainer } from '@theia/navigator/lib/browser/navigator-container';

@injectable()
export class CrossModelFileNavigatorWidget extends FileNavigatorWidget {
   protected override createContainerAttributes(): React.HTMLAttributes<HTMLElement> {
      const attrs = super.createContainerAttributes();
      return {
         ...attrs,
         onClick: event => this.handleClickEvent(this.model.root, event)
      };
   }

   protected override toContextMenuArgs(node: SelectableTreeNode): any[] | undefined {
      const uris = this.model.selectedFileStatNodes.map(selected => selected.uri);
      if (uris.length > 0) {
         return uris;
      }
      return super.toContextMenuArgs(node);
   }
}

export function createCrossModelFileNavigatorWidget(parent: interfaces.Container): FileNavigatorWidget {
   const child = createFileNavigatorContainer(parent);
   child.bind(CrossModelFileNavigatorWidget).toSelf().inSingletonScope();
   child.rebind(FileNavigatorWidget).toService(CrossModelFileNavigatorWidget);
   return child.get(FileNavigatorWidget);
}
