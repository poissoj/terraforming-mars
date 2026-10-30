import {ComponentPublicInstance} from 'vue';

export function isHTMLElement(ref: ComponentPublicInstance | Element | undefined): ref is HTMLElement {
  // 1. Check if it's an Element (nodeType === 1).
  // 2. Check if it is NOT in the SVG namespace.
  const svgNamespace = 'http://www.w3.org/2000/svg';

  const node = ref as unknown as {nodeType?: number, namespaceURI?: string | null};
  return ref !== undefined &&
    typeof ref === 'object' &&
    node.nodeType === 1 && // Is a basic Element
    node.namespaceURI !== svgNamespace;
}
