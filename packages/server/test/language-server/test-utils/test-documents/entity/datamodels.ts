/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
export const dataModelA = `datamodel:
    id: DataModelA
    name: "DataModel A"
    description: "Test DataModel A"
    type: logical
    version: 1.0.0`;

export const dataModelB = `datamodel:
    id: DataModelB
    name: "DataModel B"
    description: "Test DataModel B"
    type: logical
    version: 1.0.0
    dependencies:
      - datamodel: DataModelA
        version: 1.0.0`;
