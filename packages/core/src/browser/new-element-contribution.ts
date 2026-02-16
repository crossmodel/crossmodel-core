/** ******************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { ModelService } from '@crossmodel/model-service/lib/common';
import {
   CrossModelTerminals,
   DATAMODEL_FILE,
   DataModelType,
   DataModelTypeInfos,
   LogicalEntityType,
   MappingType,
   ModelFileExtensions,
   ModelFileType,
   ModelStructure,
   RelationshipType,
   TargetObjectType,
   findNextUnique,
   getCrossModelEdition,
   getCrossModelMajorVersion,
   isMemberPermittedInModel,
   quote,
   toId,
   toIdReference,
   toPascal
} from '@crossmodel/protocol';
import {
   Command,
   CommandContribution,
   CommandRegistry,
   MaybePromise,
   MenuContribution,
   MenuModelRegistry,
   Resource,
   UNTITLED_SCHEME,
   URI,
   UntitledResourceResolver,
   UriSelection,
   nls
} from '@theia/core';
import { CommonMenus, DialogError, open } from '@theia/core/lib/browser';
import { TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { inject, injectable } from '@theia/core/shared/inversify';
import { EditorContextMenu } from '@theia/editor/lib/browser';
import { FileNavigatorContribution, NavigatorContextMenu } from '@theia/navigator/lib/browser/navigator-contribution';
import { WorkspaceCommandContribution } from '@theia/workspace/lib/browser/workspace-commands';
import { WorkspaceInputDialogProps } from '@theia/workspace/lib/browser/workspace-input-dialog';
import * as yaml from 'yaml';
import { FieldValues, InputOptions, getGridInputOptions } from './grid-dialog';

const NEW_ELEMENT_NAV_MENU = [...NavigatorContextMenu.NAVIGATION, '0_new'];
const NEW_ELEMENT_MAIN_MENU = [...CommonMenus.FILE, '0_new'];

interface NewElementTemplate<T extends readonly InputOptions[] = readonly InputOptions[]> extends Command {
   label: string;
   toUri: (parent: URI, name: string) => URI;
   memberType: ModelFileType;
   content: string | ((parent: URI, model: ModelService, options: FieldValues<T>) => string | Promise<string>);
   validateName?(name: string): string | undefined;
   getInputOptions?(parent: URI, modelService: ModelService): MaybePromise<T>;
}

/**
 * Generates the initial datamodel content with current CrossModel version.
 * The version is read from CROSSMODEL_VERSION constant which is sourced from package.json.
 */
function getInitialDataModelContent(): string {
   const edition = getCrossModelEdition();
   const majorVersion = getCrossModelMajorVersion();
   const crossmodelBlock =
      edition !== undefined && majorVersion !== undefined
         ? `
    crossmodel:
        edition: ${edition}
        version: ${majorVersion}`
         : '';
   return `datamodel:
    id: _
    name: ""
    type: ${DataModelTypeInfos.logical.value}
    version: 1.0.0${crossmodelBlock}
`;
}

const INITIAL_ENTITY_CONTENT = `entity:
    id: _
    name: ""
`;

const INITIAL_RELATIONSHIP_CONTENT = `relationship:
    id: _Parent_to_Child_
    name: "<Parent> to <Child>"
`;

const INITIAL_DIAGRAM_CONTENT = `systemDiagram:
    id: \${id}
`;

const INITIAL_MAPPING_CONTENT = `mapping:
    id: \${id}
    target:
        entity: \${target}
`;

function resolvePlaceholder(content: string, parameters: Record<string, string>): string {
   return Object.entries(parameters).reduce((result, [key, value]) => result.replace(new RegExp(`\\$\\{${key}\\}`, 'gi'), value), content);
}

const TEMPLATE_CATEGORY = 'New Element';

