import {
  callOrReturn,
  ExtendedRegExpMatchArray,
  InputRule,
  InputRuleFinder,
} from "@tiptap/core";
import { NodeType } from "prosemirror-model";

// TODO: document

/**
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
      // debugger;
      // if (
      //   !$start
      //     .node(-1)
      //     .canReplaceWith($start.index(-1), $start.indexAfter(-1), config.type)
      // ) {
      //   return null;
      // }

      const blockNode = $start.node(-1);
      if (blockNode.type !== config.type) {
        return null;
      }

      state.tr
        .setNodeMarkup(range.from - 2, undefined, {
          ...blockNode.attrs,
          ...attributes,
          // previousBlockType: $start.parent.attrs["blockType"],
        })
        .delete(range.from, range.to);
      // .setBlockType(range.from, range.from, config.type, attributes);
    },
  });
}
