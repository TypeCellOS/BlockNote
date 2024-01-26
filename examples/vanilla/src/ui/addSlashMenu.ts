import { BlockNoteEditor } from "@blocknote/core";
import { createButton } from "./util";

export const addSlashMenu = async (editor: BlockNoteEditor) => {
  let element: HTMLElement;

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

  editor.suggestionMenus.onUpdate("slashMenu", async (slashMenuState) => {
    if (!element) {
      element = document.createElement("div");
      element.style.background = "gray";
      element.style.position = "absolute";
      element.style.padding = "10px";
      element.style.opacity = "0.8";
      element.style.display = "none";

      document.getElementById("root")!.appendChild(element);
    }

    if (slashMenuState.show) {
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

      await updateItems(slashMenuState.query, getItems);

      element.style.display = "block";

      element.style.top = slashMenuState.referencePos.top + "px";
      element.style.left =
        slashMenuState.referencePos.x - element.offsetWidth + "px";
    } else {
      element.style.display = "none";
    }
  });
};
