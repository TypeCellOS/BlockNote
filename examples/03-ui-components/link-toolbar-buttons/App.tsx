import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  LinkToolbar,
  LinkToolbarController,
  useCreateBlockNote,
} from "@blocknote/react";

import { AlertButton } from "./AlertButton";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
        content: "Hover the link below to see the modified Link Toolbar",
      },
      {
        type: "paragraph",
        content: [
          {
            type: "link",
            href: "https://www.blocknotejs.org/",
            content: [
              {
                type: "text",
                text: "Home Page",
                styles: {},
              },
            ],
          },
        ],
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} linkToolbar={false}>
      <LinkToolbarController
        linkToolbar={(props) => (
          <LinkToolbar {...props}>
            <AlertButton {...props} />
          </LinkToolbar>
        )}
      />
    </BlockNoteView>
  );
}