const NEW_ELEMENT_TEMPLATES: ReadonlyArray<NewElementTemplate> = [
   {
      id: 'crossbreeze.new.entity',
      label: 'Entity',
      memberType: LogicalEntityType,
      toUri(parent) {
         return join(parent, `New${this.memberType}`, ModelFileExtensions.LogicalEntity);
      },
      category: TEMPLATE_CATEGORY,
      iconClass: ModelStructure.LogicalEntity.ICON_CLASS,
      content: INITIAL_ENTITY_CONTENT
   },
   {
      id: 'crossbreeze.new.relationship',
      label: 'Relationship',
      memberType: RelationshipType,
      toUri(parent) {
         return join(parent, `New${this.memberType}`, ModelFileExtensions.Relationship);
      },
      category: TEMPLATE_CATEGORY,
      iconClass: ModelStructure.Relationship.ICON_CLASS,
      content: INITIAL_RELATIONSHIP_CONTENT
   },
   {
      id: 'crossbreeze.new.system-diagram',
      label: 'Diagram',
      memberType: 'SystemDiagram',
      toUri: (parent, name) => join(parent, toId(name), ModelFileExtensions.SystemDiagram),
      category: TEMPLATE_CATEGORY,
      validateName: validateObjectName,
      iconClass: ModelStructure.SystemDiagram.ICON_CLASS,
      content: (_, __, { name }) => resolvePlaceholder(INITIAL_DIAGRAM_CONTENT, { name: quote(name), id: toId(name) })
   },
   {
      id: 'crossbreeze.new.mapping',
      label: 'Mapping',
      memberType: 'Mapping',
      toUri: (parent, name) => join(parent, toId(name), ModelFileExtensions.Mapping),
      category: TEMPLATE_CATEGORY,
      iconClass: ModelStructure.Mapping.ICON_CLASS,
      validateName: validateObjectName,
      content: (_, __, { name, target }) => resolvePlaceholder(INITIAL_MAPPING_CONTENT, { id: toId(name), target: toIdReference(target) }),
      async getInputOptions(parent, modelService) {
         const elements = await modelService.findReferenceableElements({
            container: { uri: parent.toString(), type: this.memberType },
            syntheticElements: [{ property: 'target', type: TargetObjectType }],
            property: 'entity'
         });
         return [
            { id: 'name', label: 'Name' },
            { id: 'target', label: 'Target', options: Object.fromEntries(elements.map(element => [element.label, element.label])) }
         ] as const;
      }
   },
   {
      id: 'crossbreeze.new.data-model',
      label: 'Data Model',
      memberType: DataModelType,
      category: TEMPLATE_CATEGORY,
      validateName: validateDataModelName,
      iconClass: ModelStructure.DataModel.ICON_CLASS,
      toUri: (parent, name) => parent.resolve(toId(name)).resolve(DATAMODEL_FILE),
      content: getInitialDataModelContent
   }
];

const DERIVE_MAPPING_FROM_ENTITY: Command = {
   id: 'crossmodel.mapping',
   label: 'Derive Mapping'
};

@injectable()
export class CrossModelWorkspaceContribution extends WorkspaceCommandContribution implements MenuContribution, CommandContribution {
   @inject(ModelService) modelService: ModelService;
   @inject(UntitledResourceResolver) untitledResources: UntitledResourceResolver;

   // Public helper to trigger navigator expansion for newly created files
   expandNavigatorForNewFile(parent: URI, uri: URI): void {
      this.fireCreateNewFile({ parent, uri });
   }

   override registerCommands(commands: CommandRegistry): void {
      super.registerCommands(commands);
      for (const template of NEW_ELEMENT_TEMPLATES) {
         commands.registerCommand(
            { ...template, label: template.label + '...' },
            this.newWorkspaceRootUriAwareCommandHandler({
               isVisible: uri => doesTemplateFitPackage(uri, this.modelService, template),
               isEnabled: uri => doesTemplateFitPackage(uri, this.modelService, template),
               execute: uri => this.createNewElementFile(uri, template)
            })
         );
      }

      for (const template of NEW_ELEMENT_TEMPLATES) {
         commands.registerCommand(
            { ...template, id: template.id + '.direct', label: template.label + '...' },
            this.newWorkspaceRootUriAwareCommandHandler({
               isVisible: uri =>
                  isSelectedModelFolder(uri, this.modelService, template) ||
                  (template.memberType === DataModelType && doesTemplateFitPackage(uri, this.modelService, template)),
               isEnabled: uri =>
                  isSelectedModelFolder(uri, this.modelService, template) ||
                  (template.memberType === DataModelType && doesTemplateFitPackage(uri, this.modelService, template)),
               execute: uri => this.createNewElementFile(uri, template)
            })
         );
      }

      commands.registerCommand(
         DERIVE_MAPPING_FROM_ENTITY,
         this.newWorkspaceRootUriAwareCommandHandler({
            execute: uri => this.deriveNewMappingFile(uri),
            isEnabled: uri => ModelFileExtensions.isEntityFile(uri.path.base),
            isVisible: uri => ModelFileExtensions.isEntityFile(uri.path.base)
         })
      );
   }

