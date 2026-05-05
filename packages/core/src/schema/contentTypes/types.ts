import type { Node as TiptapNode } from "@tiptap/core";
import type { Node as PMNode, Schema } from "prosemirror-model";

import type {
  Extension,
  ExtensionFactoryInstance,
} from "../../editor/BlockNoteExtension.js";
import type {
  InlineContent,
  InlineContentSchema,
  PartialInlineContent,
} from "../inlineContent/types.js";
import type { StyleSchema } from "../styles/types.js";

/**
 * Helpers passed into a {@link ContentType}'s conversion callbacks. These give
 * the content type access to the editor's schemas plus the standard inline-
 * content conversion routines, so the callbacks don't need to import directly
 * from the conversion layer.
 */
export interface ContentTypeContext {
  schema: Schema;
  inlineContentSchema: InlineContentSchema;
  styleSchema: StyleSchema;
  /**
   * Convert a ProseMirror content node (something with `inline*` content) to a
   * BlockNote `InlineContent[]` array.
   */
  contentNodeToInlineContent: (
    node: PMNode,
  ) => InlineContent<InlineContentSchema, StyleSchema>[];
  /**
   * Convert a BlockNote inline-content array back to ProseMirror nodes
   * (text + marks + hard-breaks). The optional `blockType` is used to detect
   * code blocks (which suppress hard-break parsing).
   */
  inlineContentToNodes: (
    content: PartialInlineContent<InlineContentSchema, StyleSchema>,
    blockType?: string,
  ) => PMNode[];
  /**
   * Convert a `bnBlock`-group ProseMirror node (a `blockContainer` or column-
   * style node) into a full BlockNote `Block` JSON object. Used by the
   * `blocks` combinator to walk children when building JSON for a slot whose
   * content is editor blocks rather than inline text.
   */
  nodeToBlock: (node: PMNode) => unknown;
  /**
   * Convert a (partial) BlockNote `Block` JSON object into the corresponding
   * `blockContainer` ProseMirror node. Inverse of {@link nodeToBlock}; used by
   * the `blocks` combinator's reverse path.
   */
  blockToNode: (block: unknown) => PMNode;
}

/**
 * Describes a custom shape of editable content within a block: the ProseMirror
 * nodes that make up its internal structure, plus bidirectional conversion
 * to/from BlockNote JSON.
 *
 * Today, `"inline"` and `"none"` are built-in content modes handled by hard-
 * coded branches in the conversion layer; `"table"` is a hand-rolled special
 * case. `ContentType` promotes the table-style customization into a first-class
 * abstraction so any block can define its own structured content shape.
 *
 * The first consumer of this interface is the table block, which is being
 * rebuilt on top of it without any change to its observable behavior or JSON
 * shape. The interface is intentionally narrow at this stage; HTML import/
 * export hooks and richer context helpers can be added in subsequent phases.
 */
// Constrains TJSONOut <: TJSONIn so the canonical (full) JSON shape is provably
// assignable to the partial input shape — preserving the existing invariant
// that `Block` is assignable to `PartialBlock`.
export interface ContentType<
  TJSONIn = unknown,
  TJSONOut extends TJSONIn = TJSONIn,
> {
  /**
   * Unique identifier for this content type.
   */
  readonly name: string;

  /**
   * The Tiptap node whose content expression becomes the block's direct
   * content. For the table content type, this is the `table` node with
   * `content: "tableRow+"`.
   */
  readonly containerNode: TiptapNode;

  /**
   * Additional Tiptap nodes that the container references, transitively. For
   * the table content type, this is `[tableRow, tableCell, tableHeader,
   * tableParagraph]`.
   */
  readonly innerNodes: readonly TiptapNode[];

  /**
   * Additional Tiptap extensions this content type needs at runtime
   * (e.g. table column resizing, custom keyboard shortcuts that only make
   * sense within this content shape).
   */
  readonly extensions?: readonly (Extension | ExtensionFactoryInstance)[];

  /**
   * Convert a ProseMirror node of {@link containerNode}'s type into BlockNote
   * JSON. Always produces the canonical (non-partial) JSON shape.
   *
   * Named `nodeToJSON` rather than `toJSON` to avoid colliding with the
   * `JSON.stringify`/`pretty-format` `toJSON` convention, which would call
   * this method with no arguments during incidental serialization.
   */
  nodeToJSON(node: PMNode, ctx: ContentTypeContext): TJSONOut;

  /**
   * Convert BlockNote JSON of this content type into ProseMirror child nodes
   * suitable for placing inside the container node. Accepts the input-side
   * JSON shape, which is typically a partial form of `TJSONOut` to match how
   * `PartialBlock.content` relates to `Block.content` elsewhere.
   *
   * The caller wraps the result with
   * `schema.nodes[containerNode.name].createChecked(props, …)`.
   */
  jsonToNodes(json: TJSONIn, ctx: ContentTypeContext): readonly PMNode[];

  /**
   * Optional. Override the value used by `JSON.stringify` and snapshot-test
   * pretty-printers. Defining a concise return value here keeps schema
   * snapshots tidy by avoiding a full dump of the underlying Tiptap node tree.
   * Has no effect on runtime PM ↔ JSON conversion (which goes through
   * `nodeToJSON` / `jsonToNodes`).
   */
  toJSON?(): unknown;
}
