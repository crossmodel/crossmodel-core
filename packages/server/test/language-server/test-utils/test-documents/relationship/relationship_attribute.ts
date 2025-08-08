/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

/** Valid relationship with attribute */
export const relationship_with_attribute = `relationship: 
    id: Order_CustomerWithAttribute
    name: "Order - Customer - WithAttribute"
    parent: Customer
    child: Order
    attributes:
        - parent: Customer.Id
          child: Order.CustomerId`;

/** Relationship with invalid attribute (wrong entity) */
export const relationship_with_attribute_wrong_entity = `relationship: 
    id: Order_CustomerWithAttributeWrongEntity
    name: "Order - Customer - WithAttributeWrongEntity"
    parent: Customer
    child: Order
    attributes:
        - parent: Customer.Id
          child: Order.Address`;

/** Relationship with invalid attribute (duplicates) */
export const relationship_with_duplicate_attributes = `relationship: 
    id: Order_CustomerWithDuplicateAttributes
    name: "Order - Customer - WithDuplicateAttributes"
    parent: Customer
    child: Order
    attributes:
        - parent: Customer.Id
          child: Order.CustomerId
        - parent: Customer.Id
          child: Order.CustomerId`;
