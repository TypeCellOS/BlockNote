export const COLORS_DEFAULT = {
  gray: {
    text: "#9b9a97",
    background: "#ebeced",
  },
  brown: {
    text: "#64473a",
    background: "#e9e5e3",
  },
  red: {
    text: "#e03e3e",
    background: "#fbe4e4",
  },
  orange: {
    text: "#d9730d",
    background: "#f6e9d9",
  },
  yellow: {
    text: "#dfab01",
    background: "#fbf3db",
  },
  green: {
    text: "#4d6461",
    background: "#ddedea",
  },
  blue: {
    text: "#0b6e99",
    background: "#ddebf1",
  },
  purple: {
    text: "#6940a5",
    background: "#eae4f2",
  },
  pink: {
    text: "#ad1a72",
    background: "#f4dfeb",
  },
} as Record<string, { text: string; background: string }>;

/**
 * Returns the name of the theme color (see `COLORS_DEFAULT`) whose CSS value
 * the style property of an element has, or else that CSS value. The external
 * HTML writes a theme color as its CSS value, thus the parse gives back the
 * name of the color.
 */
export function colorFromStyle(
  element: HTMLElement,
  property: "color" | "backgroundColor",
): string {
  const value = element.style[property];
  const probe = element.ownerDocument.createElement("span");
  for (const [name, colors] of Object.entries(COLORS_DEFAULT)) {
    probe.style[property] =
      property === "color" ? colors.text : colors.background;
    if (probe.style[property] === value) {
      return name;
    }
  }
  return value;
}

export const COLORS_DARK_MODE_DEFAULT = {
  gray: {
    text: "#bebdb8",
    background: "#9b9a97",
  },
  brown: {
    text: "#8e6552",
    background: "#64473a",
  },
  red: {
    text: "#ec4040",
    background: "#be3434",
  },
  orange: {
    text: "#e3790d",
    background: "#b7600a",
  },
  yellow: {
    text: "#dfab01",
    background: "#b58b00",
  },
  green: {
    text: "#6b8b87",
    background: "#4d6461",
  },
  blue: {
    text: "#0e87bc",
    background: "#0b6e99",
  },
  purple: {
    text: "#8552d7",
    background: "#6940a5",
  },
  pink: {
    text: "#da208f",
    background: "#ad1a72",
  },
} as Record<string, { text: string; background: string }>;
