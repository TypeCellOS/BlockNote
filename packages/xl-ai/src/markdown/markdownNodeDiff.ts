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

function takeWhile<T>(array: T[], predicate: (item: T) => boolean): T[] {
  const index = array.findIndex((item) => !predicate(item));
  if (index === -1) {
    return array.splice(0, array.length);
  }
  return array.splice(0, index);
}

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

// a
// b

// adb

/**
 * Takes two versions of a markdown document, and
 * returns a list of `DiffResult` objects indicating
 * whether a markdown node has been added, removed, changed, or unchanged
 */
export async function markdownNodeDiff(
  oldMarkdown: string,
  newMarkdown: string
): Promise<MarkdownNodeDiffResult[]> {
  // The asts will hold character positions in the original markdown
  const oldAst = unified().use(remarkParse).parse(oldMarkdown);
  const newAst = unified().use(remarkParse).parse(newMarkdown);

  /*
  [
  {
    count: 7,
    added: false,
    removed: false,
    value: "# title",
  },
  {
    count: 2,
    added: false,
    removed: true,
    value: "\n\n",
  },
  {
    count: 5,
    added: true,
    removed: false,
    value: "world",
  },
  {
    count: 5,
    added: false,
    removed: false,
    value: "hello",
  },
]
  */
  const charDiffs = Diff.diffChars(oldMarkdown, newMarkdown);

  const results: MarkdownNodeDiffResult[] = [];

  // Track current position in each version (old and new markdown)
  let oldIndex = 0;
  let newIndex = 0;
  /*
  [
  {
    type: "heading",
    depth: 1,
    children: [
      {
        type: "text",
        value: "title",
        position: {
          start: {
            line: 1,
            column: 3,
            offset: 2,
          },
          end: {
            line: 1,
            column: 8,
            offset: 7,
          },
        },
      },
    ],
    position: {
      start: {
        line: 1,
        column: 1,
        offset: 0,
      },
      end: {
        line: 1,
        column: 8,
        offset: 7,
      },
    },
  },
  {
    type: "paragraph",
    children: [
      {
        type: "text",
        value: "hello",
        position: {
          start: {
            line: 3,
            column: 1,
            offset: 9,
          },
          end: {
            line: 3,
            column: 6,
            offset: 14,
          },
        },
      },
    ],
    position: {
      start: {
        line: 3,
        column: 1,
        offset: 9,
      },
      end: {
        line: 3,
        column: 6,
        offset: 14,
      },
    },
  },
]
  */
  const oldBlocks = [...flattenAst(oldAst.children)];

  /*
[
  {
    type: "heading",
    depth: 1,
    children: [
      {
        type: "text",
        value: "titleworldhello",
        position: {
          start: {
            line: 1,
            column: 3,
            offset: 2,
          },
          end: {
            line: 1,
            column: 18,
            offset: 17,
          },
        },
      },
    ],
    position: {
      start: {
        line: 1,
        column: 1,
        offset: 0,
      },
      end: {
        line: 1,
        column: 18,
        offset: 17,
      },
    },
  },
]
  */
  const newBlocks = [...flattenAst(newAst.children)];

  let oldBlockChanged = false;
  let newBlockChanged = false;

  // let diffsByOldBlocks = new Map<any, any>();

  // let oldIndex = 0;
  // let newIndex = 0;
  for (let diff of charDiffs) {
    let endIndexOldMD = oldIndex;
    let endIndexNewMD = newIndex;
    if (diff.added) {
      endIndexNewMD = newIndex + diff.value.length;
    } else if (diff.removed) {
      endIndexOldMD = oldIndex + diff.value.length;
    } else {
      endIndexOldMD = oldIndex + diff.value.length;
      endIndexNewMD = newIndex + diff.value.length;
    }

    if (!diff.added) {
      for (const block of oldBlocks) {
        // check if [oldIndex, endIndexOldMD) overlaps with [block.position!.start!.offset!, block.position!.end!.offset!)
        if (
          block.position!.start!.offset! < endIndexOldMD &&
          block.position!.end!.offset! > oldIndex
        ) {
          block.diffs = [...(block.diffs || []), diff];
        } else {
          // break;
        }
      }
    }

    if (!diff.removed) {
      for (const block of newBlocks) {
        // check if [newIndex, endIndexNewMD) overlaps with [block.position!.start!.offset!, block.position!.end!.offset!)
        if (
          block.position!.start!.offset! < endIndexNewMD &&
          block.position!.end!.offset! > newIndex
        ) {
          block.diffs = [...(block.diffs || []), diff];
        } else {
          // break;
        }
      }
    }

    oldIndex = endIndexOldMD;
    newIndex = endIndexNewMD;
  }

  for (const diff of charDiffs) {
    const matchingNewBlocks = takeWhile(newBlocks, (block) =>
      block.diffs?.some((d) => d === diff)
    );

    if (!matchingNewBlocks.length) {
      // it's a remove diff so there's no matching "new block".
      // let's see if there are old blocks that need to be completely removed
      const oldBlocksToRemove = takeWhile(
        oldBlocks,
        (block) => block.diffs?.every((d) => d === diff) // all diffs are remove diffs, so remove entire block
      );
      for (const oldBlock of oldBlocksToRemove) {
        results.push({ type: "remove", oldBlock });
      }
      continue;
    }

    // const matchingOldBlocks = takeWhile(oldBlocks, (block) =>
    //   block.diffs?.some((d) => d === diff)
    // );

    // loop the "new blocks" that are affected by this diff
    for (const newBlock of matchingNewBlocks) {
      if (newBlock.diffs?.every((d) => d.added)) {
        // this block is completely added
        if (newBlock.diffs.length !== 1) {
          throw new Error("expected only one add diff if all diffs are adds");
        }
        results.push({ type: "add", newBlock });
      } else if (newBlock.diffs?.every((d) => !d.added && !d.removed)) {
        // this block might be unchanged; check if we can find a matching old block that's also completely unchanged
        const oldBlock = oldBlocks.shift();
        if (!oldBlock) {
          throw new Error("No old block found");
        }

        if (!oldBlock.diffs?.includes(diff)) {
          throw new Error("Old block doesn't match new block");
        }

        if (oldBlock.diffs?.every((d) => !d.added && !d.removed)) {
          // nothing in the old block was changed either
          results.push({ type: "unchanged", newBlock, oldBlock });
        } else {
          // something in the old block was removed
          results.push({ type: "changed", newBlock, oldBlock });
        }
      } else {
        if (newBlock.diffs.length < 2) {
          throw new Error("expected multiple diffs to indicate a change");
        }
        const oldBlock = oldBlocks.shift();
        if (
          !oldBlock ||
          !oldBlock.diffs?.some((d) => newBlock.diffs.includes(d))
        ) {
          results.push({ type: "add", newBlock });
          if (oldBlock) {
            oldBlocks.unshift(oldBlock);
          }
        } else {
          results.push({ type: "changed", newBlock, oldBlock });
        }
      }
    }

    // if (matchingNewBlocks.length > 0) {
    //   for (const oldBlock of matchingOldBlocks) {
    //     results.push({ type: "remove", oldBlock });
    //   }
    // }
  }

  if (oldBlocks.length > 0) {
    throw new Error("Old blocks left over");
  }
  if (newBlocks.length > 0) {
    throw new Error("New blocks left over");
  }

  // while (charDiffs.length > 0) {
  //   const diff = charDiffs.shift()!;

  //   if (diff.added) {
  //     // hello WORLD
  //     // HELLO WORLD
  //     // HELLO beautiful WORLD today

  //     const updatedNewIndex = newIndex + diff.value.length;

  //     const block = newBlocks.shift();
  //     if (!block) {
  //       throw new Error("No block found");
  //     }

  //     const blockEnd = block.position!.end!.offset!;
  //     if (updatedNewIndex < blockEnd) {
  //       const oldBlock = oldBlocks.shift();
  //       if (!oldBlock) {
  //         throw new Error("No old block found");
  //       }
  //       results.push({
  //         type: "changed",
  //         newBlock: block,
  //         oldBlock,
  //       });
  //     } else {
  //       results.push({ type: "add", newBlock: block });
  //     }
  //     newIndex = updatedNewIndex;
  //   } else if (diff.removed) {
  //     const endPos = oldIndex + diff.value.length;

  //     while (oldBlocks.length > 0) {
  //       const block = oldBlocks[0];
  //       const blockEnd = block.position!.end!.offset!;

  //       if (blockEnd <= endPos) {
  //         if (!oldBlockChanged) {
  //           results.push({ type: "remove", oldBlock: block });
  //         }
  //         oldBlocks.shift();
  //         oldBlockChanged = false;
  //       } else if (block.position!.start!.offset! < endPos) {
  //         // oldBlockChanged = true;
  //         const oldBlock = oldBlocks.shift()!;
  //         const newBlock = newBlocks.shift()!;
  //         results.push({
  //           type: "changed",
  //           newBlock,
  //           oldBlock,
  //         });
  //         break;
  //       } else {
  //         break;
  //       }
  //     }

  //     oldIndex = endPos;
  //   } else {
  //     const endPosOld = oldIndex + diff.value.length;
  //     const endPosNew = newIndex + diff.value.length;
  //     while (oldBlocks.length > 0 && newBlocks.length > 0) {
  //       const oldBlock = oldBlocks[0];
  //       const newBlock = newBlocks[0];
  //       const oldBlockEnd = oldBlock.position!.end!.offset!;
  //       const newBlockEnd = newBlock.position!.end!.offset!;

  //       // Only consider blocks unchanged if both blocks end within this unchanged section
  //       // and we haven't seen any changes to these blocks yet
  //       if (oldBlockEnd <= endPosOld && newBlockEnd <= endPosNew) {
  //         if (!oldBlockChanged && !newBlockChanged) {
  //           results.push({
  //             type: "unchanged",
  //             oldBlock: oldBlock,
  //             newBlock: newBlock,
  //           });
  //         }
  //         oldBlocks.shift();
  //         newBlocks.shift();
  //         oldBlockChanged = false;
  //         newBlockChanged = false;
  //       } else if (
  //         oldBlock.position!.start!.offset! < endPosOld ||
  //         newBlock.position!.start!.offset! < endPosNew
  //       ) {
  //         // If either block overlaps with this section but doesn't end within it,
  //         // mark it as changed
  //         results.push({
  //           type: "changed",
  //           oldBlock: oldBlock,
  //           newBlock: newBlock,
  //         });
  //         if (oldBlock.position!.start!.offset! < endPosOld) {
  //           oldBlocks.shift();
  //           oldBlockChanged = false;
  //         }
  //         if (newBlock.position!.start!.offset! < endPosNew) {
  //           newBlocks.shift();
  //           newBlockChanged = false;
  //         }
  //         break;
  //       } else {
  //         break;
  //       }
  //     }

  //     oldIndex = endPosOld;
  //     newIndex = endPosNew;
  //   }
  // }

  return results;
}
