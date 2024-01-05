export type CombinedColor = {
  text: string;
  background: string;
};

export type ColorScheme = {
  editor: CombinedColor;
  menu: CombinedColor;
  tooltip: CombinedColor;
  hovered: CombinedColor;
  selected: CombinedColor;
  disabled: CombinedColor;
  shadow: string;
  border: string;
  sideMenu: string;
  highlights: {
    gray: CombinedColor;
    brown: CombinedColor;
    red: CombinedColor;
    orange: CombinedColor;
    yellow: CombinedColor;
    green: CombinedColor;
    blue: CombinedColor;
    purple: CombinedColor;
    pink: CombinedColor;
  };
};

export type Theme = {
  colors: ColorScheme;
  borderRadius: number;
  fontFamily: string;
};

const camelCaseToKebabCase = (str: string) =>
  str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

const cssVariablesHelper = (
  theme: Theme,
  editorDOM: HTMLElement,
  unset = false
) => {
  // Colors
  for (const [colorSchemeKey, colorSchemeValue] of Object.entries(
    theme.colors
  )) {
    if (typeof colorSchemeValue === "string") {
      // Case for single colors
      const property = "--bn-colors-" + camelCaseToKebabCase(colorSchemeKey);
      if (unset) {
        editorDOM.style.removeProperty(property);
      } else {
        editorDOM.style.setProperty(property, colorSchemeValue);
      }
    } else if (typeof colorSchemeValue === "object") {
      if ("text" in colorSchemeValue && "background" in colorSchemeValue) {
        // Case for combined colors
        const textProperty =
          "--bn-colors-" + camelCaseToKebabCase(colorSchemeKey) + "-text";
        const backgroundProperty =
          "--bn-colors-" + camelCaseToKebabCase(colorSchemeKey) + "-background";
        if (unset) {
          editorDOM.style.removeProperty(textProperty);
          editorDOM.style.removeProperty(backgroundProperty);
        } else {
          editorDOM.style.setProperty(textProperty, colorSchemeValue.text);
          editorDOM.style.setProperty(
            backgroundProperty,
            colorSchemeValue.background
          );
        }
      } else {
        // Case for highlights
        for (const [highlightColorKey, highlightColorValue] of Object.entries(
          colorSchemeValue
        )) {
          const textProperty =
            "--bn-colors-" +
            camelCaseToKebabCase(colorSchemeKey) +
            "-" +
            camelCaseToKebabCase(highlightColorKey) +
            "-text";
          const backgroundProperty =
            "--bn-colors-" +
            camelCaseToKebabCase(colorSchemeKey) +
            "-" +
            camelCaseToKebabCase(highlightColorKey) +
            "-background";
          if (unset) {
            editorDOM.style.removeProperty(textProperty);
            editorDOM.style.removeProperty(backgroundProperty);
          } else {
            editorDOM.style.setProperty(textProperty, highlightColorValue.text);
            editorDOM.style.setProperty(
              backgroundProperty,
              highlightColorValue.background
            );
          }
        }
      }
    }
  }

  if (unset) {
    editorDOM.style.removeProperty("--bn-font-family");
    editorDOM.style.removeProperty("--bn-border-radius");
  } else {
    editorDOM.style.setProperty("--bn-font-family", theme.fontFamily);
    editorDOM.style.setProperty(
      "--bn-border-radius",
      `${theme.borderRadius}px`
    );
  }
};

export const applyBlockNoteCSSVariablesFromTheme = (
  theme: Theme,
  editorDOM: HTMLElement
) => cssVariablesHelper(theme, editorDOM);

// We don't need a theme to remove the CSS variables, but having access to a
// theme object allows us to use the same logic to set/unset them, so this
// placeholder theme is used.
const placeholderTheme: Theme = {
  colors: {
    editor: {
      text: undefined as any,
      background: undefined as any,
    },
    menu: {
      text: undefined as any,
      background: undefined as any,
    },
    tooltip: {
      text: undefined as any,
      background: undefined as any,
    },
    hovered: {
      text: undefined as any,
      background: undefined as any,
    },
    selected: {
      text: undefined as any,
      background: undefined as any,
    },
    disabled: {
      text: undefined as any,
      background: undefined as any,
    },
    shadow: undefined as any,
    border: undefined as any,
    sideMenu: undefined as any,
    highlights: {
      gray: {
        text: undefined as any,
        background: undefined as any,
      },
      brown: {
        text: undefined as any,
        background: undefined as any,
      },
      red: {
        text: undefined as any,
        background: undefined as any,
      },
      orange: {
        text: undefined as any,
        background: undefined as any,
      },
      yellow: {
        text: undefined as any,
        background: undefined as any,
      },
      green: {
        text: undefined as any,
        background: undefined as any,
      },
      blue: {
        text: undefined as any,
        background: undefined as any,
      },
      purple: {
        text: undefined as any,
        background: undefined as any,
      },
      pink: {
        text: undefined as any,
        background: undefined as any,
      },
    },
  },
  borderRadius: undefined as any,
  fontFamily: undefined as any,
};
export const removeBlockNoteCSSVariables = (editorDOM: HTMLElement) =>
  cssVariablesHelper(placeholderTheme, editorDOM, true);
