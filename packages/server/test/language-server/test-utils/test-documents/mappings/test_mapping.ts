/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
export const test_mapping = `mapping:
    id: TestMapping
    sources:
      - id: CustomerSource
        entity: Customer
        join: from
      - id: OrderSource
        entity: Order
        join: inner-join
        dependencies:
          - CustomerSource
        conditions:
          - OrderSource.CustomerId = CustomerSource.Id
    target:
        entity: TargetEntity
        mappings:
          - attribute: Name
            sources:
              - CustomerSource.FirstName
              - CustomerSource.LastName
            expressions:
              - language: "SQL"
                expression: "CONCAT({{CustomerSource.FirstName}}, ' ', {{CustomerSource.LastName}})"
          - attribute: OrderCount
            expressions:
              - language: "SQL"
                expression: "COUNT(1)"`;
