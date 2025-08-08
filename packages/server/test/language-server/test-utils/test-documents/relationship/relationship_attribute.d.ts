/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
/** Valid relationship with attribute */
export declare const relationship_with_attribute = "relationship: \n    id: Order_CustomerWithAttribute\n    name: \"Order - Customer - WithAttribute\"\n    parent: Customer\n    child: Order\n    attributes:\n        - parent: Customer.Id\n          child: Order.CustomerId";
/** Relationship with invalid attribute (wrong entity) */
export declare const relationship_with_attribute_wrong_entity = "relationship: \n    id: Order_CustomerWithAttributeWrongEntity\n    name: \"Order - Customer - WithAttributeWrongEntity\"\n    parent: Customer\n    child: Order\n    attributes:\n        - parent: Customer.Id\n          child: Order.Address";
/** Relationship with invalid attribute (duplicates) */
export declare const relationship_with_duplicate_attributes = "relationship: \n    id: Order_CustomerWithDuplicateAttributes\n    name: \"Order - Customer - WithDuplicateAttributes\"\n    parent: Customer\n    child: Order\n    attributes:\n        - parent: Customer.Id\n          child: Order.CustomerId\n        - parent: Customer.Id\n          child: Order.CustomerId";
//# sourceMappingURL=relationship_attribute.d.ts.map