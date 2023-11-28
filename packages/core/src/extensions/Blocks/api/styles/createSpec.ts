import { Mark } from "@tiptap/core";
import { UnreachableCaseError } from "../../../../shared/utils";
import { addStyleAttributes, createInternalStyleSpec } from "./internal";
import { StyleConfig, StyleSpec } from "./types";

export type CustomStyleImplementation<T extends StyleConfig> = {
  render: T["propSchema"] extends "boolean"
    ? () => {
        dom: HTMLElement;
        contentDOM?: HTMLElement;
      }
    : (value: string) => {
        dom: HTMLElement;
        contentDOM?: HTMLElement;
      };
};

// TODO: support serialization

export function createStyleSpec<T extends StyleConfig>(
  styleConfig: T,
  styleImplementation: CustomStyleImplementation<T>
): StyleSpec<T> {
  const mark = Mark.create({
    name: styleConfig.type,

    addAttributes() {
      if (styleConfig.propSchema === "boolean") {
        return {};
      }
      return {
        stringValue: {
          default: undefined,
          parseHTML: (element) => element.getAttribute("data-value"),
          renderHTML: (attributes) =>
            attributes.stringValue !== undefined
              ? {
                  "data-value": attributes.stringValue,
                }
              : {},
        },
      };
    },

    parseHTML() {
      return [
        {
          tag: `.bn-style[data-style-type="${styleConfig.type}"]`,
        },
      ];
    },

    renderHTML({ mark }) {
      let renderResult: {
        dom: HTMLElement;
        contentDOM?: HTMLElement;
      };

      if (styleConfig.propSchema === "boolean") {
        // @ts-ignore not sure why this is complaining
        renderResult = styleImplementation.render();
      } else if (styleConfig.propSchema === "string") {
        renderResult = styleImplementation.render(mark.attrs.stringValue);
      } else {
        throw new UnreachableCaseError(styleConfig.propSchema);
      }

      // const renderResult = styleImplementation.render();
      return {
        dom: addStyleAttributes(
          renderResult.dom,
          styleConfig.type,
          mark.attrs.stringValue,
          styleConfig.propSchema
        ),
        contentDOM: renderResult.contentDOM,
      };
    },
  });

  return createInternalStyleSpec(styleConfig, {
    mark,
  });
}
