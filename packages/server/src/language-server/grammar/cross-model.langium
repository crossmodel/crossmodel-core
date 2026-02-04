grammar CrossModel

import 'datamodel'
import 'entity'
import 'relationship'
import 'system-diagram'
import 'mapping'
import 'objectdefinition'

entry CrossModelRoot:
    (datamodel=DataModel |
    entity=LogicalEntity |
    relationship=Relationship |
    systemDiagram=SystemDiagram |
    mapping=Mapping |
    objectDefinition=ObjectDefinition |
    objectDefinition=AttributeDefinition |
    objectDefinition=EntityDefinition |
    objectDefinition=RelationshipDefinition |
    objectDefinition=IdentifierDefinition |
    objectDefinition=DataModelDefinition)?;
