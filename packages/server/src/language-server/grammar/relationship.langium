import 'terminals'
import 'common'
import 'entity'

// --- Relationship Definition (type definition for relationships) ---

interface RelationshipDefinition extends ObjectDefinition {
    parentCardinality?: string;
    childCardinality?: string;
}

RelationshipDefinition returns RelationshipDefinition:
    'relationshipDefinition' ':'
        INDENT
            NamedObjectFragment
            (abstract?='abstract' ':' ('TRUE' | 'true'))?
            ('extends' ':' extends=[RelationshipDefinition:IDReference])?
            ('parentCardinality' ':' parentCardinality=Cardinality)?
            ('childCardinality' ':' childCardinality=Cardinality)?
            CustomPropertiesFragment?
        DEDENT
;

// --- Relationship ---

interface Relationship extends DataElementContainerLink, WithCustomProperties {
    parent?: @LogicalEntity
    parentRole?: string
    parentCardinality?: string
    child?: @LogicalEntity
    childRole?: string
    childCardinality?: string
    attributes: RelationshipAttribute[]
}

Relationship returns Relationship:
    'relationship' ':'
        INDENT
            TypedObjectFragment
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
    parent?: @LogicalAttribute
    child?: @LogicalAttribute
}

RelationshipAttribute returns RelationshipAttribute:
    'parent' ':' (parent=[LogicalAttribute:IDReference])?
    'child' ':' (child=[LogicalAttribute:IDReference])?
    CustomPropertiesFragment?
;
