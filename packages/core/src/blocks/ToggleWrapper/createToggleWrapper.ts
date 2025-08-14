import { ViewMutationRecord } from "@tiptap/pm/view";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { Block } from "../defaultBlocks.js";

type ToggledState = {
  set: (block: Block<any, any, any>, isToggled: boolean) => void;
  get: (block: Block<any, any, any>) => boolean;
};

export const defaultToggledState: ToggledState = {
  set: (block, isToggled: boolean) =>
    window.localStorage.setItem(
      `toggle-${block.id}`,
      isToggled ? "true" : "false",
    ),
  get: (block) => window.localStorage.getItem(`toggle-${block.id}`) === "true",
};

export const createToggleWrapper = (
  block: Block<any, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  renderedElement: HTMLElement,
  toggledState: ToggledState = defaultToggledState,
): {
  dom: HTMLElement;
  contentDOM?: HTMLElement;
  ignoreMutation?: (mutation: ViewMutationRecord) => boolean;
  destroy?: () => void;
} => {
  if ("isToggleable" in block.props && !block.props.isToggleable) {
    return {
      dom: renderedElement,
    };
  }

  const dom = document.createElement("div");

  const toggleWrapper = document.createElement("div");
  toggleWrapper.className = "bn-toggle-wrapper";

  const toggleButton = document.createElement("button");
  toggleButton.className = "bn-toggle-button";
  toggleButton.type = "button";
  toggleButton.innerHTML =
    // https://fonts.google.com/icons?selected=Material+Symbols+Rounded:chevron_right:FILL@0;wght@700;GRAD@0;opsz@24&icon.query=chevron&icon.style=Rounded&icon.size=24&icon.color=%23e8eaed
    '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="CURRENTCOLOR"><path d="M320-200v-560l440 280-440 280Z"/></svg>';
  const toggleButtonMouseDown = (event: MouseEvent) => event.preventDefault();
  toggleButton.addEventListener("mousedown", toggleButtonMouseDown);
  const toggleButtonOnClick = () => {
    // Toggles visibility of child blocks. Also adds/removes the "add block"
    // button if there are no child blocks.
    if (toggleWrapper.getAttribute("data-show-children") === "true") {
      toggleWrapper.setAttribute("data-show-children", "false");
      toggledState.set(editor.getBlock(block)!, false);

      if (dom.contains(toggleAddBlockButton)) {
        dom.removeChild(toggleAddBlockButton);
      }
    } else {
      toggleWrapper.setAttribute("data-show-children", "true");
      toggledState.set(editor.getBlock(block)!, true);

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
  toggleWrapper.appendChild(renderedElement);

  const toggleAddBlockButton = document.createElement("button");
  toggleAddBlockButton.className = "bn-toggle-add-block-button";
  toggleAddBlockButton.type = "button";
  toggleAddBlockButton.textContent =
    editor.dictionary.toggle_blocks.add_block_button;
  const toggleAddBlockButtonMouseDown = (event: MouseEvent) =>
    event.preventDefault();
  toggleAddBlockButton.addEventListener(
    "mousedown",
    toggleAddBlockButtonMouseDown,
  );
  const toggleAddBlockButtonOnClick = () => {
    // Adds a single empty child block.
    editor.transact(() => {
      // dom.removeChild(toggleAddBlockButton);

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

  let childCount = block.children.length;
  const onEditorChange = editor.onChange(() => {
    const newChildCount = editor.getBlock(block)?.children.length ?? 0;

    if (newChildCount > childCount) {
      // If a child block is added while children are hidden, show children.
      if (toggleWrapper.getAttribute("data-show-children") === "false") {
        toggleWrapper.setAttribute("data-show-children", "true");
        toggledState.set(editor.getBlock(block)!, true);
      }

      // Remove the "add block" button as we want to show child blocks and
      // there is at least one child block.
      if (dom.contains(toggleAddBlockButton)) {
        dom.removeChild(toggleAddBlockButton);
      }
    } else if (newChildCount === 0 && newChildCount < childCount) {
      // If the last child block is removed while children are shown, hide
      // children.
      if (toggleWrapper.getAttribute("data-show-children") === "true") {
        toggleWrapper.setAttribute("data-show-children", "false");
        toggledState.set(editor.getBlock(block)!, false);
      }

      // Remove the "add block" button as we want to hide child blocks,
      // regardless of whether there are child blocks or not.
      if (dom.contains(toggleAddBlockButton)) {
        dom.removeChild(toggleAddBlockButton);
      }
    }

    childCount = newChildCount;
  });

  if (toggledState.get(block)) {
    toggleWrapper.setAttribute("data-show-children", "true");

    if (block.children.length === 0) {
      // If the toggle is set to show children, but there are no children,
      // we add the "add block" button.
      dom.appendChild(toggleAddBlockButton);
    }
  } else {
    toggleWrapper.setAttribute("data-show-children", "false");
  }

  return {
    dom,
    // Prevents re-renders when the toggle button is clicked.
    ignoreMutation: (mutation) => {
      if (
        mutation instanceof MutationRecord &&
        // We want to prevent re-renders when the view changes, so we ignore
        // all mutations where the `data-show-children` attribute is changed
        // or the "add block" button is added/removed.
        ((mutation.type === "attributes" &&
          mutation.target === toggleWrapper &&
          mutation.attributeName === "data-show-children") ||
          (mutation.type === "childList" &&
            (mutation.addedNodes[0] === toggleAddBlockButton ||
              mutation.removedNodes[0] === toggleAddBlockButton)))
      ) {
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
    },
  };
};
