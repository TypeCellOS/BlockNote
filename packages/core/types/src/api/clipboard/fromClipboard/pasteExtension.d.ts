import { Extension } from "@tiptap/core";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import { InlineContentSchema, StyleSchema } from "../../../schema/index.js";
export declare const createPasteFromClipboardExtension: <BSchema extends Record<string, import("../../../schema/index.js").BlockConfig>, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>) => Extension<any, any>;
