import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import { EditorContent } from "@tiptap/react";
import { getBlockNoteTheme } from "./BlockNoteTheme";
import { ReactNode } from "react";
import { FormattingToolbarWrapper } from "./FormattingToolbar/components/FormattingToolbarWrapper";
import { HyperlinkToolbarWrapper } from "./HyperlinkToolbar/components/HyperlinkToolbarWrapper";
import { SlashMenuWrapper } from "./SlashMenu/components/SlashMenuWrapper";
import { SideMenuWrapper } from "./SideMenu/components/SideMenuWrapper";

export function BlockNoteView<BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
  children?: ReactNode;
}) {
  return (
    <MantineProvider theme={getBlockNoteTheme()}>
      <EditorContent editor={props.editor?._tiptapEditor}>
        {props.children || (
          <>
            <FormattingToolbarWrapper editor={props.editor} />
            <HyperlinkToolbarWrapper editor={props.editor} />
            <SlashMenuWrapper editor={props.editor} />
            <SideMenuWrapper editor={props.editor} />
          </>
        )}
      </EditorContent>
    </MantineProvider>
  );
}
