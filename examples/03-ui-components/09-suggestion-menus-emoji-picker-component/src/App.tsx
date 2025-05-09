import "@blocknote/core/fonts/inter.css";
import {
  DefaultReactGridSuggestionItem,
  GridSuggestionMenuController,
  GridSuggestionMenuProps,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import "./styles.css";

// Custom component to replace the default Emoji Picker.
function CustomEmojiPicker(
  props: GridSuggestionMenuProps<DefaultReactGridSuggestionItem>
) {
  return (
    <div
      className={"emoji-picker"}
      style={
        { gridTemplateColumns: `repeat(${props.columns || 1}, 1fr)` } as any
      }>
      {props.items.map((item, index) => (
        <div
          className={`emoji-picker-item ${
            props.selectedIndex === index ? " selected" : ""
          }`}
          onClick={() => {
            props.onItemClick?.(item);
          }}>
          {item.icon}
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
        content: "Press the ':' key to open the Emoji Picker",
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
    <BlockNoteView editor={editor} emojiPicker={false}>
      <GridSuggestionMenuController
        triggerCharacter={":"}
        gridSuggestionMenuComponent={CustomEmojiPicker}
        columns={10}
        minQueryLength={2}
      />
    </BlockNoteView>
  );
}