   registerMenus(registry: MenuModelRegistry): void {
      for (const [id, template] of NEW_ELEMENT_TEMPLATES.entries()) {
         registry.registerMenuAction(NavigatorContextMenu.NAVIGATION, {
            commandId: template.id + '.direct',
            label: 'New ' + template.label + '...',
            order: '0.' + id.toString()
         });
      }

      registry.registerSubmenu(NEW_ELEMENT_NAV_MENU, TEMPLATE_CATEGORY, { sortString: '1' });
      for (const [id, template] of NEW_ELEMENT_TEMPLATES.entries()) {
         if (template.memberType === DataModelType) {
            continue;
         }
         registry.registerMenuAction(NEW_ELEMENT_NAV_MENU, {
            commandId: template.id,
            label: template.label + '...',
            order: id.toString()
         });
      }

      registry.registerMenuAction(NavigatorContextMenu.NAVIGATION, {
         commandId: DERIVE_MAPPING_FROM_ENTITY.id,
         label: DERIVE_MAPPING_FROM_ENTITY.label + '...'
      });

      // main menu bar
      registry.registerSubmenu(NEW_ELEMENT_MAIN_MENU, TEMPLATE_CATEGORY, { sortString: '1' });
      for (const [id, template] of NEW_ELEMENT_TEMPLATES.entries()) {
         registry.registerMenuAction(NEW_ELEMENT_MAIN_MENU, {
            commandId: template.id,
            label: template.label + '...',
            order: id.toString()
         });
      }

      // editor context menu
      registry.registerMenuAction(EditorContextMenu.COMMANDS, { commandId: DERIVE_MAPPING_FROM_ENTITY.id });
   }

   protected async getTargetDirectory(source: URI, targetType: ModelFileType): Promise<URI | undefined> {
      const selectedDirectory = await this.getDirectory(source);
      if (!selectedDirectory) {
         return;
      }
      // we allow data models to be created anywhere in the workspace
      if (targetType === DataModelType) {
         return selectedDirectory.resource;
      }
      // other model elements should be in their respective folder
      const dataModel = await this.modelService.getDataModelInfo({ contextUri: source.toString() });
      if (!dataModel) {
         this.messageService.error('Could not determine data model for ' + source.path.fsPath());
         return;
      }
      const targetTypeDirectory = URI.fromFilePath(dataModel.directory).resolve(ModelFileType.getFolder(targetType));
      // if the user selected a sub-directory in the correct target type directory, we use that
      return targetTypeDirectory.isEqualOrParent(selectedDirectory.resource) ? selectedDirectory.resource : targetTypeDirectory;
   }

