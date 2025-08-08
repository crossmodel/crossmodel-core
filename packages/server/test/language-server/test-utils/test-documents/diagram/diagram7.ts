/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
export const diagram7 = `systemDiagram:
    id: Systemdiagram1
    nodes:
      - id: CustomerNode
        entity: Customer
        x: 100
        y: 100
        width: 100
        height: 100
      - id: SubCustomerNode
        entity: SubCustomer
        x: 400
        y: 150
        width: 100
        height: 100
    edges:
      - id: SubCustomerInheritanceEdge
        baseNode: SubCustomerNode
        superNode: CustomerNode`;
