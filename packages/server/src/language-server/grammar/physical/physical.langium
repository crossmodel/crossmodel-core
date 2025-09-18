import '../terminals'
import '../common'
import '../logical/entity'

interface PhysicalStructuralDataElementContainer extends StructuralDataElementContainer, WithCustomProperties {
    relatedLogicalEntities: @LogicalEntity[];
    storageLocation?: string;
}

interface PhysicalBehaviouralDataElementContainer extends BehaviouralDataElementContainer, WithCustomProperties {
    relatedLogicalDataElementContainers: @LogicalEntity[];
}

interface PhysicalDataElement extends DataElement, WithCustomProperties {
    relatedLogicalAttributes: @LogicalAttribute[];
    length?: number;
    precision?: number;
    scale?: number;
}

interface PhysicalRelationship extends DataElementContainerLink, WithCustomProperties {
    parent?: @PhysicalStructuralDataElementContainer;
    parentRole?: string;
    parentCardinality?: string;
    child?: @PhysicalStructuralDataElementContainer;
    childRole?: string;
    childCardinality?: string;
}
