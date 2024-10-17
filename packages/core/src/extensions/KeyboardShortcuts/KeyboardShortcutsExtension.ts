import { Extension } from "@tiptap/core";

import { TextSelection } from "prosemirror-state";
import {
  getPrevBlockPos,
  mergeBlocksCommand,
} from "../../api/blockManipulation/commands/mergeBlocks/mergeBlocks.js";
import { splitBlockCommand } from "../../api/blockManipulation/commands/splitBlock/splitBlock.js";
import { updateBlockCommand } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import {
  getBlockInfoFromResolvedPos,
  getBlockInfoFromSelection,
} from "../../api/getBlockInfoFromPos.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

export const KeyboardShortcutsExtension = Extension.create<{
  editor: BlockNoteEditor<any, any, any>;
}>({
  priority: 50,

  // TODO: The shortcuts need a refactor. Do we want to use a command priority
  //  design as there is now, or clump the logic into a single function?
  addKeyboardShortcuts() {
    // handleBackspace is partially adapted from https://github.com/ueberdosis/tiptap/blob/ed56337470efb4fd277128ab7ef792b37cfae992/packages/core/src/extensions/keymap.ts
    const handleBackspace = () =>
      this.editor.commands.first(({ chain, commands }) => [
        // Deletes the selection if it's not empty.
        () => commands.deleteSelection(),
        // Undoes an input rule if one was triggered in the last editor state change.
        () => commands.undoInputRule(),
        // Reverts block content type to a paragraph if the selection is at the start of the block.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);

            const selectionAtBlockStart =
              state.selection.from === blockInfo.blockContent.beforePos + 1;
            const isParagraph =
              blockInfo.blockContent.node.type.name === "paragraph";

            if (selectionAtBlockStart && !isParagraph) {
              return commands.command(
                updateBlockCommand(
                  this.options.editor,
                  blockInfo.blockContainer.beforePos,
                  {
                    type: "paragraph",
                    props: {},
                  }
                )
              );
            }

            return false;
          }),
        // Removes a level of nesting if the block is indented if the selection is at the start of the block.
        () =>
          commands.command(({ state }) => {
            const { blockContent } = getBlockInfoFromSelection(state);

            const selectionAtBlockStart =
              state.selection.from === blockContent.beforePos + 1;

            if (selectionAtBlockStart) {
              return commands.liftListItem("blockContainer");
            }

            return false;
          }),
        // Merges block with the previous one if it isn't indented, isn't the
        // first block in the doc, and the selection is at the start of the
        // block. The target block for merging must contain inline content.
        () =>
          commands.command(({ state }) => {
            const { blockContainer, blockContent } =
              getBlockInfoFromSelection(state);

            const { depth } = state.doc.resolve(blockContainer.beforePos);

            const selectionAtBlockStart =
              state.selection.from === blockContent.beforePos + 1;
            const selectionEmpty = state.selection.empty;
            const blockAtDocStart = blockContainer.beforePos === 1;

            const posBetweenBlocks = blockContainer.beforePos;

            if (
              !blockAtDocStart &&
              selectionAtBlockStart &&
              selectionEmpty &&
              depth === 1
            ) {
              return chain()
                .command(mergeBlocksCommand(posBetweenBlocks))
                .scrollIntoView()
                .run();
            }

            return false;
          }),
        // Deletes previous block if it contains no content and isn't a table,
        // when the selection is empty and at the start of the block. Moves the
        // current block into the deleted block's place.
        () =>
          commands.command(({ state }) => {
            const blockInfo = getBlockInfoFromSelection(state);

            const { depth } = state.doc.resolve(
              blockInfo.blockContainer.beforePos
            );

            const selectionAtBlockStart =
              state.selection.from === blockInfo.blockContent.beforePos + 1;
            const selectionEmpty = state.selection.empty;
            const blockAtDocStart = blockInfo.blockContainer.beforePos === 1;

            const prevBlockPos = getPrevBlockPos(
              state.doc,
              state.doc.resolve(blockInfo.blockContainer.beforePos)
            );
            const prevBlockInfo = getBlockInfoFromResolvedPos(
              state.doc.resolve(prevBlockPos.pos)
            );

            const prevBlockNotTableAndNoContent =
              prevBlockInfo.blockContent.node.type.spec.content === "" ||
              (prevBlockInfo.blockContent.node.type.spec.content ===
                "inline*" &&
                prevBlockInfo.blockContent.node.childCount === 0);

            if (
              !blockAtDocStart &&
              selectionAtBlockStart &&
              selectionEmpty &&
              depth === 1 &&
              prevBlockNotTableAndNoContent
            ) {
              return chain()
                .cut(
                  {
                    from: blockInfo.blockContainer.beforePos,
                    to: blockInfo.blockContainer.afterPos,
                  },
                  prevBlockInfo.blockContainer.afterPos
                )
                .deleteRange({
                  from: prevBlockInfo.blockContainer.beforePos,
                  to: prevBlockInfo.blockContainer.afterPos,
                })
                .run();
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
            // TODO: Change this to not rely on offsets & schema assumptions
            const { blockContainer, blockContent, blockGroup } =
              getBlockInfoFromSelection(state);

            const { depth } = state.doc.resolve(blockContainer.beforePos);
            const blockAtDocEnd =
              blockContainer.afterPos === state.doc.nodeSize - 3;
            const selectionAtBlockEnd =
              state.selection.from === blockContent.afterPos - 1;
            const selectionEmpty = state.selection.empty;
            const hasChildBlocks = blockGroup !== undefined;

            if (
              !blockAtDocEnd &&
              selectionAtBlockEnd &&
              selectionEmpty &&
              !hasChildBlocks
            ) {
              let oldDepth = depth;
              let newPos = blockContainer.afterPos + 1;
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
            const { blockContent, blockContainer } =
              getBlockInfoFromSelection(state);

            const { depth } = state.doc.resolve(blockContainer.beforePos);

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = blockContent.node.childCount === 0;
            const blockIndented = depth > 1;

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
          commands.command(({ state, dispatch }) => {
            const { blockContainer, blockContent } =
              getBlockInfoFromSelection(state);

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;
            const blockEmpty = blockContent.node.childCount === 0;

            if (selectionAtBlockStart && selectionEmpty && blockEmpty) {
              const newBlockInsertionPos = blockContainer.afterPos;
              const newBlockContentPos = newBlockInsertionPos + 2;

              if (dispatch) {
                const newBlock =
                  state.schema.nodes["blockContainer"].createAndFill()!;

                state.tr
                  .insert(newBlockInsertionPos, newBlock)
                  .scrollIntoView();
                state.tr.setSelection(
                  new TextSelection(state.doc.resolve(newBlockContentPos))
                );
              }

              return true;
            }

            return false;
          }),
        // Splits the current block, moving content inside that's after the cursor to a new text block below. Also
        // deletes the selection beforehand, if it's not empty.
        () =>
          commands.command(({ state, chain }) => {
            const { blockContent } = getBlockInfoFromSelection(state);

            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const blockEmpty = blockContent.node.childCount === 0;

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
