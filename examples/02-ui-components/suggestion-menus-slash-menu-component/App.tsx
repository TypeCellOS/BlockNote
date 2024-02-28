import {
  BlockNoteView,
  DefaultReactSuggestionItem,
  SuggestionMenuController,
  SuggestionMenuProps,
  useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import "./styles.css";

function CustomSlashMenu(
  props: SuggestionMenuProps<DefaultReactSuggestionItem>
) {
  return (
    <div className={"slash-menu"}>
      {props.items.map((item, index) => (
        <div
          className={`slash-menu-item${
            props.selectedIndex === index ? " selected" : ""
          }`}
          onClick={() => {
            // TODO: Should not be undefined since we use
            //  DefaultReactSuggestionItem
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
