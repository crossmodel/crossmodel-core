import '../terminals'
import '../common'
import './entity'

interface ConceptualRelationship extends DataElementContainerLink, WithCustomProperties {
    parent?: @ConceptualEntity;
    parentRole?: string;
    parentCardinality?: string;
    child?: @ConceptualEntity;
    childRole?: string;
    childCardinality?: string;
}

ConceptualRelationship returns ConceptualRelationship:
    'conceptualRelationship' ':'
        INDENT
            NamedObjectFragment
            ('parent' ':' parent=[ConceptualEntity:IDReference])?
            ('parentRole' ':' parentRole=STRING)?
            ('parentCardinality' ':' parentCardinality=Cardinality)?
            ('child' ':' child=[ConceptualEntity:IDReference])?
            ('childRole' ':' childRole=STRING)?
            ('childCardinality' ':' childCardinality=Cardinality)?
            CustomPropertiesFragment?
        DEDENT
;
