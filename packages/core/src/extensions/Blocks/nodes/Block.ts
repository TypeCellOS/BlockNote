import { mergeAttributes, Node } from "@tiptap/core";
import { Selection } from "prosemirror-state";
import styles from "./Block.module.css";
import { PreviousBlockTypePlugin } from "../PreviousBlockTypePlugin";
import { textblockTypeInputRuleSameNodeType } from "../rule";

export interface IBlock {
  HTMLAttributes: Record<string, any>;
}

export type Level = 1 | 2 | 3;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockHeading: {
      /**
       * Set a heading node
       */
      setBlockHeading: (attributes: { headingType: Level }) => ReturnType;
      /**
       * Toggle a heading node
       */
      toggleBlockHeading: (attributes: { level: Level }) => ReturnType;
    };
  }
}
// TODO: document, clean commands
export const Block = Node.create<IBlock>({
  name: "tcblock",
  group: "block",
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  // A block always contains content, and optionally a blockGroup which contains nested blocks
  content: "tccontent blockGroup?",

  defining: true,

  addAttributes() {
    return {
      listType: {
        default: undefined,
        renderHTML: (attributes) => {
          return {
            "data-listType": attributes.listType,
          };
        },
        parseHTML: (element) => element.getAttribute("data-listType"),
      },
      blockColor: {
        default: undefined,
        renderHTML: (attributes) => {
          return {
            "data-blockColor": attributes.blockColor,
          };
        },
        parseHTML: (element) => element.getAttribute("data-blockColor"),
      },
      blockStyle: {
        default: undefined,
        renderHTML: (attributes) => {
          return {
            "data-blockStyle": attributes.blockStyle,
          };
        },
        parseHTML: (element) => element.getAttribute("data-blockStyle"),
      },
      headingType: {
        default: undefined,
        keepOnSplit: false,
        renderHTML: (attributes) => {
          return {
            "data-headingType": attributes.headingType,
          };
        },
        parseHTML: (element) => element.getAttribute("data-headingType"),
      },
    };
  },

  // TODO: should we parse <li>, <ol>, <h1>, etc?
  parseHTML() {
    return [
      {
        tag: "div",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: styles.blockOuter,
      }),
      [
        "div",
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          class: styles.block,
        }),
        0,
      ],
    ];
  },

  addInputRules() {
    return [
      ...[1, 2, 3].map((level) => {
        // Create a heading when starting with "#", "##", or "###""
        return textblockTypeInputRuleSameNodeType({
          find: new RegExp(`^(#{1,${level}})\\s$`),
          type: this.type,
          getAttributes: {
            headingType: level,
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
    ];
  },

  addCommands() {
    return {
      setBlockHeading: (_attributes) => () => {
        // TODO
        return false;
        // return commands.setNode(this.name, attributes);
      },
      toggleBlockHeading:
        (attributes) =>
        ({ commands }) => {
          // TODO
          return commands.updateAttributes(this.name, {
            headingType: attributes.level,
          });
        },
    };
  },
  addProseMirrorPlugins() {
    return [PreviousBlockTypePlugin()];
  },
  addKeyboardShortcuts() {
    const handleBackspace = () =>
      this.editor.commands.first(({ commands }) => [
        () => commands.undoInputRule(),
        // maybe convert first text block node to default node
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
        () => commands.deleteSelection(),
        () =>
          commands.command(({ tr }) => {
            const isAtStartOfNode = tr.selection.$anchor.parentOffset === 0;
            if (isAtStartOfNode) {
              const node = tr.selection.$anchor.node(-1);
              const nodePos = tr.selection.$anchor.posAtIndex(0, -1) - 1;

              // const node2 = tr.doc.nodeAt(nodePos);
              if (node.type.name === "tcblock" && node.attrs["listType"]) {
                tr.setNodeMarkup(nodePos, undefined, {
                  ...node.attrs,
                  listType: undefined,
                });
                return true;
                //   commands.updateAttributes("tcblock", {
                //     ...node.attrs,
                //     listType: undefined,
                //   })
                // );
              } else {
                return commands.liftListItem("tcblock");
              }
            }
            // console.log(tr.selection);
            return false;
          }),
        // () => {
        //   commands.command(({}))
        // },
        // () => {
        //   const first = commands.joinBackward();
        //   return first;
        // },
        ({ chain }) =>
          chain()
            .command(({ tr, state }) => {
              const isAtStartOfNode = tr.selection.$anchor.parentOffset === 0;
              if (isAtStartOfNode) {
                const anchor = tr.selection.$anchor;
                const node = anchor.node(-1);
                if (node.type.name === "tcblock") {
                  if (node.childCount === 2) {
                    // const nestedBlockRange = {
                    //   start: anchor.posAtIndex(1, -1) + 1,
                    //   end: anchor.posAtIndex(2, -1),
                    // };

                    const startSecondChild = anchor.posAtIndex(1, -1) + 1; // start of blockgroup
                    state.doc
                      .resolve(startSecondChild)
                      .blockRange(
                        state.doc.resolve(37),
                        (node) => node.type.name === "blockGroup"
                      );
                    const endSecondChild = anchor.posAtIndex(2, -1) - 1;
                    const range = state.doc
                      .resolve(startSecondChild)
                      .blockRange(state.doc.resolve(endSecondChild));
                    // const range2 = state.doc
                    //   .resolve(anchor.posAtIndex(1, -1) + 1)
                    //   .blockRange(state.doc.resolve(anchor.posAtIndex(2, -1)));
                    tr.lift(range!, anchor.depth - 2);
                    // tr.step(new ReplaceAroundStep(start, end, gapStart, gapEnd,
                    //   new Slice(before.append(after), openStart, openEnd),
                    //   before.size - openStart, true))
                    // const pos = anchor.posAtIndex(node.firstChild!.nodeSize + 1, -1);
                  }
                  return true;
                }
              }
              return false;
            })
            .joinBackward()
            .run(),

        () => commands.selectNodeBackward(),
        // () => true,
      ]);

    return {
      Enter: () =>
        this.editor.commands.first(({ commands }) => [
          () => commands.splitListItem("tcblock"),
          ({ tr }) => {
            const $from = tr.selection.$from;
            if ($from.depth !== 3) {
              return false;
            }
            const node = tr.selection.$anchor.node(-1);
            const nodePos = tr.selection.$anchor.posAtIndex(0, -1) - 1;
            // const node2 = tr.doc.nodeAt(nodePos);
            if (node.type.name === "tcblock" && node.attrs["listType"]) {
              tr.setNodeMarkup(nodePos, undefined, {
                ...node.attrs,
                listType: undefined,
              });
              return true;
            }
            return false;
          },
          ({ tr }) => {
            const $from = tr.selection.$from;
            // if ($from.depth !== 3) {
            //   return false;
            // }
            tr.split($from.pos, 2).scrollIntoView();
            return true;
          },
        ]),
      Tab: () => this.editor.commands.sinkListItem("tcblock"),
      "Shift-Tab": () => {
        return this.editor.commands.liftListItem("tcblock");
      },
      Backspace: handleBackspace,
    };
  },
});
