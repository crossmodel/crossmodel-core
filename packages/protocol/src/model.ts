/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

export const DATAMODEL_FILE = 'datamodel.cm';

const ModelFileTypeValues = {
   Generic: 'Generic',
   DataModel: 'DataModel',
   LogicalEntity: 'LogicalEntity',
   Relationship: 'Relationship',
   Mapping: 'Mapping',
   SystemDiagram: 'SystemDiagram'
} as const;

export const ModelFileType = {
   ...ModelFileTypeValues,
   getIconClass: (type?: ModelFileType) => {
      switch (type) {
         case 'DataModel':
            return ModelStructure.DataModel.ICON_CLASS;
         case 'LogicalEntity':
            return ModelStructure.LogicalEntity.ICON_CLASS;
         case 'Relationship':
            return ModelStructure.Relationship.ICON_CLASS;
         case 'SystemDiagram':
            return ModelStructure.SystemDiagram.ICON_CLASS;
         case 'Mapping':
            return ModelStructure.Mapping.ICON_CLASS;
         default:
            return undefined;
      }
   },
   getFolder: (fileType?: ModelFileType): string => {
      switch (fileType) {
         case 'LogicalEntity':
            return ModelStructure.LogicalEntity.FOLDER;
         case 'Relationship':
            return ModelStructure.Relationship.FOLDER;
         case 'SystemDiagram':
            return ModelStructure.SystemDiagram.FOLDER;
         case 'Mapping':
            return ModelStructure.Mapping.FOLDER;
         default:
            return '';
      }
   },
   getFileExtension: (type?: ModelFileType): string => {
      switch (type) {
         case 'DataModel':
            return ModelFileExtensions.DataModel;
         case 'LogicalEntity':
            return ModelFileExtensions.LogicalEntity;
         case 'Generic':
            return ModelFileExtensions.Generic;
         case 'Mapping':
            return ModelFileExtensions.Mapping;
         case 'Relationship':
            return ModelFileExtensions.Relationship;
         case 'SystemDiagram':
            return ModelFileExtensions.SystemDiagram;
         default:
            return '';
      }
   }
} as const;
export type ModelFileType = (typeof ModelFileTypeValues)[keyof typeof ModelFileTypeValues];

export const ModelFileExtensions = {
   Generic: '.cm',
   DataModel: '.cm',
   LogicalEntity: '.entity.cm',
   Relationship: '.relationship.cm',
   Mapping: '.mapping.cm',
   SystemDiagram: '.system-diagram.cm',
   /* @deprecated Use SystemDiagram instead */
   Diagram: '.diagram.cm',

   isModelFile(uri: string): boolean {
      return uri.endsWith(this.Generic);
   },

   isDataModelFile(uri: string): boolean {
      return uri.endsWith(DATAMODEL_FILE);
   },

   isEntityFile(uri: string): boolean {
      return uri.endsWith(this.LogicalEntity);
   },

   isRelationshipFile(uri: string): boolean {
      return uri.endsWith(this.Relationship);
   },

   isMappingFile(uri: string): boolean {
      return uri.endsWith(this.Mapping);
   },

   isSystemDiagramFile(uri: string): boolean {
      return uri.endsWith(this.SystemDiagram) || uri.endsWith(this.Diagram);
   },

   getName(uri: string): string {
      // since we have file extensions with two '.', we cannot use the default implementation that only works for one '.'
      if (uri.endsWith(this.LogicalEntity)) {
         return uri.substring(0, uri.length - this.LogicalEntity.length);
      }
      if (uri.endsWith(this.Relationship)) {
         return uri.substring(0, uri.length - this.Relationship.length);
      }
      if (uri.endsWith(this.Mapping)) {
         return uri.substring(0, uri.length - this.Mapping.length);
      }
      if (uri.endsWith(this.SystemDiagram)) {
         return uri.substring(0, uri.length - this.SystemDiagram.length);
      }
      if (uri.endsWith(this.Diagram)) {
         return uri.substring(0, uri.length - this.Diagram.length);
      }
      const lastIndex = uri.lastIndexOf('/');
      const extIndex = uri.lastIndexOf('.');
      return uri.substring(lastIndex + 1, extIndex);
   },

   getFileType(uri: string): ModelFileType | undefined {
      if (this.isDataModelFile(uri)) {
         return 'DataModel';
      }
      if (this.isMappingFile(uri)) {
         return 'Mapping';
      }
      if (this.isSystemDiagramFile(uri)) {
         return 'SystemDiagram';
      }
      if (this.isRelationshipFile(uri)) {
         return 'Relationship';
      }
      if (this.isEntityFile(uri)) {
         return 'LogicalEntity';
      }
      if (this.isModelFile(uri)) {
         return 'Generic';
      }
      return undefined;
   },

   getFileExtension(uri: string): string | undefined {
      return ModelFileType.getFileExtension(this.getFileType(uri));
   },

   getIconClass(uri: string): string | undefined {
      return ModelFileType.getIconClass(this.getFileType(uri));
   },

   getFolder(uri: string): string {
      return ModelFileType.getFolder(this.getFileType(uri));
   },

   detectFileType(content: string): ModelFileType | undefined {
      if (content.startsWith('entity')) {
         return 'LogicalEntity';
      }
      if (content.startsWith('relationship')) {
         return 'Relationship';
      }
      if (content.startsWith('systemDiagram') || content.startsWith('diagram')) {
         return 'SystemDiagram';
      }
      if (content.startsWith('mapping')) {
         return 'Mapping';
      }
      return undefined;
   },

   detectFileExtension(content: string): string | undefined {
      const type = this.detectFileType(content);
      return type ? this.detectFileExtension(type) : undefined;
   }
} as const;

export const ModelStructure = {
   LogicalEntity: {
      FOLDER: 'entities',
      ICON_CLASS: 'codicon codicon-git-commit',
      ICON: 'git-commit'
   },

   Relationship: {
      FOLDER: 'relationships',
      ICON_CLASS: 'codicon codicon-git-compare',
      ICON: 'git-compare'
   },

   SystemDiagram: {
      FOLDER: 'diagrams',
      ICON_CLASS: 'codicon codicon-type-hierarchy-sub',
      ICON: 'type-hierarchy-sub'
   },

   Mapping: {
      FOLDER: 'mappings',
      ICON_CLASS: 'codicon codicon-group-by-ref-type',
      ICON: 'group-by-ref-type'
   },
   DataModel: {
      FILE: DATAMODEL_FILE,
      ICON_CLASS: 'codicon codicon-globe',
      ICON: 'globe'
   }
};
