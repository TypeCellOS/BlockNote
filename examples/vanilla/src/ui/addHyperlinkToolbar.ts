import { BlockNoteEditor, createHyperlinkToolbar } from "@blocknote/core";
import { createButton } from "./util";

export const addHyperlinkToolbar = (editor: BlockNoteEditor) => {
  let element: HTMLElement;

  createHyperlinkToolbar(editor, (hyperlinkToolbarState) => {
    if (!element) {
      element = document.createElement("div");
      element.style.background = "gray";
      element.style.position = "absolute";
      element.style.padding = "10px";
      element.style.opacity = "0.8";

      let url = hyperlinkToolbarState.url;
      let text = hyperlinkToolbarState.text;

      const editBtn = createButton("edit", () => {
        const newUrl = prompt("new url") || url;
        hyperlinkToolbarState.editHyperlink(newUrl, text);
      });

      element.appendChild(editBtn);

      const removeBtn = createButton("remove", () => {
        hyperlinkToolbarState.deleteHyperlink();
      });

      element.appendChild(editBtn);
      element.appendChild(removeBtn);
      element.style.display = "none";

      document.getElementById("root")!.appendChild(element);
    }

    if (hyperlinkToolbarState.show) {
      element.style.display = "block";

      element.style.top = hyperlinkToolbarState.referencePos.top + "px";
      element.style.left =
        hyperlinkToolbarState.referencePos.x - element.offsetWidth + "px";
    } else {
      element.style.display = "none";
    }
  });
};
