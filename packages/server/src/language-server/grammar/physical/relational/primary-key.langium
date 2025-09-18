import '../../terminals'
import '../../common'
import './table'

interface RelationalKey extends NamedObject, WithCustomProperties {
    columns: @RelationalColumn[];
}

RelationalKey returns RelationalKey:
    'key' ':'
        INDENT
            NamedObjectFragment
            ('columns' ':'
                INDENT
                    (LIST_ITEM columns+=[RelationalColumn:IDReference])+
                DEDENT
            )?
            CustomPropertiesFragment?
        DEDENT
;

interface PrimaryKey extends RelationalKey {}

PrimaryKey returns PrimaryKey:
    'primaryKey' ':'
        INDENT
            NamedObjectFragment
            ('columns' ':'
                INDENT
                    (LIST_ITEM columns+=[RelationalColumn:IDReference])+
                DEDENT
            )?
            CustomPropertiesFragment?
        DEDENT
;
