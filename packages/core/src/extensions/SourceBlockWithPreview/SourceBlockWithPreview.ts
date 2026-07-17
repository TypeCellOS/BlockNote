import { TextSelection } from "prosemirror-state";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  createExtension,
  createStore,
} from "../../editor/BlockNoteExtension.js";
import { Block } from "../../blocks/index.js";

/**
 * A single editor-wide extension that drives the source popup for blocks that
 * render a preview. Which blocks it activates on is decided by each spec's
 * `meta.hasPreview` flag, so individual blocks opt in rather than the extension
 * being configured with a block type.
 *
 * The extension is registered once (it's a default extension) and is a no-op
 * when no block declares `meta.hasPreview`.
 */
export const SourceBlockWithPreviewExtension = createExtension(
  ({ editor }: { editor: BlockNoteEditor<any> }) => {
    const store = createStore<{
      popupOpen: string | undefined;
      selected: string | undefined;
    }>({
      popupOpen: undefined,
      selected: undefined,
    });

    // A block has a preview iff its spec's implementation declares
    // `meta.hasPreview` (read from the spec, like the syntax-highlighting
    // extension reads `meta.highlight`).
    const blockHasPreview = (block: Block<any, any, any>) =>
      !!editor.schema.blockSpecs[block.type]?.implementation?.meta?.hasPreview;

    const handleArrow =
      (direction: "prev" | "next") =>
      ({ editor }: { editor: BlockNoteEditor<any> }) => {
        const { block, prevBlock, nextBlock } = editor.getTextCursorPosition();
        if (!blockHasPreview(block) || store.state.popupOpen === block.id) {
          return false;
        }

        const targetBlock = direction === "prev" ? prevBlock : nextBlock;
        if (!targetBlock) {
          return false;
        }

        editor.setTextCursorPosition(
          targetBlock.id,
          direction === "prev" ? "end" : "start",
        );

        return true;
      };

    return {
      key: "sourceBlockWithPreview",
      store,
      keyboardShortcuts: {
        // Toggles the popup. This may be overridden by `hardBreakShortcut`.
        Enter: ({ editor }) => {
          const { block } = editor.getTextCursorPosition();
          if (!blockHasPreview(block)) {
            return false;
          }

          if (
            store.state.popupOpen === block.id &&
            editor.schema.blockSpecs[block.type]?.implementation?.meta
              ?.hardBreakShortcut === "enter"
          ) {
            const view = editor.prosemirrorView!;
            view.dispatch(view.state.tr.insertText("\n"));

            return true;
          }

          editor.setTextCursorPosition(block.id, "end");
          store.setState((state) => ({
            ...state,
            popupOpen:
              store.state.popupOpen === block.id ? undefined : block.id,
          }));

          return true;
        },
        // Closes the popup.
        Escape: ({ editor }) => {
          const { block } = editor.getTextCursorPosition();
          if (!blockHasPreview(block) || store.state.popupOpen !== block.id) {
            return false;
          }

          editor.setTextCursorPosition(block.id, "end");

          store.setState((state) => ({ ...state, popupOpen: undefined }));

          return true;
        },
        // While the popup is open, selects the whole source instead of the
        // whole document.
        "Mod-a": ({ editor }) => {
          const { block } = editor.getTextCursorPosition();
          if (!blockHasPreview(block) || store.state.popupOpen !== block.id) {
            return false;
          }

          const view = editor.prosemirrorView!;
          const { $from } = view.state.selection;
          if ($from.parent.type.name !== block.type) {
            return false;
          }

          view.dispatch(
            view.state.tr.setSelection(
              TextSelection.create(view.state.doc, $from.start(), $from.end()),
            ),
          );

          return true;
        },
        // While the popup is closed, moves the selection straight to the previous/next block
        // instead of into the (hidden) source.
        ArrowUp: handleArrow("prev"),
        ArrowLeft: handleArrow("prev"),
        ArrowDown: handleArrow("next"),
        ArrowRight: handleArrow("next"),
      },
      mount: ({ dom, signal }) => {
        // Closes the popup when the selection leaves the block that owns it and tracks which block
        // the selection is in.
        const unsubscribeSelectionChange = editor.onSelectionChange(() => {
          const { block } = editor.getTextCursorPosition();

          store.setState((state) => ({
            selected: blockHasPreview(block) ? block.id : undefined,
            popupOpen:
              state.popupOpen && state.popupOpen !== block.id
                ? undefined
                : state.popupOpen,
          }));
        });
        signal.addEventListener("abort", unsubscribeSelectionChange);

        // While the popup is closed, prevents editing of the (hidden) source. Handled here rather
        // than in `keyboardShortcuts` as it needs to match any text-input key, which a keymap
        // can't express.
        const handleKeyDown = (event: KeyboardEvent) => {
          if (!editor.isEditable) {
            return;
          }

          const { block } = editor.getTextCursorPosition();
          if (!blockHasPreview(block) || store.state.popupOpen === block.id) {
            return;
          }

          if (event.key === "Backspace" || event.key === "Delete") {
            event.preventDefault();
            event.stopImmediatePropagation();
            editor.removeBlocks([block.id]);

            return;
          }

          if (
            (event.key.length === 1 && !event.ctrlKey && !event.metaKey) ||
            event.key === "Tab"
          ) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        };
        dom.addEventListener("keydown", handleKeyDown, {
          capture: true,
          signal,
        });

        const handleBlur = () =>
          store.setState((state) => ({ ...state, popupOpen: undefined }));
        dom.addEventListener("blur", handleBlur, { capture: true, signal });
      },
    };
  },
);
