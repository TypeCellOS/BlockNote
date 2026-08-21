import { camelToDataKebab } from "../../util/string.js";
import { PropSchema, Props } from "../propTypes.js";

export function getContainerAttributes<PSchema extends PropSchema>(
  blockType: string,
  blockProps: Partial<Props<PSchema>>,
  propSchema: PSchema,
  id: string | undefined,
): Record<string, string> {
  const attributes: Record<string, string> = { "data-node-type": blockType };

  for (const [prop, value] of Object.entries(blockProps)) {
    if (value === undefined || value === propSchema[prop]?.default) {
      continue;
    }
    attributes[camelToDataKebab(prop)] = `${value}`;
  }

  if (id) {
    attributes["data-id"] = id;
  }

  return attributes;
}

export function applyContainerAttributes<PSchema extends PropSchema>(
  dom: HTMLElement | DocumentFragment | undefined | null,
  blockType: string,
  blockProps: Partial<Props<PSchema>>,
  propSchema: PSchema,
  id: string | undefined,
) {
  const element = dom as HTMLElement | undefined;
  if (!element || typeof element.setAttribute !== "function") {
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
  dom: HTMLElement,
  blockType: string,
  blockProps: Partial<Props<PSchema>>,
  propSchema: PSchema,
) {
  const attributes = getContainerAttributes(
    blockType,
    blockProps,
    propSchema,
    undefined,
  );

  for (const [attr, value] of Object.entries(attributes)) {
    if (!dom.hasAttribute(attr)) {
      dom.setAttribute(attr, value);
    }
  }
}
