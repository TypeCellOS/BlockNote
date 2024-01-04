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

export const applyCSSVariablesFromTheme = (
  theme: Theme,
  editorDOM: HTMLElement
) => {
  editorDOM.style.setProperty(
    "--bn-color-editor-text",
    theme.colors.editor.text
  );
  editorDOM.style.setProperty(
    "--bn-color-editor-background",
    theme.colors.editor.background
  );
  editorDOM.style.setProperty("--bn-color-menu-text", theme.colors.menu.text);
  editorDOM.style.setProperty(
    "--bn-color-menu-background",
    theme.colors.menu.background
  );
  editorDOM.style.setProperty(
    "--bn-color-tooltip-text",
    theme.colors.tooltip.text
  );
  editorDOM.style.setProperty(
    "--bn-color-tooltip-background",
    theme.colors.tooltip.background
  );
  editorDOM.style.setProperty(
    "--bn-color-hovered-text",
    theme.colors.hovered.text
  );
  editorDOM.style.setProperty(
    "--bn-color-hovered-background",
    theme.colors.hovered.background
  );
  editorDOM.style.setProperty(
    "--bn-color-selected-text",
    theme.colors.selected.text
  );
  editorDOM.style.setProperty(
    "--bn-color-selected-background",
    theme.colors.selected.background
  );
  editorDOM.style.setProperty(
    "--bn-color-disabled-text",
    theme.colors.disabled.text
  );
  editorDOM.style.setProperty(
    "--bn-color-disabled-background",
    theme.colors.disabled.background
  );

  editorDOM.style.setProperty("--bn-color-shadow", theme.colors.shadow);
  editorDOM.style.setProperty("--bn-color-border", theme.colors.border);
  editorDOM.style.setProperty("--bn-color-side-menu", theme.colors.sideMenu);

  editorDOM.style.setProperty(
    "--bn-color-highlight-text-gray",
    theme.colors.highlights.gray.text
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-background-gray",
    theme.colors.highlights.gray.background
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-text-brown",
    theme.colors.highlights.brown.text
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-background-brown",
    theme.colors.highlights.brown.background
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-text-red",
    theme.colors.highlights.red.text
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-background-red",
    theme.colors.highlights.red.background
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-text-orange",
    theme.colors.highlights.orange.text
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-background-orange",
    theme.colors.highlights.orange.background
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-text-yellow",
    theme.colors.highlights.yellow.text
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-background-yellow",
    theme.colors.highlights.yellow.background
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-text-green",
    theme.colors.highlights.green.text
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-background-green",
    theme.colors.highlights.green.background
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-text-blue",
    theme.colors.highlights.blue.text
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-background-blue",
    theme.colors.highlights.blue.background
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-text-purple",
    theme.colors.highlights.purple.text
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-background-purple",
    theme.colors.highlights.purple.background
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-text-pink",
    theme.colors.highlights.pink.text
  );
  editorDOM.style.setProperty(
    "--bn-color-highlight-background-pink",
    theme.colors.highlights.pink.background
  );

  editorDOM.style.setProperty("--bn-font-family", theme.fontFamily);
  editorDOM.style.setProperty("--bn-border-radius", `${theme.borderRadius}px`);
};
