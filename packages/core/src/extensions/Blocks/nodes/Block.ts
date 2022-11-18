import { InputRule, mergeAttributes, Node } from "@tiptap/core";
import { joinBackward } from "../commands/joinBackward";
import { PreviousBlockTypePlugin } from "../PreviousBlockTypePlugin";
import { getBlockFromPos } from "../helpers/getBlockFromPos";
import { getBlockRangeFromPos } from "../helpers/getBlockRangeFromPos";
import BlockAttributes from "../BlockAttributes";
import { HeadingBlockAttributes } from "./HeadingBlock";
import { ListItemBlockAttributes } from "./ListItemBlock";
import styles from "./Block.module.css";

export interface IBlock {
  HTMLAttributes: Record<string, any>;
}

export type BlockContentAttributes =
  | HeadingBlockAttributes
  | ListItemBlockAttributes;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    block: {
      createBlock: (pos: number) => ReturnType;
      setContentType: (
        posInBlock: number,
        type: string,
        attributes?: BlockContentAttributes
      ) => ReturnType;
      createBlockOrSetContentType: (
        posInBlock: number,
        type: string,
        attributes?: BlockContentAttributes
      ) => ReturnType;
      deleteBlock: (posInBlock: number) => ReturnType;
    };
  }
}

/**
 * The main "Block node" documents consist of
 */
