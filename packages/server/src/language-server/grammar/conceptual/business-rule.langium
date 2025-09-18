import '../terminals'
import '../common'
import './entity'

interface ConceptualBusinessRule extends BehaviouralDataElementContainer, WithCustomProperties {
    appliesTo: @ConceptualEntity[];
    expression?: string;
    priority?: number;
}

ConceptualBusinessRule returns ConceptualBusinessRule:
    'conceptualBusinessRule' ':'
        INDENT
            NamedObjectFragment
            ('appliesTo' ':'
                INDENT
                    (LIST_ITEM appliesTo+=[ConceptualEntity:IDReference])+
                DEDENT
            )?
            ('expression' ':' expression=STRING)?
            ('priority' ':' priority=NUMBER)?
            CustomPropertiesFragment?
        DEDENT
;
