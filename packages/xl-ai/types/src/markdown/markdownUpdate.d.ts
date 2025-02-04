import { Block, BlockNoteEditor } from "@blocknote/core";
/**
 * Calculate an update operation to an existing block to apply the changes
 * from `oldMarkdown` to `newMarkdown`. Because Markdown is a lossy format,
 * we don't want to blindly replace the entire block. This would lose information like
 * text alignment, block colors, etc.
 *
 * Instead, we detect the changes from oldMarkdown to newMarkdown and apply these to the
 * existing block.
 *
 * Method used (pseudocode):
 * - blockChanges = jsondiff(asBlock(oldMarkdown), asBlock(newMarkdown))
 * - return this information as an update operation
 */
export declare function markdownUpdateToBlockUpdate(editor: BlockNoteEditor<any, any, any>, _oldBlock: Block<any, any, any>, oldMarkdown: string, newMarkdown: string): Promise<Record<string, any>>;
