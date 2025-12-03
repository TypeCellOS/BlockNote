import { Attribute } from "@tiptap/core";
import { z } from "zod/v4";

import { COLORS_DEFAULT } from "../editor/defaultColors.js";
import { createPropSchemaFromZod, type Props } from "../schema/index.js";

// TODO: this system should probably be moved / refactored.
// The dependency from schema on this file doesn't make sense

export const defaultZodPropSchema = z.object({
  backgroundColor: z.string().default("default"),
  textColor: z.string().default("default"),
  textAlignment: z.enum(["left", "center", "right", "justify"]).default("left"),
});

export const defaultPropSchema = createPropSchemaFromZod(defaultZodPropSchema);
export type DefaultPropSchema = Props<typeof defaultPropSchema>;

const defaultValues = defaultZodPropSchema.parse({});

// TODO: review below
export const parseDefaultProps = (element: HTMLElement) => {
  const props: Partial<DefaultPropSchema> = {};

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

  props.textAlignment = defaultZodPropSchema.shape.textAlignment._zod.values
    .values()
    .some(
      (value) =>
        value ===
        (element.style.textAlign as DefaultPropSchema["textAlignment"]),
    )
    ? (element.style.textAlign as DefaultPropSchema["textAlignment"])
    : undefined;

  return props;
};

export const addDefaultPropsExternalHTML = (
  props: Partial<DefaultPropSchema>,
  element: HTMLElement,
) => {
  if (
    props.backgroundColor &&
    props.backgroundColor !== defaultValues.backgroundColor
  ) {
    // The color can be any string. If the string matches one of the default
    // theme color names, set the theme color. Otherwise, set the color as-is
    // (may be a CSS color name, hex value, RGB value, etc).
    element.style.backgroundColor =
      props.backgroundColor in COLORS_DEFAULT
        ? COLORS_DEFAULT[props.backgroundColor].background
        : props.backgroundColor;
  }

  if (props.textColor && props.textColor !== defaultValues.textColor) {
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
    props.textAlignment !== defaultValues.textAlignment
  ) {
    element.style.textAlign = props.textAlignment;
  }
};

export const getBackgroundColorAttribute = (
  attributeName = "backgroundColor",
): Attribute => ({
  default: defaultValues.backgroundColor,
  parseHTML: (element) => {
    if (element.hasAttribute("data-background-color")) {
      return element.getAttribute("data-background-color")!;
    }

    if (element.style.backgroundColor) {
      return element.style.backgroundColor;
    }

    return defaultValues.backgroundColor;
  },
  renderHTML: (attributes) => {
    if (attributes[attributeName] === defaultValues.backgroundColor) {
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
  default: defaultValues.textColor,
  parseHTML: (element) => {
    if (element.hasAttribute("data-text-color")) {
      return element.getAttribute("data-text-color")!;
    }

    if (element.style.color) {
      return element.style.color;
    }

    return defaultValues.textColor;
  },
  renderHTML: (attributes) => {
    if (attributes[attributeName] === defaultValues.textColor) {
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
  default: defaultValues.textAlignment,
  parseHTML: (element) => {
    if (element.hasAttribute("data-text-alignment")) {
      return element.getAttribute("data-text-alignment");
    }

    if (element.style.textAlign) {
      return element.style.textAlign;
    }

    return defaultValues.textAlignment;
  },
  renderHTML: (attributes) => {
    if (attributes[attributeName] === defaultValues.textAlignment) {
      return {};
    }

    return {
      "data-text-alignment": attributes[attributeName],
    };
  },
});
