import { camelToDataKebab } from "../../util/string.js";
import { PropSchema, Props } from "../propTypes.js";

/**
 * Writes the attributes a container block's round-trip parse reads onto its
 * root element: the `data-node-type` marker, the block's non-default props as
 * `data-*` (the convention `propsToAttributes` and the generated parse rules
 * use), and its id where there is one.
 *
 * A container block owns its outer DOM, so unlike a regular block's, these
 * can't be applied by wrapping the render's output — they're set on the
 * element the block's author returned. `mode` is what the two callers differ
 * on:
 *
 * - `"overwrite"` for a live node view, which re-renders one element as the
 *   block changes: values are replaced, and the attribute of a prop that went
 *   back to its default is removed rather than left behind.
 * - `"fill"` for HTML serialization, which renders a fresh element per block:
 *   nothing is stale, and an attribute the render set itself is what the
 *   author asked for, so it wins.
 */
export function applyContainerAttributes<PSchema extends PropSchema>(
  element: HTMLElement | undefined | null,
  blockType: string,
  blockProps: Partial<Props<PSchema>>,
  propSchema: PSchema,
  { id, mode }: { id?: string; mode: "overwrite" | "fill" },
) {
  if (!element) {
    return;
  }

  const attributes: Record<string, string> = {};
  for (const [prop, value] of Object.entries(blockProps)) {
    if (value === undefined || value === propSchema[prop]?.default) {
      continue;
    }
    attributes[camelToDataKebab(prop)] = `${value}`;
  }

  // Emit the reserved markers after the prop loop so a prop whose name
  // kebab-cases to `data-node-type` or `data-id` can't overwrite them.
  attributes["data-node-type"] = blockType;
  if (id) {
    attributes["data-id"] = id;
  }

  if (mode === "fill") {
    for (const [attr, value] of Object.entries(attributes)) {
      if (!element.hasAttribute(attr)) {
        element.setAttribute(attr, value);
      }
    }
    return;
  }

  // A prop back at its default produced no attribute above, so clear the one
  // a previous render left.
  for (const prop of Object.keys(blockProps)) {
    const attr = camelToDataKebab(prop);
    if (!(attr in attributes)) {
      element.removeAttribute(attr);
    }
  }
  for (const [attr, value] of Object.entries(attributes)) {
    element.setAttribute(attr, value);
  }
}
