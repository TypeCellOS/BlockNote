import { Block, BlockNoteEditor } from "@blocknote/core";
import { diff as jsonDiff } from "json-diff";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { describe, it } from "vitest";
import { markdownOperationDiff } from "./markdownDiff.js";

function markdownNodeToString(node: any) {
  const md = unified().use(remarkStringify).stringify(node);
  return md;
}

async function getUpdateForMarkdownChange(
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

  let props: Record<string, any> | undefined;

  if (Array.isArray(diff) || typeof diff !== "object") {
    throw new Error("json diff is not a single change");
  }

  if (diff.props) {
    props = {};
    for (const key in diff.props) {
      if (key.endsWith("__added")) {
        debugger;
        props[key.replace("__added", "")] = diff.props[key];
      } else if (key.endsWith("__deleted")) {
        debugger;
        props[key.replace("__deleted", "")] = undefined;
      } else {
        debugger;
        props[key] = diff.props[key];
      }
    }
  }

  let content: any | undefined;
  if (diff.content) {
    // Note: we overwrite the entire content with the new content. This means we'll currently lose inline styles / content not supported by markdown
    content = newMarkdownAsBlock.content;
  }

  let type: string | undefined;
  if (diff.type) {
    type = newMarkdownAsBlock.type;
  }

  const ret = {
    type,
    props,
    content,
  };
  return ret;
}

async function getOperationsToTargetMarkdown(
  editor: BlockNoteEditor<any, any, any>,
  blocks: Block<any, any, any>[],
  targetMarkdown: string
) {
  const operations: any[] = [];
  const oldMarkdown = await editor.blocksToMarkdownLossy(blocks);
  const markdownDiff = await markdownOperationDiff(oldMarkdown, targetMarkdown);

  if (
    markdownDiff.filter((diff) => diff.type !== "add").length !== blocks.length
  ) {
    throw new Error(
      "Number of nodes in markdown diff does not match number of blocks"
    );
  }

  let lastBlockId: string | undefined;
  let currentBlockIndex = 0;

  for (const diff of markdownDiff) {
    if (diff.type === "add") {
      const block = await editor.tryParseMarkdownToBlocks(
        markdownNodeToString(diff.newBlock)
      );

      if (
        operations.length > 0 &&
        operations[operations.length - 1].type === "add"
      ) {
        operations[operations.length - 1].blocks.push(block);
      } else {
        const positionInfo =
          currentBlockIndex < blocks.length
            ? {
                position: "before",
                referenceId: blocks[currentBlockIndex].id,
              }
            : {
                position: "after",
                referenceId: lastBlockId,
              };

        operations.push({
          type: "add",
          ...positionInfo,
          blocks: [block],
        });
      }
    } else if (diff.type === "remove") {
      operations.push({
        type: "delete",
        id: blocks[currentBlockIndex].id,
      });
      currentBlockIndex++;
    } else if (diff.type === "unchanged") {
      lastBlockId = blocks[currentBlockIndex].id;
      currentBlockIndex++;
    } else if (diff.type === "changed") {
      lastBlockId = blocks[currentBlockIndex].id;

      const update = await getUpdateForMarkdownChange(
        editor,
        blocks[currentBlockIndex],
        oldMarkdown,
        markdownNodeToString(diff.newBlock)
      );
      operations.push({
        type: "update",
        id: blocks[currentBlockIndex].id,
        block: update,
      });
      currentBlockIndex++;
    }
  }
  return operations;
}

describe("markdown update util", () => {
  it("add word at end of sentence", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "hello",
        },
      ],
    });

    const update = await getOperationsToTargetMarkdown(
      editor,
      editor.document,
      "hello world"
    );
  });

  it.only("change type", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "hello",
        },
      ],
    });

    const update = await getOperationsToTargetMarkdown(
      editor,
      editor.document,
      "# hello"
    );
  });
});

// investigate streaming
// inline content etc
// add tests for nesting
// add tests for lists
// add tests for tables
