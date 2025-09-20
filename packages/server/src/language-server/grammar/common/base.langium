import './terminals'

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
