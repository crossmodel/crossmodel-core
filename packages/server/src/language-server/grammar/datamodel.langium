import 'terminals'
import 'common'

interface DataModel extends NamedObject, WithCustomProperties {
    type?: @ObjectDefinition;
    version?: string;
    dependencies: DataModelDependency[];
}

DataModel returns DataModel:
    'datamodel' ':'
        INDENT
            TypedObjectFragment
            ('version' ':' version=VERSION)?
            ('dependencies' ':'
                INDENT
                    (LIST_ITEM dependencies+=DataModelDependency)+
                DEDENT
            )?
            CustomPropertiesFragment?
        DEDENT
;

interface DataModelDependency {
    datamodel: @DataModel;
    version?: string;
}

DataModelDependency returns DataModelDependency:
    'datamodel' ':' datamodel=[DataModel:IDReference]
    ('version' ':' version=VERSION)?
;
