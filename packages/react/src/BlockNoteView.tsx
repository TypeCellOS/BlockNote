import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { MantineProvider } from "@mantine/core";
import { EditorContent } from "@tiptap/react";
import { getBlockNoteTheme } from "./BlockNoteTheme";
import { SideMenu } from "./BlockSideMenu/components/BlockSideMenu";
import { FormattingToolbar } from "./FormattingToolbar/components/FormattingToolbar";
import { HyperlinkToolbar } from "./HyperlinkToolbar/components/HyperlinkToolbar";
import { SlashMenu } from "./SlashMenu/components/SlashMenu";

export function BlockNoteView<BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) {
  return (
    <MantineProvider theme={getBlockNoteTheme()}>
      <EditorContent editor={props.editor?._tiptapEditor}>
        <SideMenu editor={props.editor!} />
        <FormattingToolbar editor={props.editor!} />
        <HyperlinkToolbar editor={props.editor!} />
        <SlashMenu editor={props.editor!} />
      </EditorContent>
    </MantineProvider>
  );
}
