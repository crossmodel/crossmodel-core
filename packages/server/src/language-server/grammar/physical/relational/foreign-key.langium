import '../../terminals'
import '../../common'
import '../physical'
import './table'
import './primary-key'

interface ForeignKey extends RelationalKey, PhysicalRelationship {
    referencedTable?: @RelationalTable;
    referencedColumns: @RelationalColumn[];
    onUpdate?: string;
    onDelete?: string;
}

ForeignKey returns ForeignKey:
    'foreignKey' ':'
        INDENT
            NamedObjectFragment
            ('parent' ':' parent=[RelationalTable:IDReference])?
            ('child' ':' child=[RelationalTable:IDReference])?
            ('columns' ':'
                INDENT
                    (LIST_ITEM columns+=[RelationalColumn:IDReference])+
                DEDENT
            )?
            ('referencedTable' ':' referencedTable=[RelationalTable:IDReference])?
            ('referencedColumns' ':'
                INDENT
                    (LIST_ITEM referencedColumns+=[RelationalColumn:IDReference])+
                DEDENT
            )?
            ('onUpdate' ':' onUpdate=STRING)?
            ('onDelete' ':' onDelete=STRING)?
            ('parentCardinality' ':' parentCardinality=Cardinality)?
            ('childCardinality' ':' childCardinality=Cardinality)?
            CustomPropertiesFragment?
        DEDENT
;
