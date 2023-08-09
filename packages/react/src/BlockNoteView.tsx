import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { createStyles, MantineProvider } from "@mantine/core";
import { EditorContent } from "@tiptap/react";
import { HTMLAttributes, ReactNode } from "react";
import {
  BlockNoteComponentStyles,
  blockNoteToMantineTheme,
  Theme,
} from "./BlockNoteTheme";
import { FormattingToolbarPositioner } from "./FormattingToolbar/components/FormattingToolbarPositioner";
import { HyperlinkToolbarPositioner } from "./HyperlinkToolbar/components/HyperlinkToolbarPositioner";
import { SideMenuPositioner } from "./SideMenu/components/SideMenuPositioner";
import { SlashMenuPositioner } from "./SlashMenu/components/SlashMenuPositioner";

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
      className={
        props.className ? `${classes.root} ${props.className}` : classes.root
      }
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
    theme?: Partial<Theme | { light: Partial<Theme>; dark: Partial<Theme> }>;
    componentStyles?: BlockNoteComponentStyles;
    children?: ReactNode;
  } & HTMLAttributes<HTMLDivElement>
) {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "Editor",
  });

  const { theme, componentStyles, className, ...rest } = props;

  return (
    <MantineProvider theme={blockNoteToMantineTheme(theme, componentStyles)}>
      <UnThemedBlockNoteView
        className={
          props.className ? `${classes.root} ${props.className}` : classes.root
        }
        {...rest}
      />
    </MantineProvider>
  );
}
