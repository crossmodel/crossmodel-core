import 'terminals'
import 'common'

// --- Entity Definition (type definition for entities) ---

interface EntityDefinition extends ObjectDefinition {
}

EntityDefinition returns EntityDefinition:
    'entityDefinition' ':'
        INDENT
            NamedObjectFragment
            (abstract?='abstract' ':' ('TRUE' | 'true'))?
            ('extends' ':' extends=[EntityDefinition:IDReference])?
            CustomPropertiesFragment?
        DEDENT
;

// --- Attribute Definition (type definition for attributes) ---

interface AttributeDefinition extends ObjectDefinition, WithDataType {
}

AttributeDefinition returns AttributeDefinition:
    'attributeDefinition' ':'
        INDENT
            NamedObjectFragment
            (abstract?='abstract' ':' ('TRUE' | 'true'))?
            ('extends' ':' extends=[AttributeDefinition:IDReference])?
            DataTypePropertiesFragment
            CustomPropertiesFragment?
        DEDENT
;

// --- Identifier Definition (type definition for identifiers) ---

interface IdentifierDefinition extends ObjectDefinition {
    primary?: boolean;
}

IdentifierDefinition returns IdentifierDefinition:
    'identifierDefinition' ':'
        INDENT
            NamedObjectFragment
            (abstract?='abstract' ':' ('TRUE' | 'true'))?
            ('extends' ':' extends=[IdentifierDefinition:IDReference])?
            (primary?='primary' ':' ('TRUE' | 'true'))?
            CustomPropertiesFragment?
        DEDENT
;

// --- Entity ---

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

interface LogicalAttribute extends DataElement, WithCustomProperties, WithDataType {
}

LogicalAttribute returns LogicalAttribute:
    TypedObjectFragment
    DataTypePropertiesFragment
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
