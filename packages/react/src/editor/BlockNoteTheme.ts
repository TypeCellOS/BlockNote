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
  highlightColors: {
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

export const themeToCSSVariables = (theme: Theme) => {
  document.documentElement.style.setProperty(
    "--bn-color-editor-text",
    theme.colors.editor.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-editor-background",
    theme.colors.editor.background
  );
  document.documentElement.style.setProperty(
    "--bn-color-menu-text",
    theme.colors.menu.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-menu-background",
    theme.colors.menu.background
  );
  document.documentElement.style.setProperty(
    "--bn-color-tooltip-text",
    theme.colors.tooltip.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-tooltip-background",
    theme.colors.tooltip.background
  );
  document.documentElement.style.setProperty(
    "--bn-color-hovered-text",
    theme.colors.hovered.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-hovered-background",
    theme.colors.hovered.background
  );
  document.documentElement.style.setProperty(
    "--bn-color-selected-text",
    theme.colors.selected.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-selected-background",
    theme.colors.selected.background
  );
  document.documentElement.style.setProperty(
    "--bn-color-disabled-text",
    theme.colors.disabled.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-disabled-background",
    theme.colors.disabled.background
  );

  document.documentElement.style.setProperty(
    "--bn-color-shadow",
    theme.colors.shadow
  );
  document.documentElement.style.setProperty(
    "--bn-shadow-medium",
    "0 4px 12px var(--bn-color-shadow)"
  );

  document.documentElement.style.setProperty(
    "--bn-color-border",
    theme.colors.border
  );
  document.documentElement.style.setProperty(
    "--bn-border",
    "1px solid var(--bn-color-border)"
  );
  document.documentElement.style.setProperty(
    "--bn-shadow-light",
    "0 2px 6px var(--bn-color-border)"
  );

  document.documentElement.style.setProperty(
    "--bn-color-side-menu",
    theme.colors.sideMenu
  );

  document.documentElement.style.setProperty(
    "--bn-color-highlight-text-gray",
    theme.colors.highlightColors.gray.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-background-gray",
    theme.colors.highlightColors.gray.background
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-text-brown",
    theme.colors.highlightColors.brown.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-background-brown",
    theme.colors.highlightColors.brown.background
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-text-red",
    theme.colors.highlightColors.red.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-background-red",
    theme.colors.highlightColors.red.background
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-text-orange",
    theme.colors.highlightColors.orange.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-background-orange",
    theme.colors.highlightColors.orange.background
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-text-yellow",
    theme.colors.highlightColors.yellow.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-background-yellow",
    theme.colors.highlightColors.yellow.background
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-text-green",
    theme.colors.highlightColors.green.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-background-green",
    theme.colors.highlightColors.green.background
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-text-blue",
    theme.colors.highlightColors.blue.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-background-blue",
    theme.colors.highlightColors.blue.background
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-text-purple",
    theme.colors.highlightColors.purple.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-background-purple",
    theme.colors.highlightColors.purple.background
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-text-pink",
    theme.colors.highlightColors.pink.text
  );
  document.documentElement.style.setProperty(
    "--bn-color-highlight-background-pink",
    theme.colors.highlightColors.pink.background
  );

  document.documentElement.style.setProperty(
    "--bn-font-family",
    theme.fontFamily
  );

  document.documentElement.style.setProperty(
    "--bn-border-radius",
    `${theme.borderRadius}px`
  );
  document.documentElement.style.setProperty(
    "--bn-border-radius-small",
    `max(var(--bn-border-radius) - 2px, 1px)`
  );
  document.documentElement.style.setProperty(
    "--bn-border-radius-medium",
    `var(--bn-border-radius)`
  );
  document.documentElement.style.setProperty(
    "--bn-border-radius-large",
    `max(var(--bn-border-radius) + 2px, 1px)`
  );
};
