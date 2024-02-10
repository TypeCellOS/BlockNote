import { BlockNoteEditor } from "@blocknote/core";
import { ReactSlashMenuItem, SlashMenuPositioner } from "@blocknote/react";
import {
  RiH1,
  RiH2,
  RiH3,
  RiListOrdered,
  RiListUnordered,
  RiText,
} from "react-icons/ri";

// Icons for slash menu items
const icons = {
  Paragraph: RiText,
  Heading: RiH1,
  "Heading 2": RiH2,
  "Heading 3": RiH3,
  "Numbered List": RiListOrdered,
  "Bullet List": RiListUnordered,
};

export const CustomSlashMenu = (props: { editor: BlockNoteEditor }) => {
  const editor = props.editor;

  return (
    <SlashMenuPositioner
      editor={editor}
      slashMenu={(props) => {
        // Sorts items by group
        const groups: Record<string, ReactSlashMenuItem[]> = {};
        for (const item of props.filteredItems) {
          if (!groups[item.group]) {
            groups[item.group] = [];
          }

          groups[item.group].push(item);
        }

        // If query matches no items, show "No matches" message
        if (props.filteredItems.length === 0) {
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
                  {items.map((item) => {
                    const Icon =
                      item.name in icons
                        ? icons[item.name as keyof typeof icons]
                        : "div";
                    return (
                      <button
                        key={item.name}
                        className={`slash-menu-item${
                          props.filteredItems.indexOf(item) ===
                          props.keyboardHoveredItemIndex
                            ? " active"
                            : ""
                        }`}
                        onClick={() => {
                          item.execute(editor);
                          editor.focus();
                        }}>
                        <Icon />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      }}
    />
  );
};
