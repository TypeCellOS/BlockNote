import { BlockNoteEditor, BlockSchema, mergeCSSClasses } from "@blocknote/core";
import { createStyles, MantineProvider } from "@mantine/core";
import { EditorContent } from "@tiptap/react";
import { HTMLAttributes, ReactNode, useEffect, useMemo, useState } from "react";
import { blockNoteToMantineTheme, Theme } from "./BlockNoteTheme";
import { FormattingToolbarPositioner } from "./FormattingToolbar/components/FormattingToolbarPositioner";
import { HyperlinkToolbarPositioner } from "./HyperlinkToolbar/components/HyperlinkToolbarPositioner";
import { SideMenuPositioner } from "./SideMenu/components/SideMenuPositioner";
import { SlashMenuPositioner } from "./SlashMenu/components/SlashMenuPositioner";
import { darkDefaultTheme, lightDefaultTheme } from "./defaultThemes";

// Renders the editor as well as all menus & toolbars using default styles.
function BaseBlockNoteView<BSchema extends BlockSchema>(
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
    theme?:
      | "light"
      | "dark"
      | Theme
      | {
          light: Theme;
          dark: Theme;
        };
    children?: ReactNode;
  } & HTMLAttributes<HTMLDivElement>
) {
  const {
    theme = { light: lightDefaultTheme, dark: darkDefaultTheme },
    ...rest
  } = props;

  const [browserTheme, setBrowserTheme] = useState<"light" | "dark">(
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  // Automatically changes theme between light & dark when browser settings
  // change.
  useEffect(() => {
    const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
    const mqListener = (e: MediaQueryListEvent) =>
      setBrowserTheme(e.matches ? "dark" : "light");
    darkThemeMq.addEventListener("change", mqListener);

    return () => darkThemeMq.removeEventListener("change", mqListener);
  }, []); //eslint-disable-line react-hooks/exhaustive-deps

  const mantineTheme = useMemo(() => {
    if (theme === "light") {
      return blockNoteToMantineTheme(lightDefaultTheme);
    }

    if (theme === "dark") {
      return blockNoteToMantineTheme(darkDefaultTheme);
    }

    if ("light" in theme && "dark" in theme) {
      return blockNoteToMantineTheme(theme[browserTheme]);
    }

    return blockNoteToMantineTheme(theme);
  }, [browserTheme, theme]);

  return (
    <MantineProvider theme={mantineTheme}>
      <BaseBlockNoteView {...rest} />
    </MantineProvider>
  );
}
