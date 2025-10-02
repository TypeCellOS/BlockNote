import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockConfig,
  BlockFromConfigNoChildren,
} from "../../../../schema/index.js";

export const createAddFileButton = (
  block: BlockFromConfigNoChildren<BlockConfig<string, any, "none">, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  buttonIcon?: HTMLElement,
) => {
  const addFileButton = document.createElement("div");
  addFileButton.className = "bn-add-file-button";

  const addFileButtonIcon = document.createElement("div");
  addFileButtonIcon.className = "bn-add-file-button-icon";
  if (buttonIcon) {
    addFileButtonIcon.appendChild(buttonIcon);
  } else {
    addFileButtonIcon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8L9.00319 2H19.9978C20.5513 2 21 2.45531 21 2.9918V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5501 3 20.9932V8ZM10 4V9H5V20H19V4H10Z"></path></svg>';
  }
  addFileButton.appendChild(addFileButtonIcon);

  const addFileButtonText = document.createElement("p");
  addFileButtonText.className = "bn-add-file-button-text";
  addFileButtonText.innerHTML =
    block.type in editor.dictionary.file_blocks.add_button_text
      ? editor.dictionary.file_blocks.add_button_text[block.type]
      : editor.dictionary.file_blocks.add_button_text["file"];
  addFileButton.appendChild(addFileButtonText);

  // Prevents focus from moving to the button.
  const addFileButtonMouseDownHandler = (event: MouseEvent) => {
    event.preventDefault();
  };
  // Opens the file toolbar.
  const addFileButtonClickHandler = () => {
    editor.transact((tr) =>
      tr.setMeta(editor.filePanel!.plugins[0], {
        block: block,
      }),
    );
  };
  addFileButton.addEventListener(
    "mousedown",
    addFileButtonMouseDownHandler,
    true,
  );
  addFileButton.addEventListener("click", addFileButtonClickHandler, true);

  return {
    dom: addFileButton,
    destroy: () => {
      addFileButton.removeEventListener(
        "mousedown",
        addFileButtonMouseDownHandler,
        true,
      );
      addFileButton.removeEventListener(
        "click",
        addFileButtonClickHandler,
        true,
      );
    },
  };
};
