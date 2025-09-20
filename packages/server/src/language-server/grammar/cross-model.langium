grammar CrossModel

import 'logical/datamodel'
import 'logical/entity'
import 'logical/relationship'
import 'logical/system-diagram'
import 'logical/mapping'

entry CrossModelRoot:
    (datamodel=DataModel | 
    entity=LogicalEntity | 
    relationship=Relationship | 
    systemDiagram=SystemDiagram |
    mapping=Mapping)?;
