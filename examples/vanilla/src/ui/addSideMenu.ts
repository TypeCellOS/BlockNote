import { BlockNoteEditor } from "@blocknote/core";
import { createButton } from "./util";

export const addSideMenu = (editor: BlockNoteEditor) => {
  let element: HTMLElement;

  editor.sideMenu.onUpdate((sideMenuState) => {
    if (!element) {
      element = document.createElement("div");
      element.style.background = "gray";
      element.style.position = "absolute";
      element.style.padding = "10px";
      element.style.opacity = "0.8";
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
      element.style.display = "none";
      element.appendChild(dragBtn);

      document.getElementById("root")!.appendChild(element);
    }

    if (sideMenuState.show) {
      element.style.display = "block";

      element.style.top = sideMenuState.referencePos.top + "px";
      element.style.left =
        sideMenuState.referencePos.x - element.offsetWidth + "px";
    } else {
      element.style.display = "none";
    }
  });
};
