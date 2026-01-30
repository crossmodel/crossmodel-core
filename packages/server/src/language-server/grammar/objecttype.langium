import 'terminals'
import 'common'

// ObjectType parser rule — interface is declared in common.langium to avoid circular imports.
// ObjectType is a type definition for any IdentifiedObject subtype.
// The inherited `type` field (from IdentifiedObject) serves as the parent type reference,
// forming the type inheritance chain.
ObjectType returns ObjectType:
    'objectType' ':'
        INDENT
            NamedObjectFragment
            ('properties' ':'
                INDENT
                    (LIST_ITEM propertyDefinitions+=CustomPropertyDefinition)+
                DEDENT
            )?
            CustomPropertiesFragment?
        DEDENT
;
