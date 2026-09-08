import { insertEmptyFirstChild } from "../../api/blockManipulation/commands/materializeChildren/materializeChildren.js";
import { getNodeById } from "../../api/nodeUtil.js";
import { ToggleExtension } from "../../extensions/Toggle/Toggle.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { defaultToggledState, type ToggledState } from "./toggledState.js";

type ToggleBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children: readonly { id: string }[];
};

/** A disclosure frame around a block's editable title and ordinary children. */
export function createToggleFrame<
  B extends ToggleBlock,
  BS extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  block: B,
  editor: BlockNoteEditor<BS, I, S>,
  renderType: "nodeView" | "dom" = "nodeView",
  toggledState: ToggledState<B> = defaultToggledState,
) {
  const dom = document.createElement("div");
  dom.className = "bn-toggle-frame";
  dom.dataset.toggleHeading = String(block.type === "heading");
  const slot = document.createElement("div");
  slot.className = "bn-toggle-slot";

  const button = document.createElement("button");
  button.className = "bn-toggle-button";
  button.type = "button";
  button.setAttribute(
    "aria-label",
    editor.dictionary.slash_menu.toggle_list.title,
  );
  button.innerHTML =
    // Same Material Symbols chevron as the legacy ToggleWrapper.
    '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true"><path d="M320-200v-560l440 280-440 280Z"/></svg>';
  dom.append(button, slot);

  // Static HTML is always expanded and never reads per-user browser storage.
  if (renderType === "dom") {
    dom.dataset.showChildren = "true";
    button.setAttribute("aria-expanded", "true");
    button.disabled = true;
    return { dom, slot };
  }

  const addBlock = document.createElement("button");
  addBlock.className = "bn-toggle-add-block-button";
  addBlock.type = "button";
  addBlock.textContent = editor.dictionary.toggle_blocks.add_block_button;
  dom.append(addBlock);

  let currentBlock = block;
  const controller = editor.getExtension(ToggleExtension);
  if (!controller) {
    throw new Error("Toggle frames require ToggleExtension");
  }
  const updateExpanded = controller.setExpanded;
  let expanded = toggledState.get(block);
  const unregister = controller.register(
    block.id,
    expanded,
    (value) => toggledState.set(currentBlock, value),
    (value) => {
      expanded = value;
      paint();
    },
  );

  function paint() {
    dom.dataset.showChildren = String(expanded);
    button.setAttribute("aria-expanded", String(expanded));
    addBlock.hidden = !expanded || currentBlock.children.length > 0;
  }

  function setExpanded(value: boolean) {
    updateExpanded(currentBlock.id, value);
  }

  // Author chrome lives outside the slot, so the frame node view already
  // handles its events and mutations. These handlers die with their DOM.
  button.onmousedown = addBlock.onmousedown = (event) => event.preventDefault();
  button.onclick = () => setExpanded(!expanded);
  addBlock.onclick = () => {
    const current = editor.getBlock(block.id);
    if (!editor.isEditable || !current || current.children.length > 0) {
      return;
    }
    editor.transact((tr) => {
      const target = getNodeById(block.id, tr.doc);
      if (target && insertEmptyFirstChild(tr, target.posBeforeNode)) {
        editor.focus();
      }
    });
  };
  paint();

  return {
    dom,
    slot,
    destroy: unregister,
    update(updatedBlock: B) {
      // A heading converted back to plain must also lose its frame.
      if (
        "isToggleable" in updatedBlock.props &&
        !updatedBlock.props.isToggleable
      ) {
        return false;
      }
      const previousCount = currentBlock.children.length;
      currentBlock = updatedBlock;
      if (currentBlock.children.length > previousCount) {
        setExpanded(true);
      } else if (currentBlock.children.length === 0 && previousCount > 0) {
        setExpanded(false);
      } else {
        paint();
      }
      return true;
    },
  };
}
