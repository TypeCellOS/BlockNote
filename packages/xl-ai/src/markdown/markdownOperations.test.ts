import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vitest";
import { markdownNodeDiff } from "./markdownNodeDiff.js";
import { markdownNodeDiffToBlockOperations } from "./markdownOperations.js";

describe("markdownNodeDiffToBlockOperations", () => {
  it("add word at end of sentence", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "hello",
        },
      ],
    });

    const diff = await markdownNodeDiff(
      await editor.blocksToMarkdownLossy(),
      "hello world"
    );
    const update = await markdownNodeDiffToBlockOperations(
      editor,
      editor.document,
      diff
    );

    expect(update).toMatchSnapshot();
  });

  it("change type", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "hello",
        },
      ],
    });

    const diff = await markdownNodeDiff(
      await editor.blocksToMarkdownLossy(),
      "# hello"
    );
    const update = await markdownNodeDiffToBlockOperations(
      editor,
      editor.document,
      diff
    );

    expect(update).toMatchSnapshot();
  });

  it("complex change 1", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "heading",
          content: "hello there",
        },
        {
          type: "paragraph",
          content: "beautiful",
        },
        {
          type: "paragraph",
          content: "world",
        },
      ],
    });

    const diff = await markdownNodeDiff(
      await editor.blocksToMarkdownLossy(),
      `prefix

## hello

world`
    );
    const update = await markdownNodeDiffToBlockOperations(
      editor,
      editor.document,
      diff
    );

    expect(update).toMatchSnapshot();
  });

  it("complex change 2", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "heading",
          content: "hello there",
        },
        {
          type: "paragraph",
          content: "beautiful",
        },
        {
          type: "paragraph",
          content: "world",
        },
      ],
    });

    const diff = await markdownNodeDiff(
      // note that the indentation will actually create a code block from the last two paragraphs
      await editor.blocksToMarkdownLossy(),
      `prefix

    ## hello

    world`
    );
    const update = await markdownNodeDiffToBlockOperations(
      editor,
      editor.document,
      diff
    );

    expect(update).toMatchSnapshot();
  });
});

// investigate streaming
// inline content etc
// add tests for nesting
// add tests for lists
// add tests for tables
