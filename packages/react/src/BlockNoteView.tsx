import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { EditorContent } from "@tiptap/react";
import { FormattingToolbar } from "./FormattingToolbar/components/FormattingToolbar";
import { SlashMenu2 } from "./SlashMenu/components/SlashMenu";
// import { BlockNoteTheme } from "./BlockNoteTheme";
// import { MantineProvider } from "@mantine/core";

export function BlockNoteView<BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema> | null;
}) {
  return (
    // TODO: Should we wrap editor in MantineProvider? Otherwise we have to duplicate color hex values.
    // <MantineProvider theme={BlockNoteTheme}>
    <>
      <EditorContent editor={props.editor?._tiptapEditor || null} />
      <FormattingToolbar editor={props.editor!} />
      <SlashMenu2 editor={props.editor!} />
    </>
    // </MantineProvider>
  );
}
