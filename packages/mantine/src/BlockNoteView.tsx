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
import React, { useContext, useMemo } from "react";
import { Theme, themeToCSSVariables } from "./BlockNoteTheme.js";
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

  // Mantine's theming for BlockNote's themed root elements (the editor
  // container, `editor.portalElement`, portal roots): the color-scheme
  // attribute the stylesheet keys off, plus CSS variables for custom object
  // themes. `BlockNoteViewRaw` applies these to every root, so they all update
  // in the same commit.
  const themedRootProps = useMemo(() => {
    const themeCSSVariables =
      typeof theme !== "object"
        ? undefined
        : "light" in theme && "dark" in theme
          ? themeToCSSVariables(
              theme[defaultColorScheme === "dark" ? "dark" : "light"],
            )
          : themeToCSSVariables(theme);

    return {
      "data-mantine-color-scheme": finalTheme,
      style: themeCSSVariables,
    };
  }, [defaultColorScheme, theme, finalTheme]);

  const mantineContext = useContext(MantineContext);

  const view = (
    <ComponentsContext.Provider value={components}>
      <BlockNoteViewRaw
        className={mergeCSSClasses("bn-mantine", className || "")}
        themedRootProps={themedRootProps}
        theme={typeof theme === "object" ? undefined : theme}
        editor={editor}
        {...rest}
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
