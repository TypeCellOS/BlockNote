import "@blocknote/core/fonts/inter.css";
import {
  DefaultReactSuggestionItem,
  SuggestionMenuController,
  SuggestionMenuProps,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import "./styles.css";

// Custom component to replace the default Slash Menu.
function CustomSlashMenu(
  props: SuggestionMenuProps<DefaultReactSuggestionItem>
) {
  return (
    <div className={"slash-menu"}>
      {props.items.map((item, index) => (
        <div
          className={`slash-menu-item ${
            props.selectedIndex === index ? " selected" : ""
          }`}
          onClick={() => {
            props.onItemClick?.(item);
          }}>
          {item.title}
        </div>
      ))}
    </div>
  );
}

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
        content: "Press the '/' key to open the Slash Menu",
      },
      {
        type: "paragraph",
        content: "It's been replaced with a custom component",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter={"/"}
        suggestionMenuComponent={CustomSlashMenu}
      />
    </BlockNoteView>
  );
}
