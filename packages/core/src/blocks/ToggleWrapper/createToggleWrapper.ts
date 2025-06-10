import { BlockFromConfig } from "../../schema/index.js";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

export const createToggleWrapper = (
  block: BlockFromConfig<any, any, any>,
  editor: BlockNoteEditor<any, any, any>,
) => {
  const dom = document.createElement("div");

  const toggleWrapper = document.createElement("div");
  toggleWrapper.className = "bn-toggle-wrapper";
  toggleWrapper.setAttribute("data-show-children", "true");

  const toggleButton = document.createElement("button");
  toggleButton.className = "bn-toggle-button";
  toggleButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 -960 960 960" width="1em" fill="currentcolor"><path d="M472-480 332-620q-18-18-18-44t18-44q18-18 44-18t44 18l183 183q9 9 14 21t5 24q0 12-5 24t-14 21L420-252q-18 18-44 18t-44-18q-18-18-18-44t18-44l140-140Z"/></svg>';
  const toggleButtonMouseDown = (event: MouseEvent) => event.preventDefault();
  toggleButton.addEventListener("mousedown", toggleButtonMouseDown);
  const toggleButtonOnClick = () => {
    if (toggleWrapper.getAttribute("data-show-children") === "true") {
      toggleWrapper.setAttribute("data-show-children", "false");
    } else {
      toggleWrapper.setAttribute("data-show-children", "true");
    }
  };
  toggleButton.addEventListener("click", toggleButtonOnClick);

  toggleWrapper.appendChild(toggleButton);

  const toggleAddBlockButton = document.createElement("button");
  toggleAddBlockButton.className = "bn-toggle-add-block-button";
  toggleAddBlockButton.textContent = "Empty toggle. Click to add a block.";
  const toggleAddBlockButtonMouseDown = (event: MouseEvent) =>
    event.preventDefault();
  toggleAddBlockButton.addEventListener(
    "mousedown",
    toggleAddBlockButtonMouseDown,
  );
  const toggleAddBlockButtonOnClick = () => {
    editor.transact(() => {
      const updatedBlock = editor.updateBlock(block, {
        // Single empty block with default type.
        children: [{}],
      });
      editor.setTextCursorPosition(updatedBlock.children[0].id, "end");
      editor.focus();
    });
  };
  toggleAddBlockButton.addEventListener("click", toggleAddBlockButtonOnClick);

  dom.appendChild(toggleWrapper);
  if (
    block.children.length === 0 &&
    toggleWrapper.getAttribute("data-show-children") === "true"
  ) {
    dom.appendChild(toggleAddBlockButton);
  }

  // Hack to force a re-render if the block has changed from having children to
  // not having children or vice versa.
  const onEditorChange = editor.onChange(() => {
    const actualBlock = editor.getBlock(block);
    if (!actualBlock) {
      return;
    }

    if (
      actualBlock.children.length === 0 &&
      toggleAddBlockButton.parentElement === null
    ) {
      dom.appendChild(toggleAddBlockButton);
    }

    if (
      actualBlock.children.length > 0 &&
      toggleAddBlockButton.parentElement === dom
    ) {
      dom.removeChild(toggleAddBlockButton);
    }
  });

  return {
    dom,
    destroy: () => {
      toggleButton.removeEventListener("mousedown", toggleButtonMouseDown);
      toggleButton.removeEventListener("click", toggleButtonOnClick);
      toggleAddBlockButton.removeEventListener(
        "mousedown",
        toggleAddBlockButtonMouseDown,
      );
      toggleAddBlockButton.removeEventListener(
        "click",
        toggleAddBlockButtonOnClick,
      );
      onEditorChange?.();
    },
  };
};
