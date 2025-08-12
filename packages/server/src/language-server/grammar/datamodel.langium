import 'terminals'
import 'common'

interface DataModel extends NamedObject, WithCustomProperties {
    type: string;
    version?: string;
    dependencies: DataModelDependency[];
}

DataModel returns DataModel:
    'datamodel' ':'
        INDENT
            NamedObjectFragment
            'type' ':' type=DataModelType
            ('version' ':' version=VERSION)?
            ('dependencies' ':'
                INDENT
                    (LIST_ITEM dependencies+=DataModelDependency)+
                DEDENT
            )?
            CustomPropertiesFragment?
        DEDENT
;

DataModelType returns string: 'conceptual' | 'logical' | 'relational';

interface DataModelDependency {
    datamodel: @DataModel;
    version?: string;
}

DataModelDependency returns DataModelDependency:
    'datamodel' ':' datamodel=[DataModel:IDReference]
    ('version' ':' version=VERSION)?
;