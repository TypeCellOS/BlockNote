import {
  BlockNoteView,
  HyperlinkToolbar,
  HyperlinkToolbarController,
  useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

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
        content: "Hover the link below to see the modified Hyperlink Toolbar",
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
    <BlockNoteView editor={editor} hyperlinkToolbar={false}>
      <HyperlinkToolbarController
        hyperlinkToolbar={(props) => (
          // TODO: We don't export the default buttons atm. Also, the edit button
          //  replaces the entire toolbar component when editing, which seems like a
          //  massive pain when you want to customize the hyperlink. Lots of
          //  refactoring probably needed here.
          <HyperlinkToolbar {...props}>
            <AlertButton {...props} />
          </HyperlinkToolbar>
        )}
      />
    </BlockNoteView>
  );
}
