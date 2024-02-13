import { BlockNoteEditor } from "@blocknote/core";
import { createButton } from "./util";

export const addHyperlinkToolbar = (editor: BlockNoteEditor) => {
  let text = "";
  let url = "";

  const element = document.createElement("div");
  element.style.background = "gray";
  element.style.display = "none";
  element.style.opacity = "0.8";
  element.style.padding = "10px";
  element.style.position = "absolute";

  const editBtn = createButton("edit", () => {
    url = prompt("new url") || url;
    editor.hyperlinkToolbar.editHyperlink(url, text);
  });
  element.appendChild(editBtn);

  const removeBtn = createButton("remove", () => {
    editor.hyperlinkToolbar.deleteHyperlink();
  });
  element.appendChild(removeBtn);

  document.getElementById("root")!.appendChild(element);

  editor.hyperlinkToolbar.onPositionUpdate((position) => {
    if (position.show) {
      element.style.display = "block";

      element.style.top = position.referencePos.top + "px";
      element.style.left = position.referencePos.x - element.offsetWidth + "px";
    } else {
      element.style.display = "none";
    }
  });

  editor.hyperlinkToolbar.onDataUpdate((data) => {
    url = data.url;
    text = data.text;
  });
};
