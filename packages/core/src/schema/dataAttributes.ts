import { camelToDataKebab } from "../util/string.js";
import type { PropSchema, Props } from "./propTypes.js";

/**
 * The prop names to visit: the props' own order first, so an element's
 * attributes keep the order its props were given in, then the schema's for
 * the props left out. A prop the schema does not know has no attribute.
 */
function propNames<PSchema extends PropSchema>(
  props: Partial<Props<PSchema>>,
  propSchema: PSchema,
): (keyof PSchema & string)[] {
  const names = new Set([...Object.keys(props), ...Object.keys(propSchema)]);
  return [...names].filter((name) => name in propSchema);
}

/**
 * The `data-*` attributes `props` serialize to: a `data-kebab-case` attribute
 * holding each prop's value as a string, except props at their default (or
 * absent), which have none. Parsing (`propsToAttributes`' `parseHTML`) reads
 * these names back, so the rule lives here only. The result is what a new
 * element gets set, what React spreads, and what tiptap merges into a node's
 * HTML attributes.
 */
export function propsToDataAttributes<PSchema extends PropSchema>(
  props: Partial<Props<PSchema>>,
  propSchema: PSchema,
): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const name of propNames(props, propSchema)) {
    const value = props[name];
    if (value !== undefined && value !== propSchema[name].default) {
      attributes[camelToDataKebab(name)] = String(value);
    }
  }
  return attributes;
}

/** Sets `attributes` on a new element. Nothing is removed. */
export function setDataAttributes(
  element: HTMLElement,
  attributes: Record<string, string>,
) {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
}

/**
 * Makes an element's prop attributes follow `props`: sets those of the
 * non-default props and removes those of every other prop in the schema, so
 * an element that lives across updates (a layout block's root, the table view)
 * drops stale attributes, including ones its author set.
 */
export function applyDataAttributes<PSchema extends PropSchema>(
  element: HTMLElement,
  props: Partial<Props<PSchema>>,
  propSchema: PSchema,
) {
  const attributes = propsToDataAttributes(props, propSchema);
  for (const name of propNames(props, propSchema)) {
    const attribute = camelToDataKebab(name);
    if (attribute in attributes) {
      element.setAttribute(attribute, attributes[attribute]);
    } else {
      element.removeAttribute(attribute);
    }
  }
}
