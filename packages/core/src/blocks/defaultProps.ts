import { Attribute } from "@tiptap/core";

import type { Props, PropSchema } from "../schema/index.js";

// TODO: this system should probably be moved / refactored.
// The dependency from schema on this file doesn't make sense

export const defaultProps = {
  backgroundColor: {
    default: "default" as const,
  },
  textColor: {
    default: "default" as const,
  },
  textAlignment: {
    default: "left" as const,
    values: ["left", "center", "right", "justify"] as const,
  },
} satisfies PropSchema;

export type DefaultProps = Props<typeof defaultProps>;

const getBackgroundColorAttribute = (
  attributeName = "backgroundColor"
): Attribute => ({
  default: defaultProps.backgroundColor.default,
  parseHTML: (element) => {
    if (element.hasAttribute("data-background-color")) {
      return element.getAttribute("data-background-color");
    }

    if (element.style.backgroundColor) {
      // Check if `element.style.backgroundColor` matches the string:
      // `var(--blocknote-background-<color>)`. If it does, return the color
      // name only. Otherwise, return `element.style.backgroundColor`.
      const match = element.style.backgroundColor.match(
        /var\(--blocknote-background-(.+)\)/
      );
      if (match) {
        return match[1];
      }

      return element.style.backgroundColor;
    }

    return defaultProps.backgroundColor.default;
  },
  renderHTML: (attributes) => {
    if (attributes[attributeName] === defaultProps.backgroundColor.default) {
      return {};
    }

    return {
      "data-background-color": attributes[attributeName],
    };
  },
});

const getTextColorAttribute = (attributeName = "textColor"): Attribute => ({
  default: defaultProps.textColor.default,
  parseHTML: (element) => {
    if (element.hasAttribute("data-text-color")) {
      return element.getAttribute("data-text-color");
    }

    if (element.style.color) {
      // Check if `element.style.color` matches the string:
      // `var(--blocknote-text-<color>)`. If it does, return the color name
      // only. Otherwise, return `element.style.color`.
      const match = element.style.color.match(/var\(--blocknote-text-(.+)\)/);
      if (match) {
        return match[1];
      }

      return element.style.color;
    }

    return defaultProps.textColor.default;
  },
  renderHTML: (attributes) => {
    if (attributes[attributeName] === defaultProps.textColor.default) {
      return {};
    }
    return {
      "data-text-color": attributes[attributeName],
    };
  },
});

const getTextAlignmentAttribute = (
  attributeName = "textAlignment"
): Attribute => ({
  default: defaultProps.textAlignment.default,
  parseHTML: (element) => {
    if (element.hasAttribute("data-text-alignment")) {
      return element.getAttribute("data-text-alignment");
    }

    if (element.style.textAlign) {
      return element.style.textAlign;
    }

    return defaultProps.textAlignment.default;
  },
  renderHTML: (attributes) => {
    if (attributes[attributeName] === defaultProps.textAlignment.default) {
      return {};
    }
    return {
      "data-text-alignment": attributes[attributeName],
    };
  },
});

export const getAttributeFromDefaultProps = {
  backgroundColor: getBackgroundColorAttribute,
  textColor: getTextColorAttribute,
  textAlignment: getTextAlignmentAttribute,
};
