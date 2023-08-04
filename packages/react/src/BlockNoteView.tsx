import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { createStyles, MantineProvider } from "@mantine/core";
import { EditorContent } from "@tiptap/react";
import { HTMLAttributes, ReactNode } from "react";
import { getBlockNoteTheme } from "./BlockNoteTheme";
import { FormattingToolbarPositioner } from "./FormattingToolbar/components/FormattingToolbarPositioner";
import { HyperlinkToolbarPositioner } from "./HyperlinkToolbar/components/HyperlinkToolbarPositioner";
import { SideMenuPositioner } from "./SideMenu/components/SideMenuPositioner";
import { SlashMenuPositioner } from "./SlashMenu/components/SlashMenuPositioner";

export function BlockNoteView<BSchema extends BlockSchema>(
  props: {
    editor: BlockNoteEditor<BSchema>;
    theme?: "light" | "dark";
    children?: ReactNode;
  } & HTMLAttributes<HTMLDivElement>
) {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "Editor",
  });

  const { editor, children, theme, className, ...rest } = props;

  return (
    <MantineProvider theme={getBlockNoteTheme(props.theme === "dark")}>
      <EditorContent
        editor={props.editor?._tiptapEditor}
        className={
          props.className ? `${classes.root} ${props.className}` : classes.root
        }
        {...rest}>
        <p>Test</p>
        {props.children || (
          <>
            <FormattingToolbarPositioner editor={props.editor} />
            <HyperlinkToolbarPositioner editor={props.editor} />
            <SlashMenuPositioner editor={props.editor} />
            <SideMenuPositioner editor={props.editor} />
          </>
        )}
      </EditorContent>
    </MantineProvider>
  );
}
