import { BlockSideMenuFactory, DefaultBlockSchema } from "@blocknote/core";
import { createButton } from "./util";

/**
 * This menu is drawn next to a block, when it's hovered over
 * It renders a drag handle and + button to create a new block
 */
export const blockSideMenuFactory: BlockSideMenuFactory<DefaultBlockSchema> = (
  staticParams
) => {
  const container = document.createElement("div");
  container.style.background = "gray";
  container.style.position = "absolute";
  container.style.padding = "10px";
  container.style.opacity = "0.8";
  const addBtn = createButton("+", () => {
    staticParams.addBlock();
  });
  container.appendChild(addBtn);

  const dragBtn = createButton("::", () => {
    // TODO: render a submenu with a delete option that calls "props.deleteBlock"
  });

  dragBtn.addEventListener("dragstart", staticParams.blockDragStart);
  dragBtn.addEventListener("dragend", staticParams.blockDragEnd);
  dragBtn.draggable = true;
  container.style.display = "none";
  container.appendChild(dragBtn);

  document.body.appendChild(container);

  return {
    element: container,
    render: (params, isHidden) => {
      if (isHidden) {
        container.style.display = "block";
      }

      container.style.top = staticParams.getReferenceRect()!.y + "px";
      container.style.left =
        staticParams.getReferenceRect()!.x - container.offsetWidth + "px";
    },
    hide: () => {
      container.style.display = "none";
    },
  };
};
