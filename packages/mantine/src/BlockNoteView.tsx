import {
  BlockSchema,
  InlineContentSchema,
  mergeCSSClasses,
  StyleSchema,
} from "@blocknote/core";
import {
  BlockNoteViewRaw,
  ComponentsContext,
  useBlockNoteContext,
  usePrefersColorScheme,
} from "@blocknote/react";
import { MantineContext, MantineProvider } from "@mantine/core";
import React, { useCallback, useContext, useEffect } from "react";
import {
  applyBlockNoteCSSVariablesFromTheme,
  removeBlockNoteCSSVariables,
  Theme,
} from "./BlockNoteTheme.js";
import { components } from "./components.js";

export const BlockNoteView = <
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  props: Omit<
    React.ComponentProps<typeof BlockNoteViewRaw<BSchema, ISchema, SSchema>>,
    "theme"
  > & {
    theme?:
      | "light"
      | "dark"
      | Theme
      | {
          light: Theme;
          dark: Theme;
        };
  },
) => {
  const { className, theme, editor, ...rest } = props;

  const existingContext = useBlockNoteContext();
  const systemColorScheme = usePrefersColorScheme();
  const defaultColorScheme =
    existingContext?.colorSchemePreference || systemColorScheme;

  const finalTheme =
    typeof theme === "string"
      ? theme
      : defaultColorScheme !== "no-preference"
        ? defaultColorScheme
        : "light";

  const applyThemeVariables = useCallback(
    (node: HTMLElement | null) => {
      if (!node) {
        return;
      }

      removeBlockNoteCSSVariables(node);

      if (typeof theme === "object") {
        if ("light" in theme && "dark" in theme) {
          applyBlockNoteCSSVariablesFromTheme(
            theme[defaultColorScheme === "dark" ? "dark" : "light"],
            node,
          );
          return;
        }

        applyBlockNoteCSSVariablesFromTheme(theme, node);
        return;
      }
    },
    [defaultColorScheme, theme],
  );

  useEffect(() => {
    if (!editor.portalElement) {
      throw new Error("Portal element not found");
    }
    editor.portalElement.setAttribute("data-mantine-color-scheme", finalTheme);
    applyThemeVariables(editor.portalElement);
  }, [editor, applyThemeVariables, finalTheme]);

  const mantineContext = useContext(MantineContext);

  const view = (
    <ComponentsContext.Provider value={components}>
      <BlockNoteViewRaw
        data-mantine-color-scheme={finalTheme}
        className={mergeCSSClasses("bn-mantine", className || "")}
        theme={typeof theme === "object" ? undefined : theme}
        editor={editor}
        {...rest}
        ref={applyThemeVariables}
      />
    </ComponentsContext.Provider>
  );

  if (mantineContext) {
    return view;
  }

  return (
    <MantineProvider
      // By default, Mantine adds its CSS variables to the root. This disables
      // that, as we instead set the variables on `.bn-mantine` in
      // `mantineStyles.css`.
      withCssVariables={false}
      // This gets the element to set `data-mantine-color-scheme` on. This
      // element needs to already be rendered, so we can't set it to the
      // editor container element. Instead, we set it to `undefined` and set it
      // manually in `BlockNoteViewRaw`.
      getRootElement={() => undefined}
    >
      {view}
    </MantineProvider>
  );
};
