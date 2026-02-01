import 'terminals'
import 'common'

// ObjectDefinition parser rule — interface is declared in common.langium to avoid circular imports.
// ObjectDefinition is a type definition for any TypedObject subtype.
// The `extends` field references a parent ObjectDefinition, forming the definition
// inheritance chain. Walking the `extends` chain up to a built-in root determines
// what domain concept this ObjectDefinition applies to.
// The customProperties on an ObjectDefinition serve as property definitions for instances
// of this type. Instance custom properties with matching ids inherit the definition's metadata.
ObjectDefinition returns ObjectDefinition:
    'objectDefinition' ':'
        INDENT
            NamedObjectFragment
            (abstract?='abstract' ':' ('TRUE' | 'true'))?
            ('extends' ':' extends=[ObjectDefinition:IDReference])?
            CustomPropertiesFragment?
        DEDENT
;
