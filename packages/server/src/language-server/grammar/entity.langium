import 'terminals'
import 'common'


interface LogicalEntity extends DataElementContainer, WithCustomProperties {
    inherits: @LogicalEntity[];
    attributes: LogicalEntityAttribute[];
    identifiers: LogicalIdentifier[];
}

// LogicalEntity definition
LogicalEntity returns LogicalEntity:
    'entity' ':'
        INDENT
            NamedObjectFragment
            ('inherits' ':'
                INDENT
                    (LIST_ITEM inherits+=[LogicalEntity:IDReference])+
                DEDENT
            )?
            ('attributes' ':'
                INDENT
                    (LIST_ITEM attributes+=LogicalEntityAttribute)+
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

interface LogicalEntityAttribute extends LogicalAttribute {
}

LogicalEntityAttribute returns LogicalEntityAttribute:
    NamedObjectFragment
    ('datatype' ':' datatype=STRING)?
    ('length' ':' length=NUMBER)?
    ('precision' ':' precision=NUMBER)?
    ('scale' ':' scale=NUMBER)?
    (mandatory?='mandatory' ':' ('TRUE' | 'true'))?
    CustomPropertiesFragment?
;

interface LogicalIdentifier extends NamedObject, WithCustomProperties {
    primary?: boolean;
    attributes: @LogicalEntityAttribute[];
}

LogicalIdentifier returns LogicalIdentifier:
    NamedObjectFragment
    (primary?='primary' ':' ('TRUE' | 'true'))?
    ('attributes' ':'
        INDENT
            (LIST_ITEM attributes+=[LogicalEntityAttribute:IDReference])+
        DEDENT
    )?
    CustomPropertiesFragment?
;
