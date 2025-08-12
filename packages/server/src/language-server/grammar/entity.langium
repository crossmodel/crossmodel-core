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
            NamedObjectFragment
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
    length?: number;
    precision?: number;
    scale?: number;
    identifier?: boolean;
}

LogicalAttribute returns LogicalAttribute:
    NamedObjectFragment
    ('datatype' ':' datatype=STRING)?
    ('length' ':' length=NUMBER)?
    ('precision' ':' precision=NUMBER)?
    ('scale' ':' scale=NUMBER)?
    (identifier?='identifier' ':' ('TRUE' | 'true'))? // To-be removed in future (identifiers collection on entity is replacement for this information).
    CustomPropertiesFragment?
;

interface LogicalIdentifier extends NamedObject, WithCustomProperties {
    primary?: boolean;
    attributes: @LogicalAttribute[];
}

LogicalIdentifier returns LogicalIdentifier:
    NamedObjectFragment
    (primary?='primary' ':' ('TRUE' | 'true'))?
    ('attributes' ':'
        INDENT
            (LIST_ITEM attributes+=[LogicalAttribute:IDReference])+
        DEDENT
    )?
    CustomPropertiesFragment?
;
