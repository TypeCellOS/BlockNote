import { camelToDataKebab } from "../../util/string.js";
import { PropSchema, Props } from "../propTypes.js";

function getContainerAttributes<PSchema extends PropSchema>(
  blockType: string,
  blockProps: Partial<Props<PSchema>>,
  propSchema: PSchema,
  id: string | undefined,
): Record<string, string> {
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

  return attributes;
}

export function applyContainerAttributes<PSchema extends PropSchema>(
  element: HTMLElement | undefined | null,
  blockType: string,
  blockProps: Partial<Props<PSchema>>,
  propSchema: PSchema,
  id: string | undefined,
) {
  if (!element) {
    return;
  }

  const attributes = getContainerAttributes(
    blockType,
    blockProps,
    propSchema,
    id,
  );

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

// Like `applyContainerAttributes` but won't overwrite existing attributes.
export function fillContainerAttributes<PSchema extends PropSchema>(
  element: HTMLElement | undefined | null,
  blockType: string,
  blockProps: Partial<Props<PSchema>>,
  propSchema: PSchema,
) {
  if (!element) {
    return;
  }

  const attributes = getContainerAttributes(
    blockType,
    blockProps,
    propSchema,
    undefined,
  );

  for (const [attr, value] of Object.entries(attributes)) {
    if (!element.hasAttribute(attr)) {
      element.setAttribute(attr, value);
    }
  }
}
