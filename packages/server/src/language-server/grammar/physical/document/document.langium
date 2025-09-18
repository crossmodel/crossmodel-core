import '../../terminals'
import '../../common'
import '../../logical/entity'
import '../physical'

interface DocumentCollection extends PhysicalStructuralDataElementContainer {
    fields: DocumentField[];
    documentType?: string;
}

DocumentCollection returns DocumentCollection:
    'documentCollection' ':'
        INDENT
            NamedObjectFragment
            ('documentType' ':' documentType=STRING)?
            ('relatedLogicalEntities' ':'
                INDENT
                    (LIST_ITEM relatedLogicalEntities+=[LogicalEntity:IDReference])+
                DEDENT
            )?
            ('fields' ':'
                INDENT
                    (LIST_ITEM fields+=DocumentField)+
                DEDENT
            )?
            CustomPropertiesFragment?
        DEDENT
;

interface DocumentField extends PhysicalDataElement {
    isArray?: boolean;
    path?: string;
}

DocumentField returns DocumentField:
    NamedObjectFragment
    ('datatype' ':' datatype=STRING)?
    ('path' ':' path=STRING)?
    ('isArray' ':' (isArray?=('TRUE' | 'true'))?)?
    ('relatedLogicalAttributes' ':'
        INDENT
            (LIST_ITEM relatedLogicalAttributes+=[LogicalAttribute:IDReference])+
        DEDENT
    )?
    CustomPropertiesFragment?
;
