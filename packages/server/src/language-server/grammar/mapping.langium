import 'terminals'
import 'common'
import 'entity'
import 'relationship'

interface SourceObjectAttribute extends LogicalAttribute {
}

interface TargetObjectAttribute extends LogicalAttribute {
}

interface Mapping extends DataElementContainerMapping, WithCustomProperties {
    sources: SourceObject[];
    target: TargetObject;
}

Mapping returns Mapping:
    'mapping' ':'
        INDENT
            IdentifiedObjectFragment
            ('sources' ':'
                INDENT 
                    (LIST_ITEM sources+=SourceObject)+
                DEDENT
            )?
            ('target' ':' target=TargetObject)?
            CustomPropertiesFragment?
        DEDENT
;

interface SourceObject extends SourceDataElementContainer, WithCustomProperties {
    entity?: @LogicalEntity;
    join?: string;
    dependencies: SourceObjectDependency[]
    conditions: SourceObjectCondition[]
}

SourceObject returns SourceObject:
    IdentifiedObjectFragment
    ('entity' ':' entity=[LogicalEntity:IDReference])? // implies attributes through entity
    ('join' ':' join=JoinType)?
    ('dependencies' ':'
        INDENT
            (LIST_ITEM dependencies+=SourceObjectDependency)*
        DEDENT
    )?
    ('conditions' ':'
        INDENT 
            (LIST_ITEM conditions+=SourceObjectCondition)*
        DEDENT
    )?
    CustomPropertiesFragment?
;

JoinType returns string: 'from' | 'inner-join' | 'cross-join' | 'left-join' | 'apply';

SourceObjectDependency:
    source=[SourceObject:IDReference]
;

SourceObjectCondition: JoinCondition
;

JoinCondition: expression=BinaryExpression
;

BinaryExpression:
    left=PrimaryExpression op=('=' | '!=' | '<' | '<=' | '>' | '>=') right=PrimaryExpression
;

PrimaryExpression infers BooleanExpression:
    {infer NumberLiteral} value=NUMBER |
    {infer StringLiteral} value=STRING |
    {infer SourceObjectAttributeReference} value=[SourceObjectAttribute:IDReference]
;

interface TargetObject extends WithCustomProperties {
    entity?: @LogicalEntity;
    mappings: AttributeMapping[];
}

TargetObject returns TargetObject:
    INDENT
        'entity' ':' (entity=[LogicalEntity:IDReference])? // implies attributes through entity
        ('mappings' ':'
            INDENT 
                (LIST_ITEM mappings+=AttributeMapping)+     
            DEDENT
        )?
        CustomPropertiesFragment?
    DEDENT
;

interface AttributeMapping extends WithCustomProperties {
    attribute?: AttributeMappingTarget;
    sources: AttributeMappingSource[];
    expression: string;
}

AttributeMapping returns AttributeMapping:
    'attribute' ':' (attribute=AttributeMappingTarget)?
    ('sources' ':' 
        INDENT 
            (LIST_ITEM sources+=AttributeMappingSource)+     
        DEDENT
    )?
    ('expression' ':' expression=STRING)?
    CustomPropertiesFragment?
;

AttributeMappingTarget:
    value=[TargetObjectAttribute:IDReference]
;

AttributeMappingSource:
    value=[SourceObjectAttribute:IDReference]
;
