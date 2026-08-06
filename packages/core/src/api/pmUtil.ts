import type { Node, NodeType, Schema } from "prosemirror-model";
import { Transform } from "prosemirror-transform";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { BlockNoteSchema } from "../blocks/BlockNoteSchema.js";
import type { BlockSchema } from "../schema/blocks/types.js";
import type { InlineContentSchema } from "../schema/inlineContent/types.js";
import type { StyleSchema } from "../schema/styles/types.js";

export function getPmSchema(trOrNode: Transform | Node) {
  if ("doc" in trOrNode) {
    return trOrNode.doc.type.schema;
  }
  return trOrNode.type.schema;
}

function getBlockNoteEditor<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(schema: Schema): BlockNoteEditor<BSchema, I, S> {
  return schema.cached.blockNoteEditor as BlockNoteEditor<BSchema, I, S>;
}

export function getBlockNoteSchema<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(schema: Schema): BlockNoteSchema<BSchema, I, S> {
  return getBlockNoteEditor(schema).schema as unknown as BlockNoteSchema<
    BSchema,
    I,
    S
  >;
}

export function getBlockSchema<BSchema extends BlockSchema>(
  schema: Schema,
): BSchema {
  return getBlockNoteSchema(schema).blockSchema as BSchema;
}

export function getInlineContentSchema<I extends InlineContentSchema>(
  schema: Schema,
): I {
  return getBlockNoteSchema(schema).inlineContentSchema as I;
}

export function getStyleSchema<S extends StyleSchema>(schema: Schema): S {
  return getBlockNoteSchema(schema).styleSchema as S;
}

export function getBlockCache(schema: Schema) {
  return getBlockNoteEditor(schema).blockCache;
}

/**
 * Whether `nodeType` is a BlockNote block whose content type is `"plain"` — i.e.
 * it holds unstyled text and only allows the non-formatting (`"annotation"`)
 * marks. Resolved semantically from the block schema (the source of truth),
 * reachable from `schema.cached.blockNoteEditor`.
 *
 * Returns `false` for every non-block / structural node type (`doc`,
 * `blockGroup`, `text`, inline content, table sub-nodes), since those aren't
 * keys in the block schema.
 */
export function isPlainContentNodeType(
  schema: Schema,
  nodeType: NodeType,
): boolean {
  return getBlockSchema(schema)[nodeType.name]?.content === "plain";
}
