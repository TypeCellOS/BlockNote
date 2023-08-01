import { BlockNoteEditor } from "@blocknote/core";
import { createButton } from "./util";

export const addFormattingToolbar = (editor: BlockNoteEditor) => {
  let element: HTMLElement;
  let boldBtn: HTMLAnchorElement;

  editor.formattingToolbar.onUpdate((formattingToolbarState) => {
    if (!element) {
      element = document.createElement("div");
      element.style.background = "gray";
      element.style.position = "absolute";
      element.style.padding = "10px";
      element.style.opacity = "0.8";
      boldBtn = createButton("set bold", () => {
        editor.toggleStyles({ bold: true });
      });
      element.appendChild(boldBtn);

      const linkBtn = createButton("set link", () => {
        editor.createLink("https://www.google.com");
      });

      element.appendChild(boldBtn);
      element.appendChild(linkBtn);
      element.style.display = "none";

      document.getElementById("root")!.appendChild(element);
    }

    if (formattingToolbarState.show) {
      element.style.display = "block";

      boldBtn.text =
        "bold" in editor.getActiveStyles() ? "unset bold" : "set bold";
      element.style.top = formattingToolbarState.referencePos.top + "px";
      element.style.left =
        formattingToolbarState.referencePos.x - element.offsetWidth + "px";
    } else {
      element.style.display = "none";
    }
  });
};
