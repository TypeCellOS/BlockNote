import {
  BaseSlashMenuItem,
  DefaultBlockSchema,
  SuggestionsMenuFactory,
} from "@blocknote/core";
import { createButton } from "./util";

/**
 * This menu is drawn when the cursor is moved to a hyperlink (using the keyboard),
 * or when the mouse is hovering over a hyperlink
 */
export const slashMenuFactory: SuggestionsMenuFactory<
  BaseSlashMenuItem<DefaultBlockSchema>
> = (staticParams) => {
  const container = document.createElement("div");
  container.style.background = "gray";
  container.style.position = "absolute";
  container.style.padding = "10px";
  container.style.opacity = "0.8";
  container.style.display = "none";
  document.body.appendChild(container);

  function updateItems(
    items: BaseSlashMenuItem<DefaultBlockSchema>[],
    onClick: (item: BaseSlashMenuItem<DefaultBlockSchema>) => void,
    selected: number
  ) {
    container.innerHTML = "";
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
    container.append(...domItems);
    return domItems;
  }

  return {
    element: container,
    render: (params, isHidden) => {
      updateItems(
        params.items,
        staticParams.itemCallback,
        params.keyboardHoveredItemIndex
      );

      if (isHidden) {
        container.style.display = "block";
      }

      container.style.top = staticParams.getReferenceRect()!.y + "px";
      container.style.left = staticParams.getReferenceRect()!.x + "px";
    },
    hide: () => {
      container.style.display = "none";
    },
  };
};
