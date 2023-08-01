import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
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
    children?: ReactNode;
  } & HTMLAttributes<HTMLDivElement>
) {
  const { editor, children, ...rest } = props;

  return (
    <MantineProvider theme={getBlockNoteTheme()}>
      <EditorContent editor={props.editor?._tiptapEditor} {...rest}>
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
