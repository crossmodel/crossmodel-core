import 'terminals'
import 'common'

interface DataModel extends NamedObject, WithCustomProperties {
    type: string;
    version?: string;
    crossmodel?: CrossModelEditionInfo;
    dependencies: DataModelDependency[];
}

DataModel returns DataModel:
    'datamodel' ':'
        INDENT
            NamedObjectFragment
            'type' ':' type=DataModelType
            ('version' ':' version=VERSION)?
            ('crossmodel' ':' crossmodel=CrossModelEditionInfo)?
            ('dependencies' ':'
                INDENT
                    (LIST_ITEM dependencies+=DataModelDependency)+
                DEDENT
            )?
            CustomPropertiesFragment?
        DEDENT
;

interface CrossModelEditionInfo {
    edition: string;
    version: number;
}

CrossModelEditionInfo returns CrossModelEditionInfo:
    INDENT
        'edition' ':' edition=ID
        'version' ':' version=NUMBER
    DEDENT
;

DataModelType returns string:
    'conceptual' | 'logical' | 'relational';

interface DataModelDependency {
    datamodel: @DataModel;
    version?: string;
}

DataModelDependency returns DataModelDependency:
    'datamodel' ':' datamodel=[DataModel:IDReference]
    ('version' ':' version=VERSION)?
;