import { BlockNoteEditor } from "@blocknote/core";
import { EditorContent } from "@tiptap/react";

export function BlockNoteView(props: { editor: BlockNoteEditor | null }) {
  return <EditorContent editor={props.editor?.tiptapEditor || null} />;
}
