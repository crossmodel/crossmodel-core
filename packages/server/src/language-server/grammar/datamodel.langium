import 'terminals'
import 'common'

// --- Data Model Definition (type definition for data models) ---

interface DataModelDefinition extends ObjectDefinition {
}

DataModelDefinition returns DataModelDefinition:
    'datamodelDefinition' ':'
        INDENT
            NamedObjectFragment
            (abstract?='abstract' ':' ('TRUE' | 'true'))?
            ('extends' ':' extends=[DataModelDefinition:IDReference])?
            CustomPropertiesFragment?
        DEDENT
;

// --- Data Model ---

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
