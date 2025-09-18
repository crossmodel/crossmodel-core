import '../terminals'
import '../common'
import './business-rule'

interface ConceptualEntity extends StructuralDataElementContainer, WithCustomProperties {
    attributes: ConceptualAttribute[];
    superEntities: @ConceptualEntity[];
    businessRules: @ConceptualBusinessRule[];
    domain?: string;
    status?: string;
    businessOwner?: string;
}

ConceptualEntity returns ConceptualEntity:
    'conceptualEntity' ':'
        INDENT
            NamedObjectFragment
            ('domain' ':' domain=STRING)?
            ('status' ':' status=STRING)?
            ('businessOwner' ':' businessOwner=STRING)?
            ('inherits' ':'
                INDENT
                    (LIST_ITEM superEntities+=[ConceptualEntity:IDReference])+
                DEDENT
            )?
            ('attributes' ':'
                INDENT
                    (LIST_ITEM attributes+=ConceptualAttribute)+
                DEDENT
            )?
            ('businessRules' ':'
                INDENT
                    (LIST_ITEM businessRules+=[ConceptualBusinessRule:IDReference])+
                DEDENT
            )?
            CustomPropertiesFragment?
        DEDENT
;

interface ConceptualAttribute extends DataElement, WithCustomProperties {
    required?: boolean;
    businessDefinition?: string;
}

ConceptualAttribute returns ConceptualAttribute:
    NamedObjectFragment
    ('datatype' ':' datatype=STRING)?
    ('required' ':' (required?=('TRUE' | 'true'))?)?
    ('businessDefinition' ':' businessDefinition=STRING)?
    CustomPropertiesFragment?
;
