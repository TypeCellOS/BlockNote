import { locales } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

export default function App() {
  // We use the English, default dictionary
  const locale = locales["en"];

  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    // We override the `placeholders` in our dictionary
    dictionary: {
      ...locale,
      placeholders: {
        ...locale.placeholders,
        // We override the empty document placeholder
        emptyDocument: "Start typing..",
        // We override the default placeholder
        default: "Custom default placeholder",
        // We override the heading placeholder
        heading: "Custom heading placeholder",
      },
    },
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
