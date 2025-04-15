import type { Schema } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import type { BlockSchema } from "../schema/blocks/types.js";
import type { InlineContentSchema } from "../schema/inlineContent/types.js";
import type { StyleSchema } from "../schema/styles/types.js";

export function getSchemaForTransaction(tr: Transaction) {
  return tr.doc.type.schema;
}

export function getBlockNoteEditorForSchema(
  schema: Schema
): BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema> {
  return schema.cached.blockNoteEditor;
}

export function getBlockSchemaForSchema(schema: Schema) {
  return getBlockNoteEditorForSchema(schema).schema.blockSchema;
}

export function getInlineContentSchemaForSchema(schema: Schema) {
  return getBlockNoteEditorForSchema(schema).schema.inlineContentSchema;
}

export function getStyleSchemaForSchema(schema: Schema) {
  return getBlockNoteEditorForSchema(schema).schema.styleSchema;
}

export function getBlockCacheForSchema(schema: Schema) {
  return getBlockNoteEditorForSchema(schema).blockCache;
}
