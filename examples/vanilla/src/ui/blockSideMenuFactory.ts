import { BlockSideMenuFactory } from "@blocknote/core";
import { createButton } from "./util";

/**
 * This menu is drawn next to a block, when it's hovered over
 * It renders a drag handle and + button to create a new block
 */
export const blockSideMenuFactory: BlockSideMenuFactory = (props) => {
  const container = document.createElement("div");
  container.style.background = "gray";
  container.style.position = "absolute";
  container.style.padding = "10px";
  container.style.opacity = "0.8";
  const addBtn = createButton("+", () => {
    props.addBlock();
  });
  container.appendChild(addBtn);

  const dragBtn = createButton("::", () => {
    // TODO: render a submenu with a delete option that calls "props.deleteBlock"
  });

  dragBtn.addEventListener("dragstart", props.blockDragStart);
  dragBtn.addEventListener("dragend", props.blockDragEnd);
  container.style.display = "none";
  container.appendChild(dragBtn);

  document.body.appendChild(container);

  return {
    element: container,
    show: (params) => {
      container.style.display = "block";
      console.log("show blockmenu", params);
      container.style.top = params.blockBoundingBox.y + "px";
      container.style.left =
        params.blockBoundingBox.x - container.offsetWidth + "px";
    },
    hide: () => {
      container.style.display = "none";
    },
    update: (params) => {
      console.log("update blockmenu", params);
      container.style.top = params.blockBoundingBox.y + "px";
      container.style.left =
        params.blockBoundingBox.x - container.offsetWidth + "px";
    },
  };
};
