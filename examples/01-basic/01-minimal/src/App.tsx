import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect } from "react";

export default function App() {
  // Creates a new editor instance with a default empty paragraph.
  const editor = useCreateBlockNote();

  // After the editor is created, replace its document with a ProseMirror
  // structure that includes a suggestion-paragraph before the blockContainer's paragraph.
  useEffect(() => {
    // Use editor.transact to dispatch a ProseMirror transaction that replaces
    // the entire document content.
    editor.transact((tr) => {
      const { nodes } = editor.pmSchema;

      // Build the suggestion-paragraph (shadow node for suggestions)
      const suggestionParagraph = nodes["suggestion-paragraph"].create(
        {
          backgroundColor: "default",
          textAlignment: "left",
          textColor: "default",
          __suggestionData: "true",
        },
        [editor.pmSchema.text("Hello from suggestion-paragraph!")],
      );

      // Build the main blockContent paragraph
      const mainParagraph = nodes.paragraph.create(
        {
          backgroundColor: "default",
          textAlignment: "left",
          textColor: "default",
        },
        [editor.pmSchema.text("Hello from blockContainer!")],
      );

      // Build the blockContainer with suggestion-paragraph before blockContent
      //
      // Target structure:
      //   doc
      //     └─ blockGroup
      //          └─ blockContainer
      //               ├─ suggestion-paragraph("Hello from suggestion-paragraph!")
      //               └─ paragraph("Hello from blockContainer!")
      const blockContainer = nodes.blockContainer.create(
        { id: "block-1" },
        [suggestionParagraph, mainParagraph],
      );

      const blockGroup = nodes.blockGroup.create(null, [blockContainer]);
      const newDoc = nodes.doc.create(null, [blockGroup]);

      tr.replaceWith(0, tr.doc.content.size, newDoc.content);
    });
  }, [editor]);

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
