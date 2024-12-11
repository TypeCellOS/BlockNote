import * as Diff from "diff";
import type { Content } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";

export type MarkdownNodeDiffResult =
  | {
      type: "changed" | "unchanged";
      newBlock: Content;
      oldBlock: Content;
    }
  | {
      type: "add";
      newBlock: Content;
    }
  | {
      type: "remove";
      oldBlock: Content;
    };

/**
 * Flatten lists
 *
 * TODO: add support for nested lists
 */
export function flattenAst(ast: Content[]): Content[] {
  const result: Content[] = [];
  for (const node of ast) {
    if (node.type === "list") {
      result.push(...node.children);
    } else {
      result.push(node);
    }
  }
  return result;
}

/**
 * Takes two versions of a markdown document, and
 * returns a list of `DiffResult` objects indicating
 * whether a markdown node has been added, removed, changed, or unchanged
 */
export async function markdownNodeDiff(
  oldMarkdown: string,
  newMarkdown: string
): Promise<MarkdownNodeDiffResult[]> {
  const oldAst = unified().use(remarkParse).parse(oldMarkdown);
  const newAst = unified().use(remarkParse).parse(newMarkdown);

  const charDiffs = Diff.diffChars(oldMarkdown, newMarkdown);

  const results: MarkdownNodeDiffResult[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  const oldBlocks = [...flattenAst(oldAst.children)];
  const newBlocks = [...flattenAst(newAst.children)];
  let oldBlockChanged = false;
  let newBlockChanged = false;
  for (const diff of charDiffs) {
    if (diff.added) {
      const endPos = newIndex + diff.value.length;

      while (newBlocks.length > 0) {
        const block = newBlocks[0];
        const blockEnd = block.position!.end!.offset!;

        if (blockEnd <= endPos) {
          if (!newBlockChanged) {
            results.push({ type: "add", newBlock: block });
          }
          newBlocks.shift();
          newBlockChanged = false;
        } else if (block.position!.start!.offset! < endPos) {
          const oldBlock = oldBlocks.shift()!;
          const newBlock = newBlocks.shift()!;
          results.push({
            type: "changed",
            newBlock,
            oldBlock,
          });
          // newBlockChanged = true;
          break;
        } else {
          break;
        }
      }

      newIndex = endPos;
    } else if (diff.removed) {
      const endPos = oldIndex + diff.value.length;

      while (oldBlocks.length > 0) {
        const block = oldBlocks[0];
        const blockEnd = block.position!.end!.offset!;

        if (blockEnd <= endPos) {
          if (!oldBlockChanged) {
            results.push({ type: "remove", oldBlock: block });
          }
          oldBlocks.shift();
          oldBlockChanged = false;
        } else if (block.position!.start!.offset! < endPos) {
          // oldBlockChanged = true;
          const oldBlock = oldBlocks.shift()!;
          const newBlock = newBlocks.shift()!;
          results.push({
            type: "changed",
            newBlock,
            oldBlock,
          });
          break;
        } else {
          break;
        }
      }

      oldIndex = endPos;
    } else {
      const endPosOld = oldIndex + diff.value.length;
      const endPosNew = newIndex + diff.value.length;
      while (oldBlocks.length > 0 && newBlocks.length > 0) {
        const oldBlock = oldBlocks[0];
        const newBlock = newBlocks[0];
        const oldBlockEnd = oldBlock.position!.end!.offset!;
        const newBlockEnd = newBlock.position!.end!.offset!;

        // Only consider blocks unchanged if both blocks end within this unchanged section
        // and we haven't seen any changes to these blocks yet
        if (oldBlockEnd <= endPosOld && newBlockEnd <= endPosNew) {
          if (!oldBlockChanged && !newBlockChanged) {
            results.push({
              type: "unchanged",
              oldBlock: oldBlock,
              newBlock: newBlock,
            });
          }
          oldBlocks.shift();
          newBlocks.shift();
          oldBlockChanged = false;
          newBlockChanged = false;
        } else if (
          oldBlock.position!.start!.offset! < endPosOld ||
          newBlock.position!.start!.offset! < endPosNew
        ) {
          // If either block overlaps with this section but doesn't end within it,
          // mark it as changed
          results.push({
            type: "changed",
            oldBlock: oldBlock,
            newBlock: newBlock,
          });
          if (oldBlock.position!.start!.offset! < endPosOld) {
            oldBlocks.shift();
            oldBlockChanged = false;
          }
          if (newBlock.position!.start!.offset! < endPosNew) {
            newBlocks.shift();
            newBlockChanged = false;
          }
          break;
        } else {
          break;
        }
      }

      oldIndex = endPosOld;
      newIndex = endPosNew;
    }
  }

  return results;
}
