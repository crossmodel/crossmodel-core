import './base'

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
