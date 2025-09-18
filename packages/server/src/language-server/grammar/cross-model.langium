grammar CrossModel

import 'datamodel'
import 'conceptual/entity'
import 'conceptual/relationship'
import 'conceptual/business-rule'
import 'logical/entity'
import 'logical/relationship'
import 'system-diagram'
import 'logical/mapping'
import 'physical/physical'
import 'physical/relational/table'
import 'physical/relational/view'
import 'physical/relational/foreign-key'
import 'physical/relational/primary-key'
import 'physical/document/document'
import 'logical/logical-business-rule'

entry CrossModelRoot:
    (datamodel=DataModel |
    conceptualEntity=ConceptualEntity |
    conceptualRelationship=ConceptualRelationship |
    conceptualBusinessRule=ConceptualBusinessRule |
    entity=LogicalEntity |
    relationship=Relationship |
    logicalBusinessRule=LogicalBusinessRule |
    systemDiagram=SystemDiagram |
    mapping=Mapping |
    relationalTable=RelationalTable |
    relationalView=RelationalView |
    documentCollection=DocumentCollection |
    foreignKey=ForeignKey |
    primaryKey=PrimaryKey)?;
