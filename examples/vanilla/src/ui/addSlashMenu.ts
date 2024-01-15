import {
  BlockNoteEditor,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  SuggestionItem,
} from "@blocknote/core";
import { createButton } from "./util";

export const addSlashMenu = async (editor: BlockNoteEditor) => {
  let element: HTMLElement;

  async function updateItems(
    query: string,
    getItems: (
      query: string
    ) => Promise<
      SuggestionItem<
        DefaultBlockSchema,
        DefaultInlineContentSchema,
        DefaultStyleSchema
      >[]
    >,
    onClick: (
      item: SuggestionItem<
        DefaultBlockSchema,
        DefaultInlineContentSchema,
        DefaultStyleSchema
      >
    ) => void
  ) {
    element.innerHTML = "";
    const items = await getItems(query);
    const domItems = items.map((val, i) => {
      const element = createButton(val.name, () => {
        onClick(val);
      });
      element.style.display = "block";
      return element;
    });
    element.append(...domItems);
    return domItems;
  }

  editor.suggestionMenus.slashMenu.onUpdate(async (slashMenuState) => {
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
      await updateItems(
        slashMenuState.query,
        editor.suggestionMenus.slashMenu.getItems,
        editor.suggestionMenus.slashMenu.executeItem
      );

      element.style.display = "block";

      element.style.top = slashMenuState.referencePos.top + "px";
      element.style.left =
        slashMenuState.referencePos.x - element.offsetWidth + "px";
    } else {
      element.style.display = "none";
    }
  });
};
