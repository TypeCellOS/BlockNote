import { ViewMutationRecord } from "@tiptap/pm/view";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockFromConfig } from "../../schema/index.js";

export const createToggleWrapper = (
  block: BlockFromConfig<any, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  renderedElement: {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
    ignoreMutation?: (mutation: ViewMutationRecord) => boolean;
    destroy?: () => void;
  },
): {
  dom: HTMLElement;
  contentDOM?: HTMLElement;
  ignoreMutation?: (mutation: ViewMutationRecord) => boolean;
  destroy?: () => void;
} => {
  if ("isTogglable" in block.props && !block.props.isTogglable) {
    return renderedElement;
  }

  const dom = document.createElement("div");

  const toggleWrapper = document.createElement("div");
  toggleWrapper.className = "bn-toggle-wrapper";
  toggleWrapper.setAttribute("data-show-children", "false");

  const toggleButton = document.createElement("button");
  toggleButton.className = "bn-toggle-button";
  toggleButton.innerHTML =
    // https://fonts.google.com/icons?selected=Material+Symbols+Rounded:chevron_right:FILL@0;wght@700;GRAD@0;opsz@24&icon.query=chevron&icon.style=Rounded&icon.size=24&icon.color=%23e8eaed
    '<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 -960 960 960" width="1em" fill="currentcolor"><path d="M472-480 332-620q-18-18-18-44t18-44q18-18 44-18t44 18l183 183q9 9 14 21t5 24q0 12-5 24t-14 21L420-252q-18 18-44 18t-44-18q-18-18-18-44t18-44l140-140Z"/></svg>';
  const toggleButtonMouseDown = (event: MouseEvent) => event.preventDefault();
  toggleButton.addEventListener("mousedown", toggleButtonMouseDown);
  const toggleButtonOnClick = () => {
    // Toggles visibility of child blocks. Also adds/removes the "add block"
    // button if there are no child blocks.
    if (toggleWrapper.getAttribute("data-show-children") === "true") {
      toggleWrapper.setAttribute("data-show-children", "false");

      if (dom.contains(toggleAddBlockButton)) {
        dom.removeChild(toggleAddBlockButton);
      }
    } else {
      toggleWrapper.setAttribute("data-show-children", "true");

      if (
        editor.getBlock(block)?.children.length === 0 &&
        !dom.contains(toggleAddBlockButton)
      ) {
        dom.appendChild(toggleAddBlockButton);
      }
    }
  };
  toggleButton.addEventListener("click", toggleButtonOnClick);

  toggleWrapper.appendChild(toggleButton);
  toggleWrapper.appendChild(renderedElement.dom);

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
    // Adds a single empty child block.
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

  const onEditorChange = editor.onChange(() => {
    // Adds/removes the "add block" button if child blocks are added/removed.
    if (
      editor.getBlock(block)?.children.length === 0 &&
      toggleWrapper.getAttribute("data-show-children") === "true"
    ) {
      dom.appendChild(toggleAddBlockButton);
    } else if (dom.contains(toggleAddBlockButton)) {
      dom.removeChild(toggleAddBlockButton);
    }
  });

  return {
    dom,
    contentDOM: renderedElement.contentDOM,
    // Prevents re-renders when the toggle button is clicked.
    // TODO: Document what this actually does.
    ignoreMutation: (mutation) => {
      if (
        mutation instanceof MutationRecord &&
        (mutation.type === "attributes" || mutation.type === "childList")
      ) {
        if (renderedElement.ignoreMutation) {
          return renderedElement.ignoreMutation(mutation);
        }

        return true;
      }
      return false;
    },
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
      renderedElement.destroy?.();
    },
  };
};
