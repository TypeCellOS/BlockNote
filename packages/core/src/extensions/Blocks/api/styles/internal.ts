import { Attributes, Mark } from "@tiptap/core";
import {
  StyleConfig,
  StyleImplementation,
  StylePropSchema,
  StyleSchemaFromSpecs,
  StyleSpec,
  StyleSpecs,
} from "./types";
import { mergeCSSClasses } from "../../../../shared/utils";

export function stylePropsToAttributes(
  propSchema: StylePropSchema
): Attributes {
  if (propSchema === "boolean") {
    return {};
  }
  return {
    stringValue: {
      default: undefined,
      keepOnSplit: true,
      parseHTML: (element) => element.getAttribute("data-value"),
      renderHTML: (attributes) =>
        attributes.stringValue !== undefined
          ? {
              "data-value": attributes.stringValue,
            }
          : {},
    },
  };
}

// Function that adds necessary classes and attributes to the `dom` element
// returned from a custom style's 'render' function, to ensure no data is lost
// on internal copy & paste.
export function addStyleAttributes<
  SType extends string,
  PSchema extends StylePropSchema
>(
  element: HTMLElement,
  styleType: SType,
  styleValue: PSchema extends "boolean" ? undefined : string,
  propSchema: PSchema
): HTMLElement {
  // Sets inline content section class
  element.className = mergeCSSClasses("bn-style", element.className);
  // Sets content type attribute
  element.setAttribute("data-style-type", styleType);
  // Adds style value as an HTML attribute in kebab-case with "data-" prefix, if
  // the style takes a string value.
  if (propSchema === "string") {
    element.setAttribute("data-value", styleValue as string);
  }

  return element;
}

// This helper function helps to instantiate a stylespec with a
// config and implementation that conform to the type of Config
export function createInternalStyleSpec<T extends StyleConfig>(
  config: T,
  implementation: StyleImplementation
) {
  return {
    config,
    implementation,
  } satisfies StyleSpec<T>;
}

export function createStyleSpecFromTipTapMark<
  T extends Mark,
  P extends StylePropSchema
>(mark: T, propSchema: P) {
  return createInternalStyleSpec(
    {
      type: mark.name as T["name"],
      propSchema,
    },
    {
      mark,
    }
  );
}

export function getStyleSchemaFromSpecs<T extends StyleSpecs>(specs: T) {
  return Object.fromEntries(
    Object.entries(specs).map(([key, value]) => [key, value.config])
  ) as StyleSchemaFromSpecs<T>;
}
