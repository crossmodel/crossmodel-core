import '../terminals'
import '../common'
import '../conceptual/entity'
import '../conceptual/relationship'
import './entity'

// Relationship definition
interface Relationship extends DataElementContainerLink, WithCustomProperties {
    parent?: @LogicalEntity
    parentRole?: string
    parentCardinality?: string
    child?: @LogicalEntity
    childRole?: string
    childCardinality?: string
    attributes: RelationshipAttribute[]
    conceptualRelationship?: @ConceptualRelationship
}

Relationship returns Relationship:
    'relationship' ':'
        INDENT
            NamedObjectFragment
            ('parent' ':' parent=[LogicalEntity:IDReference])?
            ('parentRole' ':' parentRole=STRING)?
            ('parentCardinality' ':' parentCardinality=Cardinality)?
            ('child' ':' child=[LogicalEntity:IDReference])?
            ('childRole' ':' childRole=STRING)?
            ('childCardinality' ':' childCardinality=Cardinality)?
            ('attributes' ':'
                INDENT
                    (LIST_ITEM attributes+=RelationshipAttribute)+
                DEDENT
            )?
            ('conceptualRelationship' ':' conceptualRelationship=[ConceptualRelationship:IDReference])?
            CustomPropertiesFragment?
        DEDENT
;

interface RelationshipAttribute extends WithCustomProperties {
    parent?: @LogicalAttribute
    child?: @LogicalAttribute
}

RelationshipAttribute returns RelationshipAttribute:
    'parent' ':' (parent=[LogicalAttribute:IDReference])?
    'child' ':' (child=[LogicalAttribute:IDReference])?
    CustomPropertiesFragment?
;
