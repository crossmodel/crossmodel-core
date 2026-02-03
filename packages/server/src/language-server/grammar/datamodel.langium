import 'terminals'
import 'common'

interface DataModel extends NamedObject, WithCustomProperties {
    type: string;
    version?: string;
    crossmodel?: CrossModelEditionInfo;
    dependencies: DataModelDependency[];
}

interface CrossModelEditionInfo {
    edition: string;
    version: string;
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

CrossModelEditionInfo returns CrossModelEditionInfo:
    INDENT
        'edition' ':' edition=ID
        'version' ':' version=VERSION
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