   protected async deriveNewMappingFile(entityUri: URI): Promise<void> {
      const targetDirectory = await this.getTargetDirectory(entityUri, MappingType);
      if (!targetDirectory) {
         return;
      }

      const mappingTargetElements = await this.getMappingTargetElements(targetDirectory);
      const sourceEntityElement = mappingTargetElements.find(element => element.uri === entityUri.toString());
      if (!sourceEntityElement) {
         this.messageService.error('Could not detect source entity at ' + entityUri.path.fsPath());
         return;
      }

      const initialName = await this.generateUniqueMappingName(sourceEntityElement.label, targetDirectory, mappingTargetElements);
      const targetOptions = Object.fromEntries(mappingTargetElements.map(e => [e.label, e.label]));

      const options = await getGridInputOptions(
         {
            title: 'New Mapping...',
            parentUri: targetDirectory,
            inputs: [
               { id: 'name', label: 'Name', value: initialName, placeholder: 'MappingName' },
               {
                  id: 'target',
                  label: 'Target',
                  options: targetOptions,
                  value: sourceEntityElement.label,
                  onValueChange: async (targetValue: string, updateName: (name: string) => void) => {
                     const selectedEntity = mappingTargetElements.find(e => e.label === targetValue);
                     if (selectedEntity) {
                        const uniqueName = await this.generateUniqueMappingName(
                           selectedEntity.label,
                           targetDirectory,
                           mappingTargetElements
                        );
                        updateName(uniqueName);
                     }
                  }
               }
            ] as const,
            validate: value => {
               const name = JSON.parse(value).name ?? '';
               return name && this.validateElementFileName(join(targetDirectory, name, ModelFileExtensions.Mapping), name);
            }
         },
         this.labelProvider
      );

      if (!options) {
         return;
      }

      const selectedEntityElement = mappingTargetElements.find(element => element.label === options.target);
      if (!selectedEntityElement) {
         this.messageService.error('Could not detect target element at ' + entityUri.path.fsPath());
         return;
      }

      const document = await this.modelService.request(selectedEntityElement.uri);
      const entity = document?.root.entity;
      if (!entity) {
         this.messageService.error('Could not resolve entity element at ' + entityUri.path.fsPath());
         return;
      }

      const fileName = applyFileExtension(options.name, ModelFileExtensions.Mapping);
      const mappingUri = targetDirectory.resolve(fileName);
      const mappingName = toPascal(removeFileExtension(options.name, ModelFileExtensions.Mapping));

      const mapping = {
         mapping: {
            id: mappingName,
            target: {
               entity: toIdReference(options.target)
            }
         }
      };
      const content = yaml.stringify(mapping, { indent: 4 });
      await this.fileService.create(mappingUri, content);
      this.fireCreateNewFile({ parent: targetDirectory, uri: mappingUri });
      open(this.openerService, mappingUri);
   }

   protected async createNewElementFile(uri: URI, template: NewElementTemplate): Promise<void> {
      const targetDirectory = await this.getTargetDirectory(uri, template.memberType);
      if (!targetDirectory) {
         return;
      }
      if (template.memberType === LogicalEntityType || template.memberType === RelationshipType || template.memberType === DataModelType) {
         const fileUri = template.toUri(targetDirectory, '');
         const content =
            typeof template.content === 'string' ? template.content : await template.content(targetDirectory, this.modelService, {});
         const resource = await this.getUntitledResource(fileUri, content);
         await open(this.openerService, resource.uri);
      } else {
         const options = await this.getMemberOptions(
            {
               title: 'New ' + template.label + '...',
               parentUri: targetDirectory,
               initialValue: 'New' + template.label,
               placeholder: 'New ' + template.label
            },
            template,
            targetDirectory
         );
         if (!options) {
            return;
         }
         const { fileUri, content } = options;
         await this.fileService.create(fileUri, content);
         this.fireCreateNewFile({ parent: targetDirectory, uri: fileUri });
         open(this.openerService, fileUri);
      }
   }

   protected async getMappingTargetElements(parent: URI): Promise<any[]> {
      return this.modelService.findReferenceableElements({
         container: { uri: parent.toString(), type: MappingType },
         syntheticElements: [{ property: 'target', type: TargetObjectType }],
         property: 'entity'
      });
   }

   protected async generateUniqueMappingName(entityLabel: string, targetDirectory: URI, elements: any[]): Promise<string> {
      const baseName = `${entityLabel}Mapping`;
      const existingNames = new Set(elements.map(e => e.label));
      let uniqueName = findNextUnique(baseName, Array.from(existingNames), name => name);

      while (await this.fileService.exists(targetDirectory.resolve(applyFileExtension(uniqueName, ModelFileExtensions.Mapping)))) {
         existingNames.add(uniqueName);
         uniqueName = findNextUnique(baseName, Array.from(existingNames), name => name);
      }

      return uniqueName;
   }

