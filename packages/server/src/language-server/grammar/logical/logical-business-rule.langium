import '../terminals'
import '../common'
import '../conceptual/business-rule'
import '../conceptual/entity'
import './entity'

interface LogicalBusinessRule extends BehaviouralDataElementContainer, WithCustomProperties {
    conceptualRule?: @ConceptualBusinessRule;
    appliesTo: @LogicalEntity[];
    expression?: string;
    priority?: number;
}

LogicalBusinessRule returns LogicalBusinessRule:
    'logicalBusinessRule' ':'
        INDENT
            NamedObjectFragment
            ('conceptualRule' ':' conceptualRule=[ConceptualBusinessRule:IDReference])?
            ('appliesTo' ':'
                INDENT
                    (LIST_ITEM appliesTo+=[LogicalEntity:IDReference])+
                DEDENT
            )?
            ('expression' ':' expression=STRING)?
            ('priority' ':' priority=NUMBER)?
            CustomPropertiesFragment?
        DEDENT
;
