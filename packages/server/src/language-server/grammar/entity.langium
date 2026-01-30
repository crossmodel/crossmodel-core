import 'terminals'
import 'common'

interface LogicalEntity extends DataElementContainer, WithCustomProperties {
    superEntities: @LogicalEntity[];
    attributes: LogicalAttribute[];
    identifiers: LogicalIdentifier[];
}

// LogicalEntity definition
LogicalEntity returns LogicalEntity:
    'entity' ':'
        INDENT
            TypedObjectFragment
            ('inherits' ':'
                INDENT
                    (LIST_ITEM superEntities+=[LogicalEntity:IDReference])+
                DEDENT
            )?
            ('attributes' ':'
                INDENT
                    (LIST_ITEM attributes+=LogicalAttribute)+
                DEDENT
            )?
            ('identifiers' ':'
                INDENT
                    (LIST_ITEM identifiers+=LogicalIdentifier)+
                DEDENT
            )?
            CustomPropertiesFragment?
        DEDENT
;

interface LogicalAttribute extends DataElement, WithCustomProperties {
    mandatory?: boolean;
    length?: number;
    precision?: number;
    scale?: number;
}

LogicalAttribute returns LogicalAttribute:
    TypedObjectFragment
    ('datatype' ':' datatype=STRING)?
    ('length' ':' length=NUMBER)?
    ('precision' ':' precision=NUMBER)?
    ('scale' ':' scale=NUMBER)?
    (mandatory?='mandatory' ':' ('TRUE' | 'true'))?
    CustomPropertiesFragment?
;

interface LogicalIdentifier extends NamedObject, WithCustomProperties {
    type?: @ObjectDefinition;
    primary?: boolean;
    attributes: @LogicalAttribute[];
}

LogicalIdentifier returns LogicalIdentifier:
    TypedObjectFragment
    (primary?='primary' ':' ('TRUE' | 'true'))?
    ('attributes' ':'
        INDENT
            (LIST_ITEM attributes+=[LogicalAttribute:IDReference])+
        DEDENT
    )?
    CustomPropertiesFragment?
;
