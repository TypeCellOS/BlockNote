import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { TextCursorPosition } from "../../../../editor/cursorPositionTypes.js";
import { BlockIdentifier, BlockSchema, InlineContentSchema, StyleSchema } from "../../../../schema/index.js";
export declare function getTextCursorPosition<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>): TextCursorPosition<BSchema, I, S>;
export declare function setTextCursorPosition<BSchema extends BlockSchema, I extends InlineContentSchema, S extends StyleSchema>(editor: BlockNoteEditor<BSchema, I, S>, targetBlock: BlockIdentifier, placement?: "start" | "end"): void;
