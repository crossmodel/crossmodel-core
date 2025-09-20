import './base'

interface DataElementContainer extends NamedObject {
}

interface DataElementContainerLink extends NamedObject {
}

interface DataElementContainerMapping extends IdentifiedObject {
}

interface SourceDataElementContainer extends IdentifiedObject {
}

interface DataElementMapping extends IdentifiedObject {
}

interface DataElement extends NamedObject {
    datatype?: string;
}
