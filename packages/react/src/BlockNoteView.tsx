import { BlockNoteEditor } from "@blocknote/core";
import { EditorContent } from "@tiptap/react";
// import { BlockNoteTheme } from "./BlockNoteTheme";
// import { MantineProvider } from "@mantine/core";

export function BlockNoteView(props: { editor: BlockNoteEditor | null }) {
  return (
    // TODO: Should we wrap editor in MantineProvider? Otherwise we have to duplicate color hex values.
    // <MantineProvider theme={BlockNoteTheme}>
    <EditorContent editor={props.editor?.tiptapEditor || null} />
    // </MantineProvider>
  );
}
