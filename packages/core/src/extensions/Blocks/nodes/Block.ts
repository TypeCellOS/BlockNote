import { InputRule, mergeAttributes, Node } from "@tiptap/core";
import { Selection, TextSelection } from "prosemirror-state";
import { joinBackward } from "../commands/joinBackward";
import { OrderedListPlugin } from "../OrderedListPlugin";
import { PreviousBlockTypePlugin } from "../PreviousBlockTypePlugin";
import { textblockTypeInputRuleSameNodeType } from "../rule";
import styles from "./Block.module.css";
import BlockAttributes from "../BlockAttributes";
import { HeadingBlockAttributes } from "./HeadingBlock";
import { getBlockFromPos } from "../helpers/getBlockFromPos";

export interface IBlock {
  HTMLAttributes: Record<string, any>;
}

export type BlockContentAttributes = HeadingBlockAttributes;

export type Level = "1" | "2" | "3";
export type ListType = "li" | "oli";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    block: {
      createBlock: (
        pos: number,
        type: string,
        attributes?: BlockContentAttributes
      ) => ReturnType;
      setBlockType: (
        posInBlock: number,
        type: string,
        attributes?: BlockContentAttributes
      ) => ReturnType;
      createOrSetBlock: (
        posInBlock: number,
        type: string,
        attributes?: BlockContentAttributes
      ) => ReturnType;
      getBlockFromPos: (posInBlock: number) => ReturnType;

      setBlockList: (type: ListType) => ReturnType;
      unsetList: () => ReturnType;
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
  content: "(textBlock | headingBlock) blockgroup?",

  defining: true,

  addAttributes() {
    return {
      listType: {
        default: undefined,
      },
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
      // For parsing blocks within the editor.
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
      // For parsing list items copied from outside the editor.
      {
        tag: "li",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          const parent = element.parentElement;

          if (parent === null) {
            return false;
          }

          // Gets type of list item (ordered/unordered) based on parent element's tag ("ol"/"ul").
          if (parent.tagName === "UL") {
            return { listType: "li" };
          }

          if (parent.tagName === "OL") {
            return { listType: "oli" };
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
          "data-node-type": "block",
        }),
        0,
      ],
    ];
  },

  addInputRules() {
    return [
      ...["1", "2", "3"].map((level) => {
        // Create a heading of appropriate level when starting with "#", "##", or "###".
        return new InputRule({
          find: new RegExp(`^(#{${parseInt(level)}})\\s$`),
          handler: ({ state, commands, range }) => {
            commands.setBlockType(state.selection.anchor, "headingBlock", {
              level: level,
            });

            // Removes "#" character(s) used to set the heading.
            state.tr.deleteRange(range.from, range.to);
          },
        });
      }),
      // Create a list when starting with "-"
      textblockTypeInputRuleSameNodeType({
        find: /^\s*([-+*])\s$/,
        type: this.type,
        getAttributes: {
          listType: "li",
        },
      }),
      textblockTypeInputRuleSameNodeType({
        find: new RegExp(/^1.\s/),
        type: this.type,
        getAttributes: {
          listType: "oli",
        },
      }),
    ];
  },

  addCommands() {
    return {
      // Creates a new block of a given type at a given position.
      createBlock:
        (pos, type, attributes) =>
        ({ state, commands }) => {
          const newBlock =
            state.schema.nodes["block"].createAndFill(attributes)!;
          state.tr.insert(pos, newBlock);

          // posInNewBlock should be in the new block's child content node, which is why it's shifted by 2.
          const posInNewBlock = pos + 2;
          commands.setBlockType(posInNewBlock, type, attributes);
          state.tr.setSelection(
            new TextSelection(state.doc.resolve(posInNewBlock))
          );

          return true;
        },
      // Gets the block that a given position lies in and changes it to a given type.
      setBlockType:
        (posInBlock, type, attributes) =>
        ({ state }) => {
          const block = getBlockFromPos(state, posInBlock);
          if (block === undefined) return false;

          const depth = block.depth;
          const depthDiff = state.doc.resolve(posInBlock).depth - depth;
          const start = state.doc.resolve(posInBlock).start(depth + depthDiff);
          const end = state.doc.resolve(posInBlock).end(depth + depthDiff);

          state.tr.setBlockType(
            start,
            end,
            state.schema.node(type).type,
            attributes
          );

          return true;
        },
      // Gets the block that a given position lies in and changes it to a given type if it's empty, otherwise creates a
      // new block of that type below it.
      createOrSetBlock:
        (posInBlock, type, attributes) =>
        ({ state, commands }) => {
          const block = getBlockFromPos(state, posInBlock);
          if (block === undefined) return false;

          const { node, depth } = block;

          if (node.textContent.length === 0) {
            commands.setBlockType(posInBlock, type, attributes);
          } else {
            const newBlockInsertionPos = state.doc
              .resolve(posInBlock)
              .after(depth);

            commands.createBlock(newBlockInsertionPos, type, attributes);
          }

          return true;
        },
      setBlockList:
        (type) =>
        ({ tr, dispatch }) => {
          const node = tr.selection.$anchor.node(-1);
          const nodePos = tr.selection.$anchor.posAtIndex(0, -1) - 1;

          // const node2 = tr.doc.nodeAt(nodePos);
          if (node.type.name === "block") {
            if (dispatch) {
              tr.setNodeMarkup(nodePos, undefined, {
                ...node.attrs,
                listType: type,
              });
            }
            return true;
          }
          return false;
        },
      unsetList:
        () =>
        ({ tr, dispatch }) => {
          const node = tr.selection.$anchor.node(-1);
          const nodePos = tr.selection.$anchor.posAtIndex(0, -1) - 1;

          // const node2 = tr.doc.nodeAt(nodePos);
          if (node.type.name === "block" && node.attrs["listType"]) {
            if (dispatch) {
              tr.setNodeMarkup(nodePos, undefined, {
                ...node.attrs,
                listType: undefined,
              });
              return true;
            }
          }
          return false;
        },
      joinBackward:
        () =>
        ({ view, dispatch, state }) =>
          joinBackward(state, dispatch, view), // Override default joinBackward with edited command
    };
  },
  addProseMirrorPlugins() {
    return [PreviousBlockTypePlugin(), OrderedListPlugin()];
  },
  addKeyboardShortcuts() {
    // handleBackspace is partially adapted from https://github.com/ueberdosis/tiptap/blob/ed56337470efb4fd277128ab7ef792b37cfae992/packages/core/src/extensions/keymap.ts
    const handleBackspace = () =>
      this.editor.commands.first(({ commands }) => [
        // Maybe the user wants to undo an auto formatting input rule (e.g.: - or #, and then hit backspace) (source: tiptap)
        () => commands.undoInputRule(),
        // maybe convert first text block node to default node (source: tiptap)
        () =>
          commands.command(({ tr }) => {
            const { selection, doc } = tr;
            const { empty, $anchor } = selection;
            const { pos, parent } = $anchor;
            const isAtStart = Selection.atStart(doc).from === pos;

            if (
              !empty ||
              !isAtStart ||
              !parent.type.isTextblock ||
              parent.textContent.length
            ) {
              return false;
            }

            return commands.clearNodes();
          }),
        () => commands.deleteSelection(), // (source: tiptap)
        () =>
          commands.command(({ tr }) => {
            const isAtStartOfNode = tr.selection.$anchor.parentOffset === 0;
            const node = tr.selection.$anchor.node(-1);
            if (isAtStartOfNode && node.type.name === "block") {
              // we're at the start of the block, so we're trying to "backspace" the bullet or indentation
              return commands.first([
                () => commands.unsetList(), // first try to remove the "list" property
                () => commands.liftListItem("block"), // then try to remove a level of indentation
              ]);
            }
            return false;
          }),
        ({ chain }) =>
          // we are at the start of a block at the root level. The user hits backspace to "merge it" to the end of the block above
          //
          // BlockA
          // BlockB

          // Becomes:

          // BlockABlockB

          chain()
            .command(({ tr, state, dispatch }) => {
              const isAtStartOfNode = tr.selection.$anchor.parentOffset === 0;
              const anchor = tr.selection.$anchor;
              const node = anchor.node(-1);
              if (isAtStartOfNode && node.type.name === "block") {
                if (node.childCount === 2) {
                  // BlockB has children. We want to go from this:
                  //
                  // BlockA
                  // BlockB
                  //    BlockC
                  //        BlockD
                  //
                  // to:
                  //
                  // BlockABlockB
                  // BlockC
                  //     BlockD

                  // This parts moves the children of BlockB to the top level
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
            // use joinBackward to merge BlockB to BlockA (i.e.: turn it into BlockABlockB)
            // The standard JoinBackward would break here, and would turn it into:
            // BlockA
            //     BlockB
            //
            // joinBackward has been patched with our custom version to fix this (see commands/joinBackward)
            .joinBackward()
            .run(),

        () => commands.selectNodeBackward(), // (source: tiptap)
      ]);

    const handleEnter = () =>
      this.editor.commands.first(({ commands }) => [
        // Try to split the current block into 2 items:
        () => commands.splitListItem("block"),
        // Otherwise, maybe we are in an empty list item. "Enter" should remove the list bullet
        ({ tr, dispatch }) => {
          const $from = tr.selection.$from;
          if ($from.depth !== 3) {
            // only needed at root level, at deeper levels it should be handled already by splitListItem
            return false;
          }
          const node = tr.selection.$anchor.node(-1);
          const nodePos = tr.selection.$anchor.posAtIndex(0, -1) - 1;

          if (node.type.name === "block" && node.attrs["listType"]) {
            if (dispatch) {
              tr.setNodeMarkup(nodePos, undefined, {
                ...node.attrs,
                listType: undefined,
              });
            }
            return true;
          }
          return false;
        },
        // Otherwise, we might be on an empty line and hit "Enter" to create a new line:
        ({ tr, dispatch }) => {
          const $from = tr.selection.$from;

          if (dispatch) {
            tr.split($from.pos, 2).scrollIntoView();
          }
          return true;
        },
      ]);

    return {
      Backspace: handleBackspace,
      Enter: handleEnter,
      Tab: () => this.editor.commands.sinkListItem("block"),
      "Shift-Tab": () => {
        return this.editor.commands.liftListItem("block");
      },
      "Mod-Alt-0": () =>
        this.editor.commands.setTextBlock(this.editor.state.selection.anchor),
      "Mod-Alt-1": () =>
        this.editor.commands.setBlockType(
          this.editor.state.selection.anchor,
          "headingBlock",
          { level: "1" }
        ),
      "Mod-Alt-2": () =>
        this.editor.commands.setBlockType(
          this.editor.state.selection.anchor,
          "headingBlock",
          { level: "2" }
        ),
      "Mod-Alt-3": () =>
        this.editor.commands.setBlockType(
          this.editor.state.selection.anchor,
          "headingBlock",
          { level: "3" }
        ),
      "Mod-Shift-7": () => this.editor.commands.setBlockList("li"),
      "Mod-Shift-8": () => this.editor.commands.setBlockList("oli"),
      // TODO: Add shortcuts for numbered and bullet list
    };
  },
});
