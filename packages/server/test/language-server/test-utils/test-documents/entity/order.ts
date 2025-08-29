/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
export const order = `entity:
    id: Order
    name: "Order"
    description: "Order placed by a customer in the Customer table."
    attributes:
      - id: Id
        name: "Id"
        datatype: "Integer"
      - id: OrderDate
        name: "OrderDate"
        datatype: "Integer"
      - id: OrderNumber
        name: "OrderNumber"
        datatype: "Text"
      - id: CustomerId
        name: "CustomerId"
        datatype: "Integer"
      - id: TotalAmount
        name: "TotalAmount"
        datatype: "Decimal"`;
