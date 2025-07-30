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
import { MantineProvider } from "@mantine/core";
import React, { useCallback } from "react";
import {
  applyBlockNoteCSSVariablesFromTheme,
  removeBlockNoteCSSVariables,
  Theme,
} from "./BlockNoteTheme.js";
import { components } from "./components.js";
import "./style.css";

const mantineTheme = {
  // Removes button press effect
  activeClassName: "",
};

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
  const { className, theme, ...rest } = props;

  const existingContext = useBlockNoteContext();
  const systemColorScheme = usePrefersColorScheme();
  const defaultColorScheme =
    existingContext?.colorSchemePreference || systemColorScheme;

  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) {
        // todo: clean variables?
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

  const finalTheme =
    typeof theme === "string"
      ? theme
      : defaultColorScheme !== "no-preference"
        ? defaultColorScheme
        : "light";

  return (
    <ComponentsContext.Provider value={components}>
      <MantineProvider
        theme={mantineTheme}
        // Scopes Mantine CSS variables to only the editor, as proposed here:
        // https://github.com/orgs/mantinedev/discussions/5685
        cssVariablesSelector=".bn-mantine"
        // This gets the element to set `data-mantine-color-scheme` on. This
        // element needs to already be rendered, so we can't set it to the
        // editor container element. Instead, we set it to `undefined` and set it
        // manually in `BlockNoteViewRaw`.
        getRootElement={() => undefined}
      >
        <BlockNoteViewRaw
          data-mantine-color-scheme={finalTheme}
          className={mergeCSSClasses("bn-mantine", className || "")}
          theme={typeof theme === "object" ? undefined : theme}
          {...rest}
          ref={ref}
        />
      </MantineProvider>
    </ComponentsContext.Provider>
  );
};
