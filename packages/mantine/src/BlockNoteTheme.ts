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

/**
 * Converts a {@link Theme} into a map of `--bn-*` CSS custom properties, for
 * passing declaratively via a `style` prop (e.g. to `BlockNoteViewRaw`, which
 * also forwards it to portal roots).
 */
export function themeToCSSVariables(theme: Theme): Record<string, string> {
  const variables: Record<string, string> = {};

  function traverse(current: NestedObject, currentKey = "--bn") {
    for (const key in current) {
      const kebabCaseKey = key
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase();
      const fullKey = `${currentKey}-${kebabCaseKey}`;
      const value = current[key];

      if (typeof value === "object") {
        traverse(value, fullKey);
      } else {
        // Convert numbers to px
        variables[fullKey] = typeof value === "number" ? `${value}px` : value;
      }
    }
  }

  traverse(theme);

  return variables;
}
