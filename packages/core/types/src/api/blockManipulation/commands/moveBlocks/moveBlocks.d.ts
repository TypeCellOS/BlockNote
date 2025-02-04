import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor";
import { BlockIdentifier } from "../../../../schema/index.js";
/**
 * Removes the selected blocks from the editor, then inserts them before/after a
 * reference block. Also updates the selection to match the original selection
 * using `getBlockSelectionData` and `updateBlockSelectionFromData`.
 * @param editor The BlockNote editor instance to move the blocks in.
 * @param referenceBlock The reference block to insert the selected blocks
 * before/after.
 * @param placement Whether to insert the selected blocks before or after the
 * reference block.
 */
export declare function moveSelectedBlocksAndSelection(editor: BlockNoteEditor<any, any, any>, referenceBlock: BlockIdentifier, placement: "before" | "after"): void;
export declare function moveBlocksUp(editor: BlockNoteEditor<any, any, any>): void;
export declare function moveBlocksDown(editor: BlockNoteEditor<any, any, any>): void;
