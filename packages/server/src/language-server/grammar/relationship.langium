import 'terminals'
import 'common'
import 'entity'

// Relationship definition
interface Relationship extends DataElementContainerLink, WithCustomProperties {
    parent?: @LogicalEntity
    parentRole?: string
    parentCardinality?: string
    child?: @LogicalEntity
    childRole?: string
    childCardinality?: string
    attributes: RelationshipAttribute[]
}

Cardinality returns string:
    '0..1' | '1..1' | '0..N' | '1..N';

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
            CustomPropertiesFragment?
        DEDENT
;

interface RelationshipAttribute extends WithCustomProperties {
    parent?: @LogicalEntityAttribute
    child?: @LogicalEntityAttribute
}

RelationshipAttribute returns RelationshipAttribute:
    'parent' ':' (parent=[LogicalEntityAttribute:IDReference])?
    'child' ':' (child=[LogicalEntityAttribute:IDReference])?
    CustomPropertiesFragment?
;
