import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../../schema/index.js";
export declare function handleFileInsertion<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(event: DragEvent | ClipboardEvent, editor: BlockNoteEditor<BSchema, I, S>): Promise<void>;
