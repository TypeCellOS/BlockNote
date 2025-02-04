import { Extension } from "@tiptap/core";
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
export declare const TrailingNode: Extension<TrailingNodeOptions, any>;
