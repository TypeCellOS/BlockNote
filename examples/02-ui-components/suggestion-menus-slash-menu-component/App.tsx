import { filterSuggestionItems } from "@blocknote/core";
import {
  BlockNoteView,
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  SuggestionMenuProps,
  useBlockNote,
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
  const editor = useBlockNote();

  // Renders the editor instance.
  // TODO: Shorthand to just pass the array
  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) =>
          // TODO: Shorthand and/or make optional
          filterSuggestionItems(getDefaultReactSlashMenuItems(editor), query)
        }
        suggestionMenuComponent={CustomSlashMenu}
      />
    </BlockNoteView>
  );
}
