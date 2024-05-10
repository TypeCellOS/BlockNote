import { locales } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    // Passes the Dutch (NL) dictionary to the editor instance.
    // You can also provide your own dictionary here to customize the strings used in the editor,
    // or submit a Pull Request to add support for your language of your choice
    dictionary: locales.nl,
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
