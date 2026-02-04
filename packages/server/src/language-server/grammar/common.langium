import 'terminals'

// Common interfaces and fragments.

interface IdentifiedObject {
    id?: string;
}

fragment IdentifiedObjectFragment:
    'id' ':' (id=ID)?;

interface NamedObject extends IdentifiedObject {
    name?: string;
    description?: string;
}

fragment NamedObjectFragment:
    IdentifiedObjectFragment
    ('name' ':' name=STRING)?
    ('description' ':' description=STRING)?
;

interface TypedObject extends NamedObject {
    type?: @ObjectDefinition;
}

fragment TypedObjectFragment:
    NamedObjectFragment
    ('type' ':' type=[ObjectDefinition:IDReference])?
;

interface DataElementContainer extends NamedObject {
    type?: @ObjectDefinition;
}

interface DataElementContainerLink extends NamedObject {
    type?: @ObjectDefinition;
}

interface DataElementContainerMapping extends IdentifiedObject {
}

// The DataElementContainer acting as a source object in a mapping.
// The name is the alias.
interface SourceDataElementContainer extends IdentifiedObject {
}

interface DataElementMapping extends IdentifiedObject {
}

interface DataElement extends NamedObject {
    type?: @ObjectDefinition;
    datatype?: string;
}

// Data type properties shared by attributes and attribute definitions
interface WithDataType {
    datatype?: string;
    length?: number;
    precision?: number;
    scale?: number;
    mandatory?: boolean;
}

fragment DataTypePropertiesFragment:
    ('datatype' ':' datatype=STRING)?
    ('length' ':' length=NUMBER)?
    ('precision' ':' precision=NUMBER)?
    ('scale' ':' scale=NUMBER)?
    (mandatory?='mandatory' ':' ('TRUE' | 'true'))?
;

// Custom properties
interface WithCustomProperties {
    customProperties: CustomProperty[];
}

fragment CustomPropertiesFragment:
    'customProperties' ':'
        INDENT
            (LIST_ITEM customProperties+=CustomProperty)+
        DEDENT
    ;

interface CustomProperty extends NamedObject, WithDataType {
    type?: @ObjectDefinition;
    defaultValue?: CustomPropertyValue;
    values: CustomPropertyValue[];
    value?: string;
}

CustomProperty returns CustomProperty:
    NamedObjectFragment
    ('type' ':' type=[ObjectDefinition:IDReference])?
    DataTypePropertiesFragment
    ('defaultValue' ':' defaultValue=CustomPropertyValue)?
    ('values' ':'
        INDENT
            (LIST_ITEM values+=CustomPropertyValue)+
        DEDENT
    )?
    ('value' ':' value=STRING)?;

// Forward declaration of ObjectDefinition (parser rule in objectdefinition.langium)
interface ObjectDefinition extends NamedObject, WithCustomProperties {
    abstract?: boolean;
    extends?: @ObjectDefinition;
}

// Cardinality values shared by relationships and relationship definitions.
Cardinality returns string:
    '0..1' | '1..1' | '0..N' | '1..N';

CustomPropertyValue:
    {infer StringValue} value=STRING |
    {infer NumberValue} value=NUMBER |
    {infer BooleanValue} value=BOOLEAN_VALUE;

BOOLEAN_VALUE returns string: 'TRUE' | 'true' | 'FALSE' | 'false';
