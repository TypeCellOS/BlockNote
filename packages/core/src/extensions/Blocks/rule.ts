import {
  callOrReturn,
  ExtendedRegExpMatchArray,
  InputRule,
  InputRuleFinder,
} from "@tiptap/core";
import { NodeType } from "prosemirror-model";

/**
 * Modified version of https://github.com/ueberdosis/tiptap/blob/6a813686f5e87cebac49a624936dbeadb5a29f95/packages/core/src/inputRules/textblockTypeInputRule.ts
 * But instead of changing the type of a node, we use setNodeMarkup to change some of it's current attributes
 *
 * Build an input rule that changes the type of a textblock when the
 * matched text is typed into it. When using a regular expresion you’ll
 * probably want the regexp to start with `^`, so that the pattern can
 * only occur at the start of a textblock.
 */
export function textblockTypeInputRuleSameNodeType(config: {
  find: InputRuleFinder;
  type: NodeType;
  getAttributes?:
    | Record<string, any>
    | ((match: ExtendedRegExpMatchArray) => Record<string, any>)
    | false
    | null;
}) {
  return new InputRule({
    find: config.find,
    handler: ({ state, range, match }) => {
      const $start = state.doc.resolve(range.from);
      const attributes =
        callOrReturn(config.getAttributes, undefined, match) || {};

      const blockNode = $start.node(-1);
      if (blockNode.type !== config.type) {
        return null;
      }

      state.tr
        .setNodeMarkup(range.from - 2, undefined, {
          ...blockNode.attrs,
          ...attributes,
        })
        .delete(range.from, range.to);
      return;
    },
  });
}