   protected async getMemberOptions(
      baseProps: WorkspaceInputDialogProps,
      template: NewElementTemplate,
      parent: URI
   ): Promise<{ fileUri: URI; content: string } | undefined> {
      let inputs = (await template.getInputOptions?.(parent, this.modelService)) ?? [{ id: 'name', label: 'Name' }];

      if (template.memberType === MappingType) {
         const mappingTargetElements = await this.getMappingTargetElements(parent);
         if (mappingTargetElements.length > 0) {
            const initialName = await this.generateUniqueMappingName(mappingTargetElements[0].label, parent, mappingTargetElements);
            inputs = inputs.map(input => {
               if (input.id === 'name') {
                  return { ...input, value: initialName };
               }
               if (input.id === 'target') {
                  return {
                     ...input,
                     value: mappingTargetElements[0].label,
                     onValueChange: async (targetValue: string, updateName: (name: string) => void) => {
                        const entity = mappingTargetElements.find(e => e.label === targetValue);
                        if (entity) {
                           updateName(await this.generateUniqueMappingName(entity.label, parent, mappingTargetElements));
                        }
                     }
                  };
               }
               return input;
            });
         }
      }

      const options = await getGridInputOptions(
         {
            ...baseProps,
            inputs,
            validate: value => {
               const name = JSON.parse(value).name ?? '';
               return name && (template.validateName?.(name) || this.validateFile(template.toUri(parent, name)));
            }
         },
         this.labelProvider
      );
      if (!options) {
         return undefined;
      }
      const fileUri = template.toUri(parent, options.name);
      const content = typeof template.content === 'string' ? template.content : await template.content(parent, this.modelService, options);
      return { fileUri, content };
   }

   protected async getUntitledResource(fileUri: URI, content: string): Promise<Resource> {
      let untitledUri = fileUri.withScheme(UNTITLED_SCHEME);
      let suffix = 1;
      while (this.untitledResources.has(untitledUri)) {
         const base = untitledUri.path.base;
         const pivot = base.indexOf('.');
         untitledUri = untitledUri.parent.resolve(`${base.slice(0, pivot)}${suffix++}${base.slice(pivot)}`);
      }
      return this.untitledResources.createUntitledResource(content, undefined, untitledUri);
   }

   protected async validateElementFileName(file: URI, name: string): Promise<DialogError> {
      // we automatically name some part in the initial code after the given name so ensure it is an ID
      if (!CrossModelTerminals.ID.test(name)) {
         return nls.localizeByDefault(`'${name}' is not a valid name, must match: ${CrossModelTerminals.ID}.`);
      }
      return this.validateFile(file);
   }

   protected validateFile(file: URI): Promise<string> | string {
      const root = this.workspaceService.tryGetRoots().find(candidate => candidate.resource.isEqualOrParent(file));
      const relativeName = root?.resource.relative(file)?.toString();
      if (!relativeName || !root) {
         return 'Intended destination is outside the workspace.';
      }
      return this.validateFileName(relativeName, root, true);
   }
}

@injectable()
export class CrossModelFileNavigatorContribution extends FileNavigatorContribution {
   @inject(ModelService) modelService: ModelService;
   @inject(CrossModelWorkspaceContribution) protected readonly workspaceContribution: CrossModelWorkspaceContribution;

   static readonly EXPAND_NEW_FILE_COMMAND = {
      id: '_crossmodel.expandNavigatorForNewFile'
   };

   override registerCommands(registry: CommandRegistry): void {
      super.registerCommands(registry);

      // Internal command to expand the navigator for a newly created file
      // This command is not exposed in menus/command palette - it's only used internally
      registry.registerCommand(CrossModelFileNavigatorContribution.EXPAND_NEW_FILE_COMMAND, {
         execute: (parentUri?: string, uri?: string) => {
            if (!parentUri || !uri) {
               return;
            }
            try {
               const parent = new URI(parentUri);
               const file = new URI(uri);
               this.workspaceContribution.expandNavigatorForNewFile(parent, file);
            } catch (e) {
               // ignore invalid input
            }
         }
      });

      for (const template of NEW_ELEMENT_TEMPLATES) {
         registry.registerCommand(
            { ...template, label: undefined, id: template.id + '.toolbar' },
            {
               execute: (widget: any) =>
                  this.withWidget(widget, navigator => {
                     const uri = UriSelection.getUri(navigator.model.selectedNodes);
                     return registry.executeCommand(template.id, uri);
                  }),
               isEnabled: widget =>
                  this.withWidget(
                     widget,
                     navigator =>
                        this.workspaceService.opened &&
                        doesTemplateFitPackage(UriSelection.getUri(navigator.model.selectedNodes), this.modelService, template)
                  ),
               isVisible: widget =>
                  this.withWidget(
                     widget,
                     navigator =>
                        this.workspaceService.opened &&
                        doesTemplateFitPackage(UriSelection.getUri(navigator.model.selectedNodes), this.modelService, template)
                  )
            }
         );
      }
   }

