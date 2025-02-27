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

function recursiveRegexpReplace(
  str: string,
  pattern: RegExp,
  replacement: string
): string {
  const result = str.replace(pattern, replacement);
  if (result === str) {
    return result;
  }
  return recursiveRegexpReplace(result, pattern, replacement);
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

  // preprocess the markdown to replace multiple newlines with a single [EMPTY-LINE]
  // otherwise remarkParse will collapse multiple newlines into a single one,
  // and we lose information about empty blocks
  oldMarkdown = recursiveRegexpReplace(
    oldMarkdown,
    /\n\n\n\n/g,
    "\n\n[EMPTY-LINE]\n\n"
  );
  newMarkdown = recursiveRegexpReplace(
    newMarkdown,
    /\n\n\n\n/g,
    "\n\n[EMPTY-LINE]\n\n"
  );
  const oldAst = unified().use(remarkParse).parse(oldMarkdown);
  const newAst = unified().use(remarkParse).parse(newMarkdown);

  /*
  e.g.:
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
  e.g.:

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
  e.g.: 
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

  const diffsByBlock: Map<any, Diff.Change[]> = new Map();

  // assign all diffs to blocks, this is used later
  for (const diff of charDiffs) {
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
          diffsByBlock.set(block, [...(diffsByBlock.get(block) || []), diff]);
        } else if (block.position!.start!.offset! > endIndexOldMD) {
          // not interested in other blocks past the end of the diff
          break;
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
          diffsByBlock.set(block, [...(diffsByBlock.get(block) || []), diff]);
        } else if (block.position!.start!.offset! > endIndexNewMD) {
          // not interested in other blocks past the end of the diff
          break;
        }
      }
    }

    oldIndex = endIndexOldMD;
    newIndex = endIndexNewMD;
  }

  // now, main algorithm to process diffs
  for (const diff of charDiffs) {
    if (diff.added) {
      // if it's an add diff, check if it's an add that indicates one or more complete blocks have been added

      // we're not interested in other cases here, e.g. some text has been added to an existing block
      // this will be handled by the "keep" diff below
      const matchingNewBlocks = takeWhile(
        newBlocks,
        (block) =>
          diffsByBlock.get(block)!.some((d) => d === diff) &&
          diffsByBlock.get(block)!.length === 1 // the only diff on a block is this "add", so add the block
      );
      for (const block of matchingNewBlocks) {
        results.push({ type: "add", newBlock: block });
      }
      continue;
    }

    if (diff.removed) {
      // if it's a remove diff, check if it's a remove that indicates one or more complete blocks have been removed

      // we're not interested in other cases here, e.g. some text has been removed from an existing block
      // this will be handled by the "keep" diff below
      const matchingOldBlocks = takeWhile(
        oldBlocks,
        (block) =>
          diffsByBlock.get(block)!.some((d) => d === diff) &&
          diffsByBlock.get(block)!.length === 1 // the only diff on a block is this "remove", so remove the block
      );
      for (const block of matchingOldBlocks) {
        results.push({ type: "remove", oldBlock: block });
      }
      continue;
    }

    // it's a "keep" diff (no add / remove)
    // let's process all old / new blocks that have this diff
    const matchingNewBlocks = takeWhile(newBlocks, (block) =>
      diffsByBlock.get(block)!.some((d) => d === diff)
    );

    const matchingOldBlocks = takeWhile(oldBlocks, (block) =>
      diffsByBlock.get(block)!.some((d) => diff === d)
    );

    while (matchingNewBlocks.length || matchingOldBlocks.length) {
      const newBlock = matchingNewBlocks.shift();
      const oldBlock = matchingOldBlocks.shift();

      if (!newBlock && !oldBlock) {
        throw new Error("No matching blocks found");
      }

      if (!newBlock) {
        /*
        this can happen in the case we change 3 blocks into 1 block, e.g.:

        old:
        # title
        hello
        world

        new:
        # titleworld

        for the first iteration we'll dispatch a "changed" operation,
        but then in the next iterations there will be old blocks (2) left
        these are processed and removed here
        */
        results.push({ type: "remove", oldBlock: oldBlock! });
      } else if (!oldBlock) {
        /**
        this can happen in the case we change 1 block into 3 blocks, e.g.:

        old:
        hello

        new:
        he
        l
        lo
         */
        results.push({ type: "add", newBlock });
      } else {
        if (
          diffsByBlock.get(oldBlock)!.every((d) => !d.added && !d.removed) &&
          diffsByBlock.get(newBlock)!.every((d) => !d.added && !d.removed)
        ) {
          results.push({ type: "unchanged", newBlock, oldBlock });
        } else {
          results.push({ type: "changed", newBlock, oldBlock });
        }
      }
    }
  }

  // remove [EMPTY-LINE] hacks we added at beginning of function
  function removeFakeEmptyLines(node: any) {
    if (
      node.oldBlock?.type === "paragraph" &&
      node.oldBlock.children.length === 1 &&
      node.oldBlock.children[0].type === "text" &&
      node.oldBlock.children[0].value === "[EMPTY-LINE]"
    ) {
      node.oldBlock.children[0].value = "";
    }
    if (
      node.newBlock?.type === "paragraph" &&
      node.newBlock.children.length === 1 &&
      node.newBlock.children[0].type === "text" &&
      node.newBlock.children[0].value === "[EMPTY-LINE]"
    ) {
      node.newBlock.children[0].value = "";
    }
    return node;
  }

  for (const result of results) {
    removeFakeEmptyLines(result);
  }
  return results;
}
