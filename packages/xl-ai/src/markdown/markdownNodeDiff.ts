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

  // const mapping: [number, number][] = [];
  // let pos = 0;
  // for (const diff of charDiffs) {
  //   if (diff.added) {
  //     mapping.push([pos, -diff.count!]);
  //     pos += diff.count!;
  //   } else if (diff.removed) {
  //     mapping.push([pos, diff.count!]);
  //   } else {
  //     pos += diff.count!;
  //   }
  // }

  // function altMap(newPos: number) {
  //   let oldPos = newPos;
  //   for (const [start, val] of mapping) {
  //     if (newPos > start) {
  //       oldPos += val;
  //     }
  //   }
  //   return oldPos;
  // }

  // function map(newPos: number) {
  //   let oldPos = 0;
  //   let currentPos = 0;

  //   for (const diff of charDiffs) {
  //     if (currentPos + diff.count! <= newPos) {
  //       // For positions before our target:
  //       // - Added text in new version means we need to subtract from old position
  //       // - Removed text in old version means we need to add to old position
  //       if (diff.added) {
  //         oldPos -= diff.count!;
  //       } else if (diff.removed) {
  //         oldPos += diff.count!;
  //       }
  //       currentPos += diff.count!;
  //     } else {
  //       break;
  //     }
  //   }

  //   return oldPos;
  // }

  // function map(newPos: number) {
  //   let oldPos = newPos;
  //   let currentPos = 0;

  //   for (const diff of charDiffs) {
  //     if (currentPos + diff.count! <= newPos) {
  //       // For positions before our target:
  //       // - Added text in new version means we need to subtract from old position
  //       // - Removed text in old version means we need to add to old position
  //       if (diff.added) {
  //         oldPos -= diff.count!;
  //       } else if (diff.removed) {
  //         oldPos += diff.count!;
  //       }
  //       currentPos += diff.count!;
  //     } else {
  //       break;
  //     }
  //   }

  //   return oldPos;
  // }
  /*
  for (const block of newBlocks) {
    const startPos = block.position!.start!.offset!;
    const endPos = block.position!.end!.offset!;

    const startPosMapped = map(startPos);
    const endPosMapped = map(endPos);
    const altStartPosMapped = altMap(startPos);
    const altEndPosMapped = altMap(endPos);

    const blocks = takeWhile(oldBlocks, (block) => {
      const blockStartPos = block.position!.start!.offset!;
      const blockEndPos = block.position!.end!.offset!;
      return blockStartPos < endPosMapped && blockEndPos > startPosMapped;
    });

    block.oldBlocks = blocks;
  }

  for (const block of newBlocks) {
    if (block.oldBlocks.length) {
      const oldBlock = block.oldBlocks.shift();
      if (block.oldBlocks.length === 0) {
        // exactly 1 block overlaps, maybe it's the same (unchanged)
        const oldMd = oldMarkdown.substring(
          oldBlock.position!.start!.offset!,
          oldBlock.position!.end!.offset!
        );
        const newMd = newMarkdown.substring(
          block.position!.start!.offset!,
          block.position!.end!.offset!
        );

        if (oldMd === newMd) {
          results.push({
            type: "unchanged",
            newBlock: block,
            oldBlock,
          });
          continue;
        }
      }

      results.push({
        type: "changed",
        newBlock: block,
        oldBlock: oldBlock,
      });

      for (const oldBlock of block.oldBlocks) {
        results.push({
          type: "remove",
          oldBlock,
        });
      }
    } else {
      results.push({
        type: "add",
        newBlock: block,
      });
    }
  }*/

  // return results;
  // debugger;

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
    if (diff.added) {
      const matchingNewBlocks = takeWhile(
        newBlocks,
        (block) =>
          block.diffs?.some((d) => d === diff) && block.diffs?.length === 1
      );
      for (const block of matchingNewBlocks) {
        results.push({ type: "add", newBlock: block });
      }
      continue;
    }

    if (diff.removed) {
      const matchingOldBlocks = takeWhile(
        oldBlocks,
        (block) =>
          block.diffs?.some((d) => d === diff) && block.diffs?.length === 1
      );
      for (const block of matchingOldBlocks) {
        results.push({ type: "remove", oldBlock: block });
      }
      continue;
    }

    const matchingNewBlocks = takeWhile(newBlocks, (block) =>
      block.diffs?.some((d) => d === diff)
    );

    const matchingOldBlocks = takeWhile(oldBlocks, (block) =>
      block.diffs?.some((d) => diff === d)
    );

    while (matchingNewBlocks.length || matchingOldBlocks.length) {
      const newBlock = matchingNewBlocks.shift();
      const oldBlock = matchingOldBlocks.shift();

      if (!newBlock && !oldBlock) {
        throw new Error("No matching blocks found");
      }

      if (!newBlock) {
        results.push({ type: "remove", oldBlock });
      } else if (!oldBlock) {
        // results.push({ type: "add", newBlock });
      } else {
        if (
          oldBlock.diffs?.every((d) => !d.added && !d.removed) &&
          newBlock.diffs?.every((d) => !d.added && !d.removed)
        ) {
          results.push({ type: "unchanged", newBlock, oldBlock });
        } else {
          results.push({ type: "changed", newBlock, oldBlock });
        }
      }
    }
  }
  /*
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
    //   block.diffs?.some((d) => diff === d)
    // );

    let matchingOldBlocks = takeWhile(oldBlocks, (block) =>
      block.diffs?.some((d) => diff === d)
    );

    // loop the "new blocks" that are affected by this diff
    for (const newBlock of matchingNewBlocks) {
      matchingOldBlocks = [
        ...matchingOldBlocks,
        ...takeWhile(oldBlocks, (block) =>
          block.diffs?.some((d) => newBlock.diffs?.includes(d))
        ),
      ];

      if (newBlock.diffs?.every((d) => d.added)) {
        // this block is completely added
        if (newBlock.diffs.length !== 1) {
          throw new Error("expected only one add diff if all diffs are adds");
        }
        results.push({ type: "add", newBlock });
      } else if (newBlock.diffs?.every((d) => !d.added && !d.removed)) {
        // this block might be unchanged; check if we can find a matching old block that's also completely unchanged
        const oldBlock = matchingOldBlocks.shift();
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
        const oldBlock = matchingOldBlocks.shift();
        // TODO: comment / reason
        if (!oldBlock) {
          results.push({ type: "add", newBlock });
        } else {
          results.push({ type: "changed", newBlock, oldBlock });
        }
      }
    }

    for (const oldBlock of matchingOldBlocks) {
      // delete remaining old blocks that also match the new block.
      // in this case multiple old blocks have been changed to the new block, but
      // we only want to use the first one in a "changed" operation
      results.push({ type: "remove", oldBlock });
    }
  }

  if (oldBlocks.length > 0) {
    // throw new Error("Old blocks left over");
  }

  if (newBlocks.length > 0) {
    // throw new Error("New blocks left over");
  }*/

  return results;
}
