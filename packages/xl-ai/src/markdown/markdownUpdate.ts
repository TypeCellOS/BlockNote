import { Block, BlockNoteEditor } from "@blocknote/core";
import { diff as jsonDiff } from "json-diff";

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
export async function markdownUpdateToBlockUpdate(
  editor: BlockNoteEditor<any, any, any>,
  oldBlock: Block<any, any, any>,
  oldMarkdown: string,
  newMarkdown: string
) {
  if (oldMarkdown === newMarkdown) {
    throw new Error("Markdown is unchanged");
  }
  const oldMarkdownAsBlocks = await editor.tryParseMarkdownToBlocks(
    oldMarkdown
  );
  if (oldMarkdownAsBlocks.length !== 1) {
    throw new Error("Old markdown is not a single block");
  }
  const oldMarkdownAsBlock = oldMarkdownAsBlocks[0];

  const newMarkdownAsBlocks = await editor.tryParseMarkdownToBlocks(
    newMarkdown
  );
  if (newMarkdownAsBlocks.length !== 1) {
    throw new Error("New markdown is not a single block");
  }
  const newMarkdownAsBlock = newMarkdownAsBlocks[0];

  const diff = jsonDiff(oldMarkdownAsBlock, newMarkdownAsBlock);

  if (Array.isArray(diff) || typeof diff !== "object") {
    throw new Error("json diff is not a single change");
  }

  const ret: Record<string, any> = {};

  if (diff.props) {
    ret.props = {};
    for (const key in diff.props) {
      if (key.endsWith("__added")) {
        ret.props[key.replace("__added", "")] = diff.props[key];
      } else if (key.endsWith("__deleted")) {
        ret.props[key.replace("__deleted", "")] = undefined;
      } else {
        ret.props[key] = diff.props[key].__new;
      }
    }
  }

  if (diff.content) {
    // Note: we overwrite the entire content with the new content.
    // This means we'll currently lose inline styles / content not supported by markdown
    ret.content = newMarkdownAsBlock.content;
  }

  if (diff.type) {
    ret.type = newMarkdownAsBlock.type;
  }

  return ret;
}
