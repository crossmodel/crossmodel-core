grammar CrossModel

import 'logical/logical'

entry CrossModelRoot:
    (datamodel=DataModel | 
    entity=LogicalEntity | 
    relationship=Relationship | 
    systemDiagram=SystemDiagram |
    mapping=Mapping)?;
