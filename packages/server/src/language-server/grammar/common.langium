import 'terminals'

// Common interfaces and fragments.

interface IdentifiedObject {
    id?: string;
}

fragment IdentifiedObjectFragment returns IdentifiedObject:
    'id' ':' (id=ID)?;

interface NamedObject extends IdentifiedObject {
    name?: string;
    description?: string;
}

fragment NamedObjectFragment returns NamedObject:
    IdentifiedObjectFragment
    ('name' ':' name=STRING)?
    ('description' ':' description=STRING)?
;

interface DataElementContainer extends NamedObject {
}

interface DataElementContainerLink extends NamedObject {
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
    datatype?: string;
}

// Custom properties
interface WithCustomProperties {
    customProperties: CustomProperty[];
}

fragment CustomPropertiesFragment returns WithCustomProperties:
    'customProperties' ':'
        INDENT
            (LIST_ITEM customProperties+=CustomProperty)+
        DEDENT
    ;

interface CustomProperty extends NamedObject {
    value?: string;
}

CustomProperty returns CustomProperty:
    NamedObjectFragment
    ('value' ':' value=STRING)?;
