import { TextSelection } from "prosemirror-state";

import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  createExtension,
  createStore,
} from "../../../../editor/BlockNoteExtension.js";
import { Block } from "../../../index.js";

export const SourceBlockWithPreviewExtension = createExtension(
  ({
    editor,
    options: {
      key,
      blockType,
      hasPreview,
      enterBehaviour = "close",
      runsBefore = [],
    },
  }: {
    editor: BlockNoteEditor<any>;
    options: {
      key: string;
      blockType: string;
      hasPreview: (block: Block<any, any, any>) => boolean;
      /**
       * What pressing Enter does while the popup is open:
       * - `"close"`: commits the source and closes the popup - for
       *   single-line sources (e.g. math).
       * - `"newline"`: inserts a line break into the source - for multiline
       *   sources (e.g. diagrams); the popup is then closed with Escape, the
       *   "OK" button, or by moving the selection out.
       *
       * @default "close"
       */
      enterBehaviour?: "close" | "newline";
      runsBefore?: readonly string[];
    };
  }) => {
    const store = createStore<{
      popupOpen: string | undefined;
      selected: string | undefined;
    }>({
      popupOpen: undefined,
      selected: undefined,
    });

    const blockHasPreview = (block: Block<any, any, any>) =>
      block.type === blockType && hasPreview(block);

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
      key,
      store,
      runsBefore,
      keyboardShortcuts: {
        // Toggles the popup. With the "newline" Enter behaviour, Enter
        // inserts a line break while the popup is open instead of closing it.
        Enter: ({ editor }) => {
          const { block } = editor.getTextCursorPosition();
          if (!blockHasPreview(block)) {
            return false;
          }

          if (
            enterBehaviour === "newline" &&
            store.state.popupOpen === block.id
          ) {
            const view = editor.prosemirrorView!;
            view.dispatch(
              view.state.tr.insertText("\n")
            );

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
          if ($from.parent.type.name !== blockType) {
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
