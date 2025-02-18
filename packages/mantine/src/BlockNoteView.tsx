import {
  BlockSchema,
  InlineContentSchema,
  mergeCSSClasses,
  StyleSchema,
} from "@blocknote/core";
import {
  BlockNoteViewProps,
  BlockNoteViewRaw,
  ComponentsContext,
  useBlockNoteContext,
  usePrefersColorScheme,
} from "@blocknote/react";
import { MantineProvider } from "@mantine/core";
import { useCallback } from "react";
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
  SSchema extends StyleSchema
>(
  props: Omit<BlockNoteViewProps<BSchema, ISchema, SSchema>, "theme"> & {
    theme?:
      | "light"
      | "dark"
      | Theme
      | {
          light: Theme;
          dark: Theme;
        };
  }
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
            node
          );
          return;
        }

        applyBlockNoteCSSVariablesFromTheme(theme, node);
        return;
      }
    },
    [defaultColorScheme, theme]
  );

  return (
    <ComponentsContext.Provider value={components}>
      {/* `cssVariablesSelector` scopes Mantine CSS variables to only the editor, */}
      {/* as proposed here:  https://github.com/orgs/mantinedev/discussions/5685 */}
      <MantineProvider
        theme={mantineTheme}
        cssVariablesSelector=".bn-mantine"
        // This gets the element to set `data-mantine-color-scheme` on. Since we
        // don't need this attribute (we use our own theming API), we return
        // undefined here.
        getRootElement={() => undefined}>
        <BlockNoteViewRaw
          className={mergeCSSClasses("bn-mantine", className || "")}
          theme={typeof theme === "object" ? undefined : theme}
          {...rest}
          ref={ref}
        />
      </MantineProvider>
    </ComponentsContext.Provider>
  );
};
