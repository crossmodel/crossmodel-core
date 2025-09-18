import '../../terminals'
import '../../common'
import '../../logical/entity'
import '../physical'
import './foreign-key'
import './primary-key'

interface RelationalTable extends PhysicalStructuralDataElementContainer {
    columns: RelationalColumn[];
    primaryKey?: PrimaryKey;
    foreignKeys: ForeignKey[];
    database?: string;
    schema?: string;
}

RelationalTable returns RelationalTable:
    'table' ':'
        INDENT
            NamedObjectFragment
            ('database' ':' database=STRING)?
            ('schema' ':' schema=STRING)?
            ('relatedLogicalEntities' ':'
                INDENT
                    (LIST_ITEM relatedLogicalEntities+=[LogicalEntity:IDReference])+
                DEDENT
            )?
            ('columns' ':'
                INDENT
                    (LIST_ITEM columns+=RelationalColumn)+
                DEDENT
            )?
            ('primaryKey' ':' primaryKey=PrimaryKey)?
            ('foreignKeys' ':'
                INDENT
                    (LIST_ITEM foreignKeys+=ForeignKey)+
                DEDENT
            )?
            CustomPropertiesFragment?
        DEDENT
;

interface RelationalColumn extends PhysicalDataElement {
    nullable?: boolean;
    defaultValue?: string;
}

RelationalColumn returns RelationalColumn:
    NamedObjectFragment
    ('datatype' ':' datatype=STRING)?
    ('length' ':' length=NUMBER)?
    ('precision' ':' precision=NUMBER)?
    ('scale' ':' scale=NUMBER)?
    ('nullable' ':' (nullable?=('TRUE' | 'true'))?)?
    ('defaultValue' ':' defaultValue=STRING)?
    ('relatedLogicalAttributes' ':'
        INDENT
            (LIST_ITEM relatedLogicalAttributes+=[LogicalAttribute:IDReference])+
        DEDENT
    )?
    CustomPropertiesFragment?
;
