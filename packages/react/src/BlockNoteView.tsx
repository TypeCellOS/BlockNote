import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import { EditorContent } from "@tiptap/react";
import { getBlockNoteTheme } from "./BlockNoteTheme";
import { SideMenuWrapper } from "./SideMenu/components/SideMenuWrapper";
import { FormattingToolbarWrapper } from "./FormattingToolbar/components/FormattingToolbarWrapper";
import { HyperlinkToolbarWrapper } from "./HyperlinkToolbar/components/HyperlinkToolbarWrapper";
import { SlashMenuWrapper } from "./SlashMenu/components/SlashMenuWrapper";

export function BlockNoteView<BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) {
  return (
    <MantineProvider theme={getBlockNoteTheme()}>
      <EditorContent editor={props.editor?._tiptapEditor}>
        <SideMenuWrapper editor={props.editor!} />
        <FormattingToolbarWrapper editor={props.editor!} />
        <HyperlinkToolbarWrapper editor={props.editor!} />
        <SlashMenuWrapper editor={props.editor!} />
      </EditorContent>
    </MantineProvider>
  );
}
