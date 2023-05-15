import { BlockNoteEditor } from "@blocknote/core";
import { Editor, EditorContent } from "@tiptap/react";
// import { BlockNoteTheme } from "./BlockNoteTheme";
// import { MantineProvider } from "@mantine/core";

export function BlockNoteView(props: { editor: BlockNoteEditor | null }) {
  return (
    // TODO: Should we wrap editor in MantineProvider? Otherwise we have to duplicate color hex values.
    // <MantineProvider theme={BlockNoteTheme}>
    // FIXME: Type error occurs here
    // error TS2322: Type '(Editor & { contentComponent: any; }) | null' is not assignable to type 'Editor | null'.
    // Type 'Editor & { contentComponent: any; }' is not assignable to type 'Editor | null'.
    //   Type 'Editor & { contentComponent: any; }' is not assignable to type 'Editor'.
    //     Types have separate declarations of a private property 'commandManager'.

    <EditorContent
      editor={(props.editor?._tiptapEditor as unknown as Editor) || null}
    />
    // </MantineProvider>
  );
}
