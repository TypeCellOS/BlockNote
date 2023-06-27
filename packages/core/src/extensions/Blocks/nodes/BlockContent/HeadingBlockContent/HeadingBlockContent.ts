import styles from "../../Block.module.css";

import { InputRule } from "@remirror/pm/inputrules";
import {
  ApplySchemaAttributes,
  NodeExtension,
  NodeExtensionSpec,
} from "remirror";
export class HeadingBlockContentExtension extends NodeExtension {
  get name() {
    return "heading" as const;
  }

  createNodeSpec(extra: ApplySchemaAttributes): NodeExtensionSpec {
    return {
      content: "inline*",
      group: "blockContent",

      attrs: {
        ...extra.defaults(),
        level: {
          default: "1",
          // TODO, data-level
          // parseDOM: (element) => element.getAttribute("data-level"),
          // toDOM: (attributes) => {
          //   return {
          //     "data-level": attributes.level,
          //   };
          // },
        },
      },
      toDOM: (node) => {
        return [
          "div",
          {
            class: styles.blockContent,
            "data-content-type": this.name,
          },
          ["h" + node.attrs.level, { class: styles.inlineContent }, 0],
        ];
      },
      parseDOM: [
        {
          tag: "h1",
          attrs: { level: "1" },
          node: "heading",
        },
        {
          tag: "h2",
          attrs: { level: "2" },
          node: "heading",
        },
        {
          tag: "h3",
          attrs: { level: "3" },
          node: "heading",
        },
      ],
    };
  }

  createInputRules(): InputRule[] {
    return ["1", "2", "3"].map((level) => {
      return new InputRule(
        new RegExp(`^(#{${parseInt(level)}})\\s$`),
        (state, match, start, end) => {
          const tr = state.tr;
          // chain()
          //   .BNUpdateBlock(state.selection.from, {
          //     type: "heading",
          //     props: {
          //       level: level as "1" | "2" | "3",
          //     },
          //   })
          // Removes the "#" character(s) used to set the heading.
          tr.deleteRange(start, end);
          return tr;
        }
      );
    });
  }

  // addInputRules() {
  //   return [
  //     ...["1", "2", "3"].map((level) => {
  //       // Creates a heading of appropriate level when starting with "#", "##", or "###".
  //       return new InputRule({
  //         find: new RegExp(`^(#{${parseInt(level)}})\\s$`),
  //         handler: ({ state, chain, range }) => {
  //           chain()
  //             .BNUpdateBlock(state.selection.from, {
  //               type: "heading",
  //               props: {
  //                 level: level as "1" | "2" | "3",
  //               },
  //             })
  //             // Removes the "#" character(s) used to set the heading.
  //             .deleteRange({ from: range.from, to: range.to });
  //         },
  //       });
  //     }),
  //   ];
  // },
}
