import { BlockNoteEditor } from "@blocknote/core";
import { createButton } from "./util";

export const addFormattingToolbar = (editor: BlockNoteEditor) => {
  const element = document.createElement("div");
  element.style.background = "gray";
  element.style.display = "none";
  element.style.opacity = "0.8";
  element.style.padding = "10px";
  element.style.position = "absolute";

  const boldBtn = createButton("set bold", () => {
    editor.toggleStyles({ bold: true });
  });
  element.appendChild(boldBtn);

  const linkBtn = createButton("set link", () => {
    editor.createLink("https://www.google.com");
  });
  element.appendChild(linkBtn);

  document.getElementById("root")!.appendChild(element);

  editor.formattingToolbar.onUpdate((state) => {
    if (state.show) {
      element.style.display = "block";

      boldBtn.text =
        "bold" in editor.getActiveStyles() ? "unset bold" : "set bold";
      element.style.top = state.referencePos.top + "px";
      element.style.left = state.referencePos.x - element.offsetWidth + "px";
    } else {
      element.style.display = "none";
    }
  });
};
