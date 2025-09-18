import '../../terminals'
import '../../common'
import '../../logical/entity'
import '../physical'
import './table'

interface RelationalView extends PhysicalBehaviouralDataElementContainer {
    columns: RelationalColumn[];
    definition?: string;
}

RelationalView returns RelationalView:
    'view' ':'
        INDENT
            NamedObjectFragment
            ('relatedLogicalDataElementContainers' ':'
                INDENT
                    (LIST_ITEM relatedLogicalDataElementContainers+=[LogicalEntity:IDReference])+
                DEDENT
            )?
            ('definition' ':' definition=STRING)?
            ('columns' ':'
                INDENT
                    (LIST_ITEM columns+=RelationalColumn)+
                DEDENT
            )?
            CustomPropertiesFragment?
        DEDENT
;
