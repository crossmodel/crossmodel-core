import '../terminals'
import '../common'
import '../conceptual/business-rule'
import '../conceptual/entity'
import './entity'

interface LogicalBusinessRule extends BehaviouralDataElementContainer, WithCustomProperties {
    conceptualRule?: @ConceptualBusinessRule;
    expression?: string;
}

LogicalBusinessRule returns LogicalBusinessRule:
    'logicalBusinessRule' ':'
        INDENT
            NamedObjectFragment
            ('conceptualRule' ':' conceptualRule=[ConceptualBusinessRule:IDReference])?
            ('expression' ':' expression=STRING)?
            CustomPropertiesFragment?
        DEDENT
;
