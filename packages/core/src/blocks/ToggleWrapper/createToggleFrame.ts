import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { Block } from "../defaultBlocks.js";
import { defaultToggledState } from "./createToggleWrapper.js";

// https://fonts.google.com/icons?selected=Material+Symbols+Rounded:chevron_right:FILL@0;wght@700;GRAD@0;opsz@24&icon.query=chevron&icon.style=Rounded&icon.size=24&icon.color=%23e8eaed
const chevronIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="CURRENTCOLOR"><path d="M320-200v-560l440 280-440 280Z"/></svg>';

/**
 * The frame of a toggle block, for `renderFrame`: a chevron that shows or
 * hides the block's children, and an "Add block" button while the toggle is
 * open and has no children. BlockNote puts the block's content and its
 * children in the slot; hiding the children is a CSS rule on the frame.
 *
 * Whether a toggle is open is the reader's view state, kept in
 * `toggledState` (per browser by default), not in the document.
 */
export function createToggleFrame(
  block: Block<any, any, any>,
  editor: BlockNoteEditor<any, any, any>,
  toggledState = defaultToggledState,
) {
  const dom = document.createElement("div");
  dom.className = "bn-toggle-wrapper bn-toggle-frame";

  // Chrome outside the slot handles its own events. Cancelling `mousedown`
  // keeps a click from moving the caret.
  const toggleButton = document.createElement("button");
  toggleButton.className = "bn-toggle-button";
  toggleButton.type = "button";
  toggleButton.innerHTML = chevronIcon;
  toggleButton.addEventListener("mousedown", (event) => event.preventDefault());

  const slot = document.createElement("div");
  slot.className = "bn-toggle-slot";

  const addBlockButton = document.createElement("button");
  addBlockButton.className = "bn-toggle-add-block-button";
  addBlockButton.type = "button";
  addBlockButton.textContent = editor.dictionary.toggle_blocks.add_block_button;
  addBlockButton.addEventListener("mousedown", (event) =>
    event.preventDefault(),
  );
  addBlockButton.addEventListener("click", () => {
    editor.transact(() => {
      // A single empty block of the default type.
      const updated = editor.updateBlock(block.id, { children: [{}] });
      editor.setTextCursorPosition(updated.children[0], "end");
      editor.focus();
    });
  });

  dom.append(toggleButton, slot);

  let childCount = block.children.length;

  function show(open: boolean) {
    dom.dataset.showChildren = String(open);
    const showAddBlock = open && childCount === 0 && editor.isEditable;
    if (showAddBlock && !addBlockButton.isConnected) {
      dom.append(addBlockButton);
    } else if (!showAddBlock) {
      addBlockButton.remove();
    }
  }

  toggleButton.addEventListener("click", () => {
    const open = dom.dataset.showChildren !== "true";
    toggledState.set(block, open);
    show(open);
  });

  show(toggledState.get(block));

  return {
    dom,
    slot,
    // Keeps the frame, and so its open state, when the block changes. Adding
    // a child opens the toggle, and removing the last one closes it.
    update(updated: Block<any, any, any>) {
      const newChildCount = updated.children.length;
      let open = dom.dataset.showChildren === "true";
      if (newChildCount > childCount) {
        open = true;
      } else if (newChildCount === 0 && childCount > 0) {
        open = false;
      }
      if (open !== (dom.dataset.showChildren === "true")) {
        toggledState.set(updated, open);
      }
      childCount = newChildCount;
      show(open);
      return true;
    },
  };
}
