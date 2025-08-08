import 'terminals'
import 'common'
import 'entity'
import 'relationship'

// Diagram definition
interface SystemDiagram extends IdentifiedObject {
    nodes: LogicalEntityNode[];
    edges: SystemDiagramEdge[];
}

SystemDiagram returns SystemDiagram:
    ('systemDiagram' | 'diagram') ':' 
    INDENT
        IdentifiedObjectFragment
        ('nodes' ':'
            INDENT 
                (LIST_ITEM nodes+=LogicalEntityNode)+
            DEDENT
        )?
        ('edges' ':'
            INDENT 
                (LIST_ITEM edges+=SystemDiagramEdge)+
            DEDENT
        )?
    DEDENT
;

interface LogicalEntityNode extends IdentifiedObject {
    entity: @LogicalEntity;
    x: number;
    y: number;
    width: number;
    height: number;
}

LogicalEntityNode returns LogicalEntityNode:
    IdentifiedObjectFragment
    'entity' ':' entity=[LogicalEntity:IDReference]
    'x' ':' x=NUMBER
    'y' ':' y=NUMBER
    'width' ':' width=NUMBER
    'height' ':' height=NUMBER
;

interface LogicalEntityNodeAttribute extends LogicalAttribute {
}

interface SystemDiagramEdge extends IdentifiedObject {}

SystemDiagramEdge returns SystemDiagramEdge:
    RelationshipEdge | InheritanceEdge
;

interface RelationshipEdge extends SystemDiagramEdge {
    relationship: @Relationship;
    sourceNode: @LogicalEntityNode;
    targetNode: @LogicalEntityNode;
}

RelationshipEdge returns RelationshipEdge:
    IdentifiedObjectFragment
    'relationship' ':' relationship=[Relationship:IDReference]
    'sourceNode' ':' sourceNode=[LogicalEntityNode:IDReference]
    'targetNode' ':' targetNode=[LogicalEntityNode:IDReference]
;

interface InheritanceEdge extends SystemDiagramEdge {
    baseNode: @LogicalEntityNode;
    superNode: @LogicalEntityNode;
}

InheritanceEdge returns InheritanceEdge:
    IdentifiedObjectFragment
    'baseNode' ':' baseNode=[LogicalEntityNode:IDReference]
    'superNode' ':' superNode=[LogicalEntityNode:IDReference]
;
