import {
  DefaultReactSuggestionItem,
  SuggestionMenuProps,
  useBlockNoteEditor,
} from "@blocknote/react";

// Custom component to replace the default Slash Menu.
export function CustomSlashMenu(
  props: SuggestionMenuProps<DefaultReactSuggestionItem>
) {
  const editor = useBlockNoteEditor();

  // Sorts items into their groups.
  const groups: Record<string, DefaultReactSuggestionItem[]> = {};
  for (const item of props.items) {
    const group = item.group || item.title;

    if (!groups[group]) {
      groups[group] = [];
    }

    groups[group].push(item);
  }

  // If query matches no items, shows "No matches" message.
  if (props.items.length === 0) {
    return <div className={"slash-menu"}>No matches</div>;
  }

  return (
    <div className={"slash-menu"}>
      {Object.entries(groups).map(([group, items]) => (
        // Component for each group
        <div key={group} className={"slash-menu-group"}>
          {/* Group label */}
          <div className={"slash-menu-label"}>{group}</div>
          {/* Group items */}
          <div className={"slash-menu-item-group"}>
            {items.map((item: DefaultReactSuggestionItem) => {
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
                    props.onItemClick?.(item);
                    editor.focus();
                  }}>
                  {Icon}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
