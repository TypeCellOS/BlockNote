import type { Theme } from "./Theme.js";
export type { Theme } from "./Theme.js";

type CSSVariableValues = {
  readonly [key: string]: string | undefined | CSSVariableValues;
};

// Track only variables applied by this API, including both new layers. This
// avoids a second, manually maintained list of properties to clear.
const appliedVariables = new WeakMap<HTMLElement, string[]>();

function applyVariables(
  values: CSSVariableValues,
  element: HTMLElement,
  properties: string[],
  prefix = "--bn",
) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      continue;
    }
    const name = `${prefix}-${key
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/([a-z])([0-9])/g, "$1-$2")
      .toLowerCase()}`;
    if (typeof value === "object") {
      applyVariables(value, element, properties, name);
    } else {
      element.style.setProperty(name, value);
      properties.push(name);
    }
  }
}

export function applyBlockNoteCSSVariablesFromTheme(
  theme: Theme,
  editorDOM: HTMLElement,
) {
  removeBlockNoteCSSVariables(editorDOM);
  const { elements, ...variables } = theme;
  const properties: string[] = [];
  applyVariables(variables, editorDOM, properties);
  if (elements) {
    applyVariables(elements, editorDOM, properties);
  }
  appliedVariables.set(editorDOM, properties);
  return properties;
}

export function removeBlockNoteCSSVariables(editorDOM: HTMLElement) {
  for (const property of appliedVariables.get(editorDOM) ?? []) {
    editorDOM.style.removeProperty(property);
  }
  appliedVariables.delete(editorDOM);
}
