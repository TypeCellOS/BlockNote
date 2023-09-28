import { BlockNoteEditor, BlockSchema, mergeCSSClasses } from "@blocknote/core";
import { createStyles, MantineProvider } from "@mantine/core";
import { EditorContent } from "@tiptap/react";
import { HTMLAttributes, ReactNode, useMemo } from "react";
import usePrefersColorScheme from "use-prefers-color-scheme";
import { blockNoteToMantineTheme, Theme } from "./BlockNoteTheme";
import { FormattingToolbarPositioner } from "./FormattingToolbar/components/FormattingToolbarPositioner";
import { HyperlinkToolbarPositioner } from "./HyperlinkToolbar/components/HyperlinkToolbarPositioner";
import { SideMenuPositioner } from "./SideMenu/components/SideMenuPositioner";
import { SlashMenuPositioner } from "./SlashMenu/components/SlashMenuPositioner";
import { darkDefaultTheme, lightDefaultTheme } from "./defaultThemes";
import { ImageToolbarPositioner } from "./ImageToolbar/components/ImageToolbarPositioner";

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
          <ImageToolbarPositioner editor={props.editor} />
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

  const preferredTheme = usePrefersColorScheme();

  const mantineTheme = useMemo(() => {
    if (theme === "light") {
      return blockNoteToMantineTheme(lightDefaultTheme);
    }

    if (theme === "dark") {
      return blockNoteToMantineTheme(darkDefaultTheme);
    }

    if ("light" in theme && "dark" in theme) {
      return blockNoteToMantineTheme(
        theme[preferredTheme === "dark" ? "dark" : "light"]
      );
    }

    return blockNoteToMantineTheme(theme);
  }, [preferredTheme, theme]);

  return (
    <MantineProvider theme={mantineTheme}>
      <BaseBlockNoteView {...rest} />
    </MantineProvider>
  );
}
