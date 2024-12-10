import * as Diff from "diff";
import remarkParse from "remark-parse";
import { unified } from "unified";

export type DiffResult =
  | {
      type: "changed" | "unchanged";
      newBlock: any;
      oldBlock: any;
    }
  | {
      type: "add";
      newBlock: any;
    }
  | {
      type: "remove";
      oldBlock: any;
    };

export async function markdownOperationDiff(
  oldMarkdown: string,
  newMarkdown: string
): Promise<DiffResult[]> {
  const oldAst = unified().use(remarkParse).parse(oldMarkdown);
  const newAst = unified().use(remarkParse).parse(newMarkdown);

  const charDiffs = Diff.diffChars(oldMarkdown, newMarkdown);

  const results: DiffResult[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  const oldBlocks = [...oldAst.children];
  const newBlocks = [...newAst.children];
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
          newBlockChanged = true;
          results.push({
            type: "changed",
            newBlock: block,
            oldBlock: oldBlocks[0],
          });
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
          oldBlockChanged = true;
          results.push({
            type: "changed",
            newBlock: newBlocks[0],
            oldBlock: block,
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
