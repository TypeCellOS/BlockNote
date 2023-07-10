import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { EditorContent } from "@tiptap/react";
import { FormattingToolbar } from "./FormattingToolbar/components/FormattingToolbar";
import { SlashMenu } from "./SlashMenu/components/SlashMenu";
import { HyperlinkToolbar } from "./HyperlinkToolbar/components/HyperlinkToolbar";
import { SideMenu } from "./BlockSideMenu/components/BlockSideMenu";
import { getBlockNoteTheme } from "./BlockNoteTheme";
import { MantineProvider } from "@mantine/core";

export function BlockNoteView<BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) {
  return (
    <MantineProvider theme={getBlockNoteTheme()}>
      <EditorContent editor={props.editor?._tiptapEditor || null} />
      <FormattingToolbar editor={props.editor!} />
      <HyperlinkToolbar editor={props.editor!} />
      <SideMenu editor={props.editor!} />
      <SlashMenu editor={props.editor!} />
    </MantineProvider>
  );
}
