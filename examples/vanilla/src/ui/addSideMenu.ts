import { BlockNoteEditor } from "@blocknote/core";
import { createButton } from "./util";

export const addSideMenu = (editor: BlockNoteEditor) => {
  const element = document.createElement("div");
  element.style.background = "gray";
  element.style.display = "none";
  element.style.opacity = "0.8";
  element.style.padding = "10px";
  element.style.position = "absolute";

  const addBtn = createButton("+", () => {
    editor.sideMenu.addBlock();
  });
  element.appendChild(addBtn);

  const dragBtn = createButton("::", () => {
    // TODO: render a submenu with a delete option that calls "props.deleteBlock"
  });
  dragBtn.addEventListener("dragstart", editor.sideMenu.blockDragStart);
  dragBtn.addEventListener("dragend", editor.sideMenu.blockDragEnd);
  dragBtn.draggable = true;
  element.appendChild(dragBtn);

  document.getElementById("root")!.appendChild(element);

  editor.sideMenu.onUpdate((state) => {
    if (state.show) {
      element.style.display = "block";

      element.style.top = state.referencePos.top + "px";
      element.style.left = state.referencePos.x - element.offsetWidth + "px";
    } else {
      element.style.display = "none";
    }
  });
};
