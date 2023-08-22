import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";

// based on https://github.com/ueberdosis/tiptap/blob/40a9404c94c7fef7900610c195536384781ae101/demos/src/Experiments/TrailingNode/Vue/trailing-node.ts

/**
 * Extension based on:
 * - https://github.com/ueberdosis/tiptap/blob/v1/packages/tiptap-extensions/src/extensions/TrailingNode.js
 * - https://github.com/remirror/remirror/blob/e0f1bec4a1e8073ce8f5500d62193e52321155b9/packages/prosemirror-trailing-node/src/trailing-node-plugin.ts
 */

export interface TrailingNodeOptions {
  node: string;
}

/**
 * Add a trailing node to the document so the user can always click at the bottom of the document and start typing
 */
export const TrailingNode = Extension.create<TrailingNodeOptions>({
  name: "trailingNode",

  addProseMirrorPlugins() {
    const plugin = new PluginKey(this.name);
    // const disabledNodes = Object.entries(this.editor.schema.nodes)
    //   .map(([, value]) => value)
    //   .filter((node) => this.options.notAfter.includes(node.name));

    return [
      new Plugin({
        key: plugin,
        appendTransaction: (_, __, state) => {
          const { doc, tr, schema } = state;
          const shouldInsertNodeAtEnd = plugin.getState(state);
          const endPosition = doc.content.size - 2;
          const type = schema.nodes["blockContainer"];
          const contentType = schema.nodes["paragraph"];
          if (!shouldInsertNodeAtEnd) {
            return;
          }

          return tr.insert(
            endPosition,
            type.create(undefined, contentType.create())
          );
        },
        state: {
          init: (_, _state) => {
            // (maybe fix): use same logic as apply() here
            // so it works when initializing
          },
          apply: (tr, value) => {
            if (!tr.docChanged) {
              return value;
            }

            let lastNode = tr.doc.lastChild;

            if (!lastNode || lastNode.type.name !== "blockGroup") {
              throw new Error("Expected blockGroup");
            }

            lastNode = lastNode.lastChild;

            if (!lastNode || lastNode.type.name !== "blockContainer") {
              throw new Error("Expected blockContainer");
            }

            const lastContentNode = lastNode.firstChild;

            if (!lastContentNode) {
              throw new Error("Expected blockContent");
            }

            // If last node is not empty (size > 4) or it doesn't contain
            // inline content, we need to add a trailing node.
            return (
              lastNode.nodeSize > 4 ||
              lastContentNode.type.spec.content !== "inline*"
            );
          },
        },
      }),
    ];
  },
});
