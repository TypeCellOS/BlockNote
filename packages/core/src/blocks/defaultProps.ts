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

// Default props which are set on `blockContainer` nodes rather than
// `blockContent` nodes. Ensures that they are not redundantly added to
// a custom block's TipTap node attributes.
export const inheritedProps = ["backgroundColor", "textColor"];

const getBackgroundColorAttribute = (
  attributeName = "backgroundColor"
): Attribute => ({
  default: defaultProps.backgroundColor.default,
  parseHTML: (element) => {
    if (element.hasAttribute("data-background-color")) {
      return element.getAttribute("data-background-color");
    }

    if (element.style.backgroundColor) {
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
