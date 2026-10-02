import { camelToDataKebab } from "../../util/string.js";
import { PropSchema, Props } from "../propTypes.js";

/**
 * Writes the attributes a container block's round-trip parse reads onto its
 * root element: the `data-node-type` marker, the block's non-default props as
 * `data-*` (the convention `propsToAttributes` and the generated parse rules
 * use), and its id where there is one.
 * Existing attributes follow the block props, including removing defaults.
 * @internal
 */
export function applyContainerAttributes<PSchema extends PropSchema>(
  element: HTMLElement | undefined | null,
  blockType: string,
  blockProps: Partial<Props<PSchema>>,
  propSchema: PSchema,
  id?: string,
) {
  if (!element) {
    return;
  }

  for (const [prop, value] of Object.entries(blockProps)) {
    const attribute = camelToDataKebab(prop);
    if (value === undefined || value === propSchema[prop]?.default) {
      element.removeAttribute(attribute);
    } else {
      element.setAttribute(attribute, String(value));
    }
  }

  // Reserved markers win even when a prop maps to the same attribute.
  element.setAttribute("data-node-type", blockType);
  if (id) {
    element.setAttribute("data-id", id);
  }
}
