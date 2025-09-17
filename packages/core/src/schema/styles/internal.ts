import { Attributes, Mark } from "@tiptap/core";
import { DOMSerializer } from "@tiptap/pm/model";
import {
  StyleConfig,
  StyleImplementation,
  StylePropSchema,
  StyleSchemaFromSpecs,
  StyleSpec,
  StyleSpecs,
} from "./types.js";

export function stylePropsToAttributes(
  propSchema: StylePropSchema,
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
  PSchema extends StylePropSchema,
>(
  element: {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  },
  styleType: SType,
  styleValue: PSchema extends "boolean" ? undefined : string,
  propSchema: PSchema,
): {
  dom: HTMLElement;
  contentDOM?: HTMLElement;
} {
  // Sets content type attribute
  element.dom.setAttribute("data-style-type", styleType);
  // Adds style value as an HTML attribute in kebab-case with "data-" prefix, if
  // the style takes a string value.
  if (propSchema === "string") {
    element.dom.setAttribute("data-value", styleValue as string);
  }

  if (element.contentDOM) {
    element.contentDOM.setAttribute("data-editable", "");
  }

  return element;
}

// This helper function helps to instantiate a stylespec with a
// config and implementation that conform to the type of Config
export function createInternalStyleSpec<T extends StyleConfig>(
  config: T,
  implementation: StyleImplementation<T>,
) {
  return {
    config,
    implementation,
  } satisfies StyleSpec<T>;
}

export function createStyleSpecFromTipTapMark<
  T extends Mark,
  P extends StylePropSchema,
>(mark: T, propSchema: P) {
  return createInternalStyleSpec(
    {
      type: mark.name as T["name"],
      propSchema,
    },
    {
      mark,
      render(value, editor) {
        const toDOM = editor.pmSchema.marks[mark.name].spec.toDOM;

        if (toDOM === undefined) {
          throw new Error(
            "This block has no default HTML serialization as its corresponding TipTap node doesn't implement `renderHTML`.",
          );
        }

        const markInstance = editor.pmSchema.mark(mark.name, {
          stringValue: value,
        });

        const renderSpec = DOMSerializer.renderSpec(
          document,
          toDOM(markInstance, true),
        );

        if (typeof renderSpec !== "object" || !("dom" in renderSpec)) {
          throw new Error(
            "Cannot use this block's default HTML serialization as its corresponding TipTap mark's `renderHTML` function does not return an object with the `dom` property.",
          );
        }

        return renderSpec as {
          dom: HTMLElement;
          contentDOM?: HTMLElement;
        };
      },
      toExternalHTML(value, editor) {
        const toDOM = editor.pmSchema.marks[mark.name].spec.toDOM;

        if (toDOM === undefined) {
          throw new Error(
            "This block has no default HTML serialization as its corresponding TipTap node doesn't implement `renderHTML`.",
          );
        }

        const markInstance = editor.pmSchema.mark(mark.name, {
          stringValue: value,
        });

        const renderSpec = DOMSerializer.renderSpec(
          document,
          toDOM(markInstance, true),
        );

        if (typeof renderSpec !== "object" || !("dom" in renderSpec)) {
          throw new Error(
            "Cannot use this block's default HTML serialization as its corresponding TipTap mark's `renderHTML` function does not return an object with the `dom` property.",
          );
        }

        return renderSpec as {
          dom: HTMLElement;
          contentDOM?: HTMLElement;
        };
      },
    },
  );
}

export function getStyleSchemaFromSpecs<T extends StyleSpecs>(specs: T) {
  return Object.fromEntries(
    Object.entries(specs).map(([key, value]) => [key, value.config]),
  ) as StyleSchemaFromSpecs<T>;
}
