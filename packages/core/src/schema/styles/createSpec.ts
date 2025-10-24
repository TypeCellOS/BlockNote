import { Mark } from "@tiptap/core";

import { ParseRule, TagParseRule } from "@tiptap/pm/model";
import {
  addStyleAttributes,
  createInternalStyleSpec,
  stylePropsToAttributes,
} from "./internal.js";
import { StyleConfig, StyleSpec } from "./types.js";

export type CustomStyleImplementation<T extends StyleConfig> = {
  render: (value: T["propSchema"] extends "boolean" ? undefined : string) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };
  toExternalHTML?: (
    value: T["propSchema"] extends "boolean" ? undefined : string,
  ) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };
  parse?: (
    element: HTMLElement,
  ) => (T["propSchema"] extends "boolean" ? true : string) | undefined;
  runsBefore?: string[];
};

export function getStyleParseRules<T extends StyleConfig>(
  config: T,
  customParseFunction?: CustomStyleImplementation<T>["parse"],
): ParseRule[] {
  const rules: TagParseRule[] = [
    {
      tag: `[data-style-type="${config.type}"]`,
      contentElement: (element) => {
        const htmlElement = element as HTMLElement;

        if (htmlElement.matches("[data-editable]")) {
          return htmlElement;
        }

        return htmlElement.querySelector("[data-editable]") || htmlElement;
      },
    },
  ];

  if (customParseFunction) {
    rules.push({
      tag: "*",
      // By default, styles can overlap each other, so the rules should not
      // completely consume the element they parse (which can have multiple
      // styles).
      consuming: false,
      getAttrs(node: string | HTMLElement) {
        if (typeof node === "string") {
          return false;
        }

        const stringValue = customParseFunction?.(node);

        if (stringValue === undefined) {
          return false;
        }

        return { stringValue };
      },
    });
  }
  return rules;
}

export function createStyleSpec<const T extends StyleConfig>(
  styleConfig: T,
  styleImplementation: CustomStyleImplementation<T>,
): StyleSpec<T> {
  const mark = Mark.create({
    name: styleConfig.type,

    addAttributes() {
      return stylePropsToAttributes(styleConfig.propSchema);
    },

    parseHTML() {
      return getStyleParseRules(styleConfig, styleImplementation.parse);
    },

    renderHTML({ mark }) {
      const renderResult = (
        styleImplementation.toExternalHTML || styleImplementation.render
      )(mark.attrs.stringValue);

      return addStyleAttributes(
        renderResult,
        styleConfig.type,
        mark.attrs.stringValue,
        styleConfig.propSchema,
      );
    },

    addMarkView() {
      return ({ mark }) => {
        const renderResult = styleImplementation.render(mark.attrs.stringValue);

        return addStyleAttributes(
          renderResult,
          styleConfig.type,
          mark.attrs.stringValue,
          styleConfig.propSchema,
        );
      };
    },
  });

  return createInternalStyleSpec(styleConfig, {
    ...styleImplementation,
    mark,
    render: (value) => {
      const renderResult = styleImplementation.render(value as any);

      return addStyleAttributes(
        renderResult,
        styleConfig.type,
        value,
        styleConfig.propSchema,
      );
    },
    toExternalHTML: (value) => {
      const renderResult = (
        styleImplementation.toExternalHTML || styleImplementation.render
      )(value as any);

      return addStyleAttributes(
        renderResult,
        styleConfig.type,
        value,
        styleConfig.propSchema,
      );
    },
  });
}