export const Block = Node.create<IBlock>({
  name: "block",
  group: "block",
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  // A block always contains content, and optionally a blockGroup which contains nested blocks
  content: "(textBlock | headingBlock | listItemBlock) blockgroup?",

  defining: true,

  addAttributes() {
    return {
      blockColor: {
        default: undefined,
      },
      blockStyle: {
        default: undefined,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          const attrs: Record<string, string> = {};
          for (let [nodeAttr, HTMLAttr] of Object.entries(BlockAttributes)) {
            if (element.getAttribute(HTMLAttr)) {
              attrs[nodeAttr] = element.getAttribute(HTMLAttr)!;
            }
          }

          if (element.getAttribute("data-node-type") === "block") {
            return attrs;
          }

          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs: Record<string, string> = {};
    for (let [nodeAttr, HTMLAttr] of Object.entries(BlockAttributes)) {
      if (HTMLAttributes[nodeAttr]) {
        attrs[HTMLAttr] = HTMLAttributes[nodeAttr];
      }
    }

    return [
      "div",
      mergeAttributes(attrs, {
        class: styles.blockOuter,
        "data-node-type": "block-outer",
      }),
      [
        "div",
        mergeAttributes(attrs, {
          class: styles.block,
          "data-node-type": this.name,
        }),
        0,
      ],
    ];
  },

  addInputRules() {
    return [
      ...["1", "2", "3"].map((level) => {
        // Creates a heading of appropriate level when starting with "#", "##", or "###".
        return new InputRule({
          find: new RegExp(`^(#{${parseInt(level)}})\\s$`),
          handler: ({ state, commands, range }) => {
            commands.setContentType(state.selection.from, "headingBlock", {
              level: level,
            });

            // Removes the "#" character(s) used to set the heading.
            state.tr.deleteRange(range.from, range.to);
          },
        });
      }),
      // Creates an unordered list when starting with "-", "+", or "*".
      new InputRule({
        find: new RegExp(`^[-+*]\\s$`),
        handler: ({ state, commands, range }) => {
          commands.setContentType(state.selection.from, "listItemBlock", {
            type: "unordered",
          });

          // Removes the "-", "+", or "*" character used to set the list.
          state.tr.deleteRange(range.from, range.to);
        },
      }),
      // Creates an ordered list when starting with "1.".
      new InputRule({
        find: new RegExp(`^1.\\s$`),
        handler: ({ state, commands, range }) => {
          commands.setContentType(state.selection.from, "listItemBlock", {
            type: "unordered",
          });

          // Removes the "1." characters used to set the list.
          state.tr.deleteRange(range.from, range.to);
        },
      }),
    ];
  },

  addCommands() {
    return {
      // Creates a new text block at a given position.
      createBlock:
        (pos) =>
        ({ state }) => {
          const newBlock = state.schema.nodes["block"].createAndFill()!;

          state.tr.insert(pos, newBlock);

          return true;
        },
      // Gets the block at a given position and changes it to a given type.
      setContentType:
        (posInBlock, type, attributes) =>
        ({ state }) => {
          const blockRange = getBlockRangeFromPos(state.doc, posInBlock);
          if (blockRange === undefined) return false;

          const { start, end } = blockRange;

          state.tr.setBlockType(
            start + 1,
            end - 1,
            state.schema.node(type).type,
            attributes
          );

          return true;
        },
      // Gets the block that the current selection start lies in and changes it to a given type if it's empty, otherwise
      // creates a new block of that type below it.
      createBlockOrSetContentType:
        (posInBlock, type, attributes) =>
        ({ state, chain }) => {
          const block = getBlockFromPos(state.doc, posInBlock);
          if (block === undefined) return false;

          const node = block.node;

          const blockRange = getBlockRangeFromPos(state.doc, posInBlock);
          if (blockRange === undefined) return false;

          const { start, end } = blockRange;

          if (node.textContent.length === 0) {
            const oldBlockContentPos = start + 1;

            return chain()
              .setContentType(posInBlock, type, attributes)
              .setTextSelection(oldBlockContentPos)
              .run();
          } else {
            const newBlockInsertionPos = end + 1;
            const newBlockContentPos = newBlockInsertionPos + 2;

            return chain()
              .createBlock(newBlockInsertionPos)
              .setContentType(newBlockContentPos, type, attributes)
              .setTextSelection(newBlockContentPos)
              .run();
          }
        },
      deleteBlock:
        (posInBlock) =>
        ({ state }) => {
          const blockRange = getBlockRangeFromPos(state.doc, posInBlock);
          if (blockRange === undefined) return false;

          const { start, end } = blockRange;

          state.tr.deleteRange(start, end);

          return true;
        },
      joinBackward:
        () =>
        ({ view, dispatch, state }) =>
          joinBackward(state, dispatch, view), // Override default joinBackward with edited command
    };
  },

  // addProseMirrorPlugins() {
  //   return [OrderedListPlugin()];
  // },

  addKeyboardShortcuts() {
    // handleBackspace is partially adapted from https://github.com/ueberdosis/tiptap/blob/ed56337470efb4fd277128ab7ef792b37cfae992/packages/core/src/extensions/keymap.ts
    const handleBackspace = () =>
      this.editor.commands.first(({ commands }) => [
        // Undoes an input rule if one was triggered in the last editor state change.
        () => commands.undoInputRule(),
        // Removes a level of nesting if the block is indented and the selection is at the start of the block.
        () =>
          commands.command(({ state }) => {
            const selectionAtBlockStart =
              state.selection.$anchor.parentOffset === 0;
            const selectionEmpty =
              state.selection.anchor === state.selection.head;

            const block = getBlockFromPos(state.doc, state.selection.anchor);
            if (block === undefined) return false;

            const depth = block.depth;

            if (selectionAtBlockStart && selectionEmpty && depth > 2) {
              return commands.liftListItem("block");
            }

            return false;
          }),
        // Merges block with the previous one if it isn't indented and the selection is at the start of the block.
        ({ chain }) =>
          // Removes a level of nesting from any child blocks, if the current block has any.
          // In the example below, the selection is at the start of BlockB and backspace is pressed.
          //
          // BlockA
          // BlockB
          //    BlockC
          //        BlockD
          //
          // Becomes:
          //
          // BlockA
          // BlockB
          // BlockC
          //     BlockD
          chain()
            .command(({ tr, state, dispatch }) => {
              const selectionAtBlockStart =
                state.selection.$anchor.parentOffset === 0;
              const selectionEmpty =
                state.selection.anchor === state.selection.head;

              const block = getBlockFromPos(state.doc, state.selection.anchor);
              if (block === undefined) return false;

              const depth = block.depth;

              const anchor = tr.selection.$anchor;
              const node = anchor.node(-1);

              if (selectionAtBlockStart && selectionEmpty && depth < 2) {
                if (node.childCount === 2) {
                  const startSecondChild = anchor.posAtIndex(1, -1) + 1; // start of blockgroup
                  const endSecondChild = anchor.posAtIndex(2, -1) - 1;
                  const range = state.doc
                    .resolve(startSecondChild)
                    .blockRange(state.doc.resolve(endSecondChild));

                  if (dispatch) {
                    tr.lift(range!, anchor.depth - 2);
                  }
                }
                return true;
              }
              return false;
            })
            // Merges the block (now without children) with the previous one.
            // The standard JoinBackward would break here, and would turn it into:
            //
            // BlockA
            //     BlockB
            // BlockC
            //     BlockD
            //
            // Instead of:
            //
            // BlockABlockB
            // BlockC
            //     BlockD
            //
            // It has been patched with our custom version to fix this (see commands/joinBackward)
            .joinBackward()
            .run(),

        () => commands.deleteSelection(),
      ]);

    const handleEnter = () =>
      this.editor.commands.first(({ commands }) => [
        () =>
          commands.command(({ state, chain }) => {
            const block = getBlockFromPos(state.doc, state.selection.from);
            if (block === undefined) return false;

            const node = block.node;

            if (node.textContent.length === 0) {
              const blockRange = getBlockRangeFromPos(
                state.doc,
                state.selection.from
              );
              if (blockRange === undefined) return false;

              const end = blockRange.end;

              const newBlockInsertionPos = end + 1;
              const newBlockContentPos = newBlockInsertionPos + 2;

              chain()
                .createBlock(newBlockInsertionPos)
                .setTextSelection(newBlockContentPos)
                .run();

              return true;
            }

            return false;
          }),
        () =>
          commands.command(({ state, chain }) => {
            const block = getBlockFromPos(state.doc, state.selection.from);
            if (block === undefined) return false;

            const node = block.node;

            if (node.textContent.length > 0) {
              chain().deleteSelection().splitListItem("block").run();

              return true;
            }

            return false;
          }),
      ]);

    return {
      Backspace: handleBackspace,
      Enter: handleEnter,
      Tab: () => this.editor.commands.sinkListItem("block"),
      "Shift-Tab": () => this.editor.commands.liftListItem("block"),
      "Mod-Alt-0": () =>
        this.editor.commands.setContentType(
          this.editor.state.selection.anchor,
          "textBlock"
        ),
      "Mod-Alt-1": () =>
        this.editor.commands.setContentType(
          this.editor.state.selection.anchor,
          "headingBlock",
          {
            level: "1",
          }
        ),
      "Mod-Alt-2": () =>
        this.editor.commands.setContentType(
          this.editor.state.selection.anchor,
          "headingBlock",
          {
            level: "2",
          }
        ),
      "Mod-Alt-3": () =>
        this.editor.commands.setContentType(
          this.editor.state.selection.anchor,
          "headingBlock",
          {
            level: "3",
          }
        ),
      "Mod-Shift-7": () =>
        this.editor.commands.setContentType(
          this.editor.state.selection.anchor,
          "listItemBlock",
          {
            type: "unordered",
          }
        ),
      "Mod-Shift-8": () =>
        this.editor.commands.setContentType(
          this.editor.state.selection.anchor,
          "listItemBlock",
          {
            type: "ordered",
          }
        ),
    };
  },
});