   override async registerToolbarItems(toolbarRegistry: TabBarToolbarRegistry): Promise<void> {
      super.registerToolbarItems(toolbarRegistry);

      for (const [id, template] of NEW_ELEMENT_TEMPLATES.entries()) {
         toolbarRegistry.registerItem({
            id: template.id + '.toolbar',
            command: template.id + '.toolbar',
            tooltip: 'New ' + template.label + '...',
            priority: 2,
            order: id.toString(),
            onDidChange: this.selectionService.onSelectionChanged
         });
      }
   }
}

function doesTemplateFitPackage(target: URI | undefined, modelService: ModelService, template: NewElementTemplate): boolean {
   if (!target) {
      // no selection equals root level, where we allow only data models
      return template.memberType === DataModelType;
   }
   const surroundingDataModel = modelService.dataModels.find(candidate => URI.fromFilePath(candidate.directory).isEqualOrParent(target));
   if (!surroundingDataModel) {
      // only data models can be created outside of an existing data model package
      return template.memberType === DataModelType;
   }
   // avoid nesting data models
   return template.memberType !== DataModelType && isMemberPermittedInModel(surroundingDataModel.type, template.memberType);
}

function applyFileExtension(name: string, fileExtension: string): string {
   return name.endsWith(fileExtension) ? name : name + fileExtension;
}

function removeFileExtension(name: string, fileExtension: string): string {
   return name.endsWith(fileExtension) ? name.slice(0, -fileExtension.length) : name;
}

function join(parent: URI, name: string, ext: string): URI {
   return parent.resolve(applyFileExtension(name, ext));
}

function validateObjectName(input: string): string | undefined {
   const asId = toId(input);
   if (!CrossModelTerminals.ID.test(asId)) {
      return `Derived ID '${asId}' does not match '${CrossModelTerminals.ID}'.`;
   }
   return undefined;
}

function validateDataModelName(input: string): string | undefined {
   if (!CrossModelTerminals.ID.test(input)) {
      return `Data Model ID '${input}' does not match '${CrossModelTerminals.ID}'.`;
   }
   return undefined;
}

function folderNameForMemberType(memberType: ModelFileType | string): string {
   try {
      const folder = ModelFileType.getFolder(memberType as ModelFileType);
      if (folder) {
         return folder;
      }
   } catch {
      // fall through to explicit mapping below
   }
   if (memberType === LogicalEntityType) {
      return 'entities';
   }
   if (memberType === RelationshipType) {
      return 'relationships';
   }
   if (memberType === MappingType) {
      return 'mappings';
   }
   if (memberType === 'SystemDiagram') {
      return 'diagrams';
   }
   return '';
}

function isSelectedModelFolder(target: URI | undefined, modelService: ModelService, template: NewElementTemplate): boolean {
   if (!target) {
      return false;
   }
   const expectedFolder = folderNameForMemberType(template.memberType).toLowerCase();
   if (!expectedFolder) {
      return false;
   }

   const surroundingDataModel = modelService.dataModels.find(candidate => URI.fromFilePath(candidate.directory).isEqualOrParent(target));
   if (surroundingDataModel) {
      const folderUri = URI.fromFilePath(surroundingDataModel.directory).resolve(expectedFolder);
      if (target.isEqual(folderUri)) {
         return true;
      }
   }

   // Fallback: check the selected folder's base name
   const base = target.path.base.toLowerCase();
   if (base === expectedFolder) {
      return true;
   }

   return false;
}
