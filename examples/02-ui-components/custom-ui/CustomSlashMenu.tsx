import { filterSuggestionItems } from "@blocknote/core";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useBlockNoteEditor,
} from "@blocknote/react";

export function CustomSlashMenu() {
  const editor = useBlockNoteEditor();

  return (
    // TODO: Type not being inferred from getItems?
    <SuggestionMenuController
      triggerCharacter={"/"}
      getItems={async (query) =>
        filterSuggestionItems(getDefaultReactSlashMenuItems(), query)
      }
      suggestionMenuComponent={(props) => {
        const groups: Record<
          string,
          ReturnType<typeof getDefaultReactSlashMenuItems>
        > = {};
        for (const item of props.items) {
          if (!groups[item.group]) {
            groups[item.group] = [];
          }

          groups[item.group].push(item);
        }

        // If query matches no items, show "No matches" message
        if (props.items.length === 0) {
          return <div className={"slash-menu"}>No matches</div>;
        }

        return (
          <div className={"slash-menu"}>
            {Object.entries(groups).map(([group, items]) => (
              // Component for each group
              <div key={group} className={"slash-menu-group"}>
                {/*Group label*/}
                <div className={"slash-menu-label"}>{group}</div>
                {/*Group items*/}
                <div className={"slash-menu-item-group"}>
                  {items.map(
                    (
                      item: ReturnType<
                        typeof getDefaultReactSlashMenuItems
                      >[number]
                    ) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.title}
                          className={`slash-menu-item${
                            props.items.indexOf(item) === props.selectedIndex
                              ? " active"
                              : ""
                          }`}
                          onClick={() => {
                            item.onItemClick(editor);
                            editor.focus();
                          }}>
                          {Icon}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }}
    />
  );
}
