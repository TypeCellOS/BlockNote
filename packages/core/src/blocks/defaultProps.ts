import { Attribute } from "@tiptap/core";

import { COLORS_DEFAULT } from "../editor/defaultColors.js";
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

// TODO: Move text/background color props from `blockContainer` node to
// `blockContent`.
export const parseDefaultProps = (element: HTMLElement) => {
  const props: Partial<DefaultProps> = {};

  props.textAlignment = defaultProps.textAlignment.values.includes(
    element.style.textAlign as DefaultProps["textAlignment"],
  )
    ? (element.style.textAlign as DefaultProps["textAlignment"])
    : undefined;

  return props;
};

export const addDefaultPropsExternalHTML = (
  props: Partial<DefaultProps>,
  element: HTMLElement,
) => {
  if (
    props.backgroundColor &&
    props.backgroundColor !== defaultProps.backgroundColor.default
  ) {
    if (props.backgroundColor in COLORS_DEFAULT) {
      element.style.setProperty(
        `--blocknote-background-${props.backgroundColor}`,
        COLORS_DEFAULT[props.backgroundColor].background,
      );
      element.style.backgroundColor = `var(--blocknote-background-${props.backgroundColor})`;
    } else {
      element.style.backgroundColor = props.backgroundColor;
    }
  }

  if (props.textColor && props.textColor !== defaultProps.textColor.default) {
    if (props.textColor in COLORS_DEFAULT) {
      element.style.setProperty(
        `--blocknote-text-${props.textColor}`,
        COLORS_DEFAULT[props.textColor].text,
      );
      element.style.color = `var(--blocknote-text-${props.textColor})`;
    } else {
      element.style.color = props.textColor;
    }
  }

  if (
    props.textAlignment &&
    props.textAlignment !== defaultProps.textAlignment.default
  ) {
    element.style.textAlign = props.textAlignment;
  }
};

export const getBackgroundColorAttribute = (
  attributeName = "backgroundColor",
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
        /var\(--blocknote-background-(.+)\)/,
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

export const getTextColorAttribute = (
  attributeName = "textColor",
): Attribute => ({
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

export const getTextAlignmentAttribute = (
  attributeName = "textAlignment",
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
