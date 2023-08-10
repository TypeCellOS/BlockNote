import { BlockNoteEditor, BlockSchema, mergeCSSClasses } from "@blocknote/core";
import { createStyles, MantineProvider } from "@mantine/core";
import { EditorContent } from "@tiptap/react";
import { HTMLAttributes, ReactNode, useEffect, useState } from "react";
import {
  BlockNoteComponentStyles,
  blockNoteToMantineTheme,
  Theme,
} from "./BlockNoteTheme";
import { FormattingToolbarPositioner } from "./FormattingToolbar/components/FormattingToolbarPositioner";
import { HyperlinkToolbarPositioner } from "./HyperlinkToolbar/components/HyperlinkToolbarPositioner";
import { SideMenuPositioner } from "./SideMenu/components/SideMenuPositioner";
import { SlashMenuPositioner } from "./SlashMenu/components/SlashMenuPositioner";
import { darkDefaultTheme, lightDefaultTheme } from "./defaultThemes";

// Helper function which takes a partial theme provided by the user, and turns
// it into a full theme. Either the light or dark theme is used, depending on
// which ones the user provided and the browser settings.
const getFullTheme = (
  browserTheme: "light" | "dark",
  theme:
    | Partial<
        | Theme
        | {
            light: Partial<Theme> & { type: "light" };
            dark: Partial<Theme> & { type: "dark" };
          }
      >
    | undefined
) => {
  // No theme is provided -> browser settings determine if default light or
  // dark theme is used.
  if (!theme) {
    return browserTheme === "dark" ? darkDefaultTheme : lightDefaultTheme;
  }

  // Both light & dark themes are provided -> browser settings determine if
  // provided light or dark theme is used.
  if ("light" in theme && "dark" in theme) {
    return browserTheme === "dark"
      ? {
          ...darkDefaultTheme,
          ...(theme.dark as Partial<Theme> & { type: "dark" }),
        }
      : {
          ...lightDefaultTheme,
          ...(theme.light as Partial<Theme> & { type: "light" }),
        };
  }

  // Only light theme is provided -> use provided light theme.
  if ("light" in theme) {
    return {
      ...lightDefaultTheme,
      ...(theme.light as Partial<Theme> & { type: "light" }),
    };
  }

  // Only dark theme is provided -> use provided dark theme.
  if ("dark" in theme) {
    return {
      ...darkDefaultTheme,
      ...(theme.dark as Partial<Theme> & { type: "dark" }),
    };
  }

  // Only single theme is provided -> use provided theme.
  return {
    ...((theme as Theme).type === "light"
      ? lightDefaultTheme
      : darkDefaultTheme),
    ...theme,
  };
};

function UnThemedBlockNoteView<BSchema extends BlockSchema>(
  props: {
    editor: BlockNoteEditor<BSchema>;
    children?: ReactNode;
  } & HTMLAttributes<HTMLDivElement>
) {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "Editor",
  });

  const { editor, children, className, ...rest } = props;

  return (
    <EditorContent
      editor={props.editor?._tiptapEditor}
      className={mergeCSSClasses(classes.root, props.className || "")}
      {...rest}>
      {props.children || (
        <>
          <FormattingToolbarPositioner editor={props.editor} />
          <HyperlinkToolbarPositioner editor={props.editor} />
          <SlashMenuPositioner editor={props.editor} />
          <SideMenuPositioner editor={props.editor} />
        </>
      )}
    </EditorContent>
  );
}

export function BlockNoteView<BSchema extends BlockSchema>(
  props: {
    editor: BlockNoteEditor<BSchema>;
    theme?: Partial<
      | Theme
      | {
          light: Partial<Theme> & { type: "light" };
          dark: Partial<Theme> & { type: "dark" };
        }
    >;
    componentStyles?: (theme: Theme) => BlockNoteComponentStyles;
    children?: ReactNode;
  } & HTMLAttributes<HTMLDivElement>
) {
  const { theme, componentStyles, ...rest } = props;

  const [fullTheme, setFullThemeType] = useState<Theme>(() => {
    const browserTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";

    return getFullTheme(browserTheme, theme);
  });

  // Automatically changes theme between light & dark when browser settings
  // change.
  useEffect(() => {
    const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
    const mqListener = (e: MediaQueryListEvent) =>
      setFullThemeType(getFullTheme(e.matches ? "dark" : "light", theme));
    darkThemeMq.addEventListener("change", mqListener);

    return () => darkThemeMq.removeEventListener("change", mqListener);
  }, []); //eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MantineProvider
      theme={blockNoteToMantineTheme(fullTheme, componentStyles?.(fullTheme))}>
      <UnThemedBlockNoteView {...rest} />
    </MantineProvider>
  );
}
