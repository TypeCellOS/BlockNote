import { BlockNoteEditor } from "@blocknote/core";
import { Block } from "@blocknote/core";
import { MarkdownNodeDiffResult } from "./markdownNodeDiff.js";
/**
 * Takes a list of markdown node diffs and converts them into a list of block operations
 * to perform on the blocks to get to the target markdown
 */
export declare function markdownNodeDiffToBlockOperations(editor: BlockNoteEditor<any, any, any>, blocks: Block<any, any, any>[], markdownNodeDiff: MarkdownNodeDiffResult[]): Promise<any[]>;
