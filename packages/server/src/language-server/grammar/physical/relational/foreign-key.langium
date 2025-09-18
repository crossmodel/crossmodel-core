import '../../terminals'
import '../../common'
import '../physical'
import './table'
import './primary-key'

interface ForeignKey extends PhysicalRelationship {
}

ForeignKey returns ForeignKey:
    'foreignKey' ':'
        INDENT
            NamedObjectFragment
            ('parent' ':' parent=[RelationalTable:IDReference])?
            ('child' ':' child=[RelationalTable:IDReference])?
            ('parentCardinality' ':' parentCardinality=Cardinality)?
            ('childCardinality' ':' childCardinality=Cardinality)?
            CustomPropertiesFragment?
        DEDENT
;
