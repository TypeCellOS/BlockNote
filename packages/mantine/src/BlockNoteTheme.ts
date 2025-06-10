export type CombinedColor = Partial<{
  text: string;
  background: string;
}>;

export type ColorScheme = Partial<{
  editor: CombinedColor;
  menu: CombinedColor;
  tooltip: CombinedColor;
  hovered: CombinedColor;
  selected: CombinedColor;
  disabled: CombinedColor;
  shadow: string;
  border: string;
  sideMenu: string;
  highlights: Partial<{
    gray: CombinedColor;
    brown: CombinedColor;
    red: CombinedColor;
    orange: CombinedColor;
    yellow: CombinedColor;
    green: CombinedColor;
    blue: CombinedColor;
    purple: CombinedColor;
    pink: CombinedColor;
  }>;
}>;

export type Theme = Partial<{
  colors: ColorScheme;
  borderRadius: number;
  fontFamily: string;
}>;

type NestedObject = { [key: string]: number | string | NestedObject };

const cssVariablesHelper = (
  theme: Theme,
  editorDOM: HTMLElement,
  unset = false,
) => {
  const result: string[] = [];

  function traverse(current: NestedObject, currentKey = "--bn") {
    for (const key in current) {
      const kebabCaseKey = key
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase();
      const fullKey = `${currentKey}-${kebabCaseKey}`;

      if (typeof current[key] !== "object") {
        // Convert numbers to px
        if (typeof current[key] === "number") {
          current[key] = `${current[key]}px`;
        }

        if (unset) {
          editorDOM.style.removeProperty(fullKey);
        } else {
          editorDOM.style.setProperty(fullKey, current[key].toString());
        }
      } else {
        traverse(current[key] as NestedObject, fullKey);
      }
    }
  }

  traverse(theme);

  return result;
};

export const applyBlockNoteCSSVariablesFromTheme = (
  theme: Theme,
  editorDOM: HTMLElement,
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
