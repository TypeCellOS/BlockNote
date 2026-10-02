import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { Block } from "../defaultBlocks.js";

// Only the block's id is used, so anything with an id will do.
type ToggledState = {
  set: (block: Pick<Block<any, any, any>, "id">, isToggled: boolean) => void;
  get: (block: Pick<Block<any, any, any>, "id">) => boolean;
};

export const defaultToggledState: ToggledState = {
  set: (block, isToggled: boolean) =>
    window.localStorage.setItem(
      `toggle-${block.id}`,
      isToggled ? "true" : "false",
    ),
  get: (block) => window.localStorage.getItem(`toggle-${block.id}`) === "true",
};

// https://fonts.google.com/icons?selected=Material+Symbols+Rounded:chevron_right:FILL@0;wght@700;GRAD@0;opsz@24&icon.query=chevron&icon.style=Rounded&icon.size=24&icon.color=%23e8eaed
// `aria-hidden`: the icon is decorative, and the button has its own name.
const chevronIcon =
  '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="CURRENTCOLOR"><path d="M320-200v-560l440 280-440 280Z"/></svg>';

/**
 * Whether the toggle block is open, as its frame shows it. For keyboard
 * settings that differ between an open and a closed toggle.
 */
export function isToggleOpen(block: { id: string }) {
  return defaultToggledState.get(block);
}

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
  // A fixed name, with the state in `aria-expanded`, so a screen reader
  // announces e.g. "Expand or collapse, button, collapsed" (#2811). The CSS
  // reads the open state from `aria-expanded` too.
  toggleButton.setAttribute(
    "aria-label",
    editor.dictionary.toggle_blocks.toggle_button,
  );
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
  let open = toggledState.get(block);

  function show() {
    toggleButton.setAttribute("aria-expanded", String(open));
    const showAddBlock = open && childCount === 0 && editor.isEditable;
    if (showAddBlock && !addBlockButton.isConnected) {
      dom.append(addBlockButton);
    } else if (!showAddBlock) {
      addBlockButton.remove();
    }
  }

  toggleButton.addEventListener("click", () => {
    open = !open;
    toggledState.set(block, open);
    show();
  });

  show();

  return {
    dom,
    slot,
    // Keeps the frame, and so its open state, when the block changes. Adding
    // a child opens the toggle. Removing the last child keeps it open, showing
    // the "Add block" button, as in Notion.
    update(updated: Block<any, any, any>) {
      const newChildCount = updated.children.length;
      const wasOpen = open;
      if (newChildCount > childCount) {
        open = true;
      }
      if (open !== wasOpen) {
        toggledState.set(updated, open);
      }
      childCount = newChildCount;
      show();
      return true;
    },
  };
}
