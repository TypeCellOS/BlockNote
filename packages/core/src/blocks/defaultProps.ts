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

export const parseDefaultProps = (element: HTMLElement) => {
  const props: Partial<DefaultProps> = {};

  // If the `data-` attribute is found, set the prop to the value, as this most
  // likely means the parsed element was exported by BlockNote originally.
  // Otherwise, just use whatever is found in the inline styles, if anything.
  if (element.hasAttribute("data-background-color")) {
    props.backgroundColor = element.getAttribute("data-background-color")!;
  } else if (element.style.backgroundColor) {
    props.backgroundColor = element.style.backgroundColor;
  }

  // If the `data-` attribute is found, set the prop to the value, as this most
  // likely means the parsed element was exported by BlockNote originally.
  // Otherwise, just use whatever is found in the inline styles, if anything.
  if (element.hasAttribute("data-text-color")) {
    props.textColor = element.getAttribute("data-text-color")!;
  } else if (element.style.color) {
    props.textColor = element.style.color;
  }

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
    // The color can be any string. If the string matches one of the default
    // theme color names, set the theme color. Otherwise, set the color as-is
    // (may be a CSS color name, hex value, RGB value, etc).
    element.style.backgroundColor =
      props.backgroundColor in COLORS_DEFAULT
        ? COLORS_DEFAULT[props.backgroundColor].background
        : props.backgroundColor;
  }

  if (props.textColor && props.textColor !== defaultProps.textColor.default) {
    // The color can be any string. If the string matches one of the default
    // theme color names, set the theme color. Otherwise, set the color as-is
    // (may be a CSS color name, hex value, RGB value, etc).
    element.style.color =
      props.textColor in COLORS_DEFAULT
        ? COLORS_DEFAULT[props.textColor].text
        : props.textColor;
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
      return element.getAttribute("data-background-color")!;
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

export const getTextColorAttribute = (
  attributeName = "textColor",
): Attribute => ({
  default: defaultProps.textColor.default,
  parseHTML: (element) => {
    if (element.hasAttribute("data-text-color")) {
      return element.getAttribute("data-text-color")!;
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
