import {
  BaseSlashMenuItem,
  BlockNoteEditor,
  DefaultBlockSchema,
} from "@blocknote/core";
import { createButton } from "./util";

export const addSlashMenu = (editor: BlockNoteEditor) => {
  let element: HTMLElement;

  function updateItems(
    items: BaseSlashMenuItem<DefaultBlockSchema>[],
    onClick: (item: BaseSlashMenuItem<DefaultBlockSchema>) => void,
    selected: number
  ) {
    element.innerHTML = "";
    const domItems = items.map((val, i) => {
      const element = createButton(val.name, () => {
        onClick(val);
      });
      element.style.display = "block";
      if (selected === i) {
        element.style.fontWeight = "bold";
      }
      return element;
    });
    element.append(...domItems);
    return domItems;
  }

  editor.slashMenu.onUpdate((slashMenuState) => {
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
      updateItems(
        slashMenuState.filteredItems,
        editor.slashMenu.itemCallback,
        slashMenuState.keyboardHoveredItemIndex
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
