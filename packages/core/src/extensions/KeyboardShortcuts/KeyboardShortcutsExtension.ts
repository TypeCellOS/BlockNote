import { Extension } from "@tiptap/core";

import { createBlockCommand } from "../../api/blockManipulation/createBlock.js";
import { mergeBlocksCommand } from "../../api/blockManipulation/mergeBlocks.js";
import { splitBlockCommand } from "../../api/blockManipulation/splitBlock.js";
import { updateBlockCommand } from "../../api/blockManipulation/updateBlock.js";
import { getBlockInfoFromPos } from "../../api/getBlockInfoFromPos.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

export const KeyboardShortcutsExtension = Extension.create<{
  editor: BlockNoteEditor<any, any, any>;
}>({
  priority: 50,

  addKeyboardShortcuts() {
    // handleBackspace is partially adapted from https://github.com/ueberdosis/tiptap/blob/ed56337470efb4fd277128ab7ef792b37cfae992/packages/core/src/extensions/keymap.ts
    const handleBackspace = () =>
      this.editor.commands.first(({ commands }) => [
        // Deletes the selection if it's not empty.
        () => commands.deleteSelection(),
        // Undoes an input rule if one was triggered in the last editor state change.
        () => commands.undoInputRule(),
        // Reverts block content type to a paragraph if the selection is at the start of the block.
        () =>
          commands.command(({ state }) => {
            const { contentType, startPos } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            const selectionAtBlockStart = state.selection.from === startPos + 1;
            const isParagraph = contentType.name === "paragraph";

            if (selectionAtBlockStart && !isParagraph) {
              return commands.command(
                updateBlockCommand(this.options.editor, state.selection.from, {
                  type: "paragraph",
                  props: {},
                })
              );
            }

            return false;
          }),
        // Removes a level of nesting if the block is indented if the selection is at the start of the block.
        () =>
          commands.command(({ state }) => {
            const { startPos } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            const selectionAtBlockStart = state.selection.from === startPos + 1;

            if (selectionAtBlockStart) {
              return commands.liftListItem("blockContainer");
            }

            return false;
          }),
        // Merges block with the previous one if it isn't indented, isn't the first block in the doc, and the selection
        // is at the start of the block.
        () =>
          commands.command(({ state }) => {
            const { depth, startPos } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            const selectionAtBlockStart = state.selection.from === startPos + 1;
            const selectionEmpty = state.selection.empty;
            const blockAtDocStart = startPos === 2;

            const posBetweenBlocks = startPos - 1;

            if (
              !blockAtDocStart &&
              selectionAtBlockStart &&
              selectionEmpty &&
              depth === 2
            ) {
              return commands.command(mergeBlocksCommand(posBetweenBlocks));
            }

            return false;
          }),
      ]);

    const handleDelete = () =>
      this.editor.commands.first(({ commands }) => [
        // Deletes the selection if it's not empty.
        () => commands.deleteSelection(),
        // Merges block with the next one (at the same nesting level or lower),
        // if one exists, the block has no children, and the selection is at the
        // end of the block.
        () =>
          commands.command(({ state }) => {
            const { node, depth, endPos } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            const blockAtDocEnd = endPos === state.doc.nodeSize - 4;
            const selectionAtBlockEnd = state.selection.from === endPos - 1;
            const selectionEmpty = state.selection.empty;
            const hasChildBlocks = node.childCount === 2;

            if (
              !blockAtDocEnd &&
              selectionAtBlockEnd &&
              selectionEmpty &&
              !hasChildBlocks
            ) {
              let oldDepth = depth;
              let newPos = endPos + 2;
              let newDepth = state.doc.resolve(newPos).depth;

              while (newDepth < oldDepth) {
                oldDepth = newDepth;
                newPos += 2;
                newDepth = state.doc.resolve(newPos).depth;
              }

              return commands.command(mergeBlocksCommand(newPos - 1));
            }

            return false;
          }),
      ]);

    const handleEnter = () =>
      this.editor.commands.first(({ commands }) => [
        // Removes a level of nesting if the block is empty & indented, while the selection is also empty & at the start
        // of the block.
        () =>
          commands.command(({ state }) => {
            const { contentNode, depth } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = contentNode.childCount === 0;
            const blockIndented = depth > 2;

            if (
              selectionAtBlockStart &&
              selectionEmpty &&
              blockEmpty &&
              blockIndented
            ) {
              return commands.liftListItem("blockContainer");
            }

            return false;
          }),
        // Creates a new block and moves the selection to it if the current one is empty, while the selection is also
        // empty & at the start of the block.
        () =>
          commands.command(({ state, chain }) => {
            const { contentNode, endPos } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = contentNode.childCount === 0;

            if (selectionAtBlockStart && selectionEmpty && blockEmpty) {
              const newBlockInsertionPos = endPos + 1;
              const newBlockContentPos = newBlockInsertionPos + 2;

              chain()
                .command(createBlockCommand(newBlockInsertionPos))
                .setTextSelection(newBlockContentPos)
                .run();

              return true;
            }

            return false;
          }),
        // Splits the current block, moving content inside that's after the cursor to a new text block below. Also
        // deletes the selection beforehand, if it's not empty.
        () =>
          commands.command(({ state, chain }) => {
            const { contentNode } = getBlockInfoFromPos(
              state.doc,
              state.selection.from
            )!;

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const blockEmpty = contentNode.childCount === 0;

            if (!blockEmpty) {
              chain()
                .deleteSelection()
                .command(
                  splitBlockCommand(
                    state.selection.from,
                    selectionAtBlockStart,
                    selectionAtBlockStart
                  )
                )
                .run();

              return true;
            }

            return false;
          }),
      ]);

    return {
      Backspace: handleBackspace,
      Delete: handleDelete,
      Enter: handleEnter,
      // Always returning true for tab key presses ensures they're not captured by the browser. Otherwise, they blur the
      // editor since the browser will try to use tab for keyboard navigation.
      Tab: () => {
        if (
          this.options.editor.formattingToolbar?.shown ||
          this.options.editor.linkToolbar?.shown ||
          this.options.editor.filePanel?.shown
        ) {
          // don't handle tabs if a toolbar is shown, so we can tab into / out of it
          return false;
        }
        this.editor.commands.sinkListItem("blockContainer");
        return true;
      },
      "Shift-Tab": () => {
        if (
          this.options.editor.formattingToolbar?.shown ||
          this.options.editor.linkToolbar?.shown ||
          this.options.editor.filePanel?.shown
        ) {
          // don't handle tabs if a toolbar is shown, so we can tab into / out of it
          return false;
        }
        this.editor.commands.liftListItem("blockContainer");
        return true;
      },
      "Shift-Mod-ArrowUp": () => {
        this.options.editor.moveBlockUp();
        return true;
      },
      "Shift-Mod-ArrowDown": () => {
        this.options.editor.moveBlockDown();
        return true;
      },
    };
  },
});
