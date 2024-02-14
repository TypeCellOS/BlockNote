import { BlockNoteEditor } from "@blocknote/core";
import { createButton } from "./util";

export const addSlashMenu = async (editor: BlockNoteEditor) => {
  const element = document.createElement("div");
  element.style.background = "gray";
  element.style.display = "none";
  element.style.opacity = "0.8";
  element.style.padding = "10px";
  element.style.position = "absolute";

  const getItems = async (query: string) => {
    const items = [
      {
        text: "Heading",
        aliases: ["h", "heading1", "h1"],
        executeItem: () => {
          editor.suggestionMenus.closeMenu();
          editor.suggestionMenus.clearQuery();

          editor.insertBlocks(
            [
              {
                type: "heading",
              },
            ],
            editor.getTextCursorPosition().block,
            "after"
          );
        },
      },
      {
        text: "List",
        aliases: ["ul", "li", "list", "bulletlist", "bullet list"],
        executeItem: () => {
          editor.suggestionMenus.closeMenu();
          editor.suggestionMenus.clearQuery();

          editor.insertBlocks(
            [
              {
                type: "bulletListItem",
              },
            ],
            editor.getTextCursorPosition().block,
            "after"
          );
        },
      },
      {
        text: "Paragraph",
        aliases: ["p", "paragraph"],
        executeItem: () => {
          editor.suggestionMenus.closeMenu();
          editor.suggestionMenus.clearQuery();

          editor.insertBlocks(
            [
              {
                type: "paragraph",
              },
            ],
            editor.getTextCursorPosition().block,
            "after"
          );
        },
      },
    ];

    return items.filter(
      ({ text, aliases }) =>
        text.toLowerCase().startsWith(query.toLowerCase()) ||
        (aliases &&
          aliases.filter((alias) =>
            alias.toLowerCase().startsWith(query.toLowerCase())
          ).length !== 0)
    );
  };

  async function updateItems(
    query: string,
    getItems: (query: string) => Promise<any[]>
  ) {
    element.innerHTML = "";
    const items = await getItems(query);
    const domItems = items.map((val) => {
      const element = createButton(val.text, () => {
        val.executeItem();
      });
      element.style.display = "block";
      return element;
    });
    element.append(...domItems);
    return domItems;
  }

  editor.suggestionMenus.onUpdate("/", async (state) => {
    if (state.show) {
      await updateItems(state.query, getItems);

      element.style.display = "block";

      element.style.top = state.referencePos.top + "px";
      element.style.left = state.referencePos.x - element.offsetWidth + "px";
    } else {
      element.style.display = "none";
    }
  });
};
