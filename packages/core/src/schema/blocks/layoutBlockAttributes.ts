import { applyDataAttributes } from "../dataAttributes.js";
import { PropSchema, Props } from "../propTypes.js";

/**
 * Writes the attributes a layout block's round-trip parse reads onto its
 * root element: the `data-node-type` marker, the block's non-default props as
 * `data-*` (see `propsToDataAttributes`), and its id where there is one.
 * Existing attributes follow the block props, including removing defaults.
 * @internal
 */
export function applyLayoutBlockAttributes<PSchema extends PropSchema>(
  element: HTMLElement | undefined | null,
  blockType: string,
  blockProps: Partial<Props<PSchema>>,
  propSchema: PSchema,
  id?: string,
) {
  if (!element) {
    return;
  }

  applyDataAttributes(element, blockProps, propSchema);

  // Reserved markers win even when a prop maps to the same attribute.
  element.setAttribute("data-node-type", blockType);
  if (id) {
    element.setAttribute("data-id", id);
  }
}
