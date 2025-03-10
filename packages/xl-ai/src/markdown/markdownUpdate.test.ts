import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vitest";
import { markdownUpdateToBlockUpdate } from "./markdownUpdate.js";

describe("markdownUpdateToBlockUpdate", () => {
  it("change text", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "hello",
        },
      ],
    });

    const block = editor.document[0];
    const update = await markdownUpdateToBlockUpdate(
      editor,
      block,
      await editor.blocksToMarkdownLossy([block]),
      "hello world"
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

    const block = editor.document[0];
    const update = await markdownUpdateToBlockUpdate(
      editor,
      block,
      await editor.blocksToMarkdownLossy([block]),
      "# hello"
    );
    expect(update).toMatchSnapshot();
  });

  it("change unchecked to checked", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "checkListItem",
          props: { checked: false },
          content: "hello",
        },
      ],
    });

    const block = editor.document[0];
    const update = await markdownUpdateToBlockUpdate(
      editor,
      block,
      await editor.blocksToMarkdownLossy([block]),
      "- [x] hello"
    );
    expect(update).toMatchSnapshot();
  });

  it("no change", async () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: "hello",
          props: {
            textAlignment: "right",
          },
        },
      ],
    });

    const block = editor.document[0];
    const update = await markdownUpdateToBlockUpdate(
      editor,
      block,
      await editor.blocksToMarkdownLossy([block]),
      "hello"
    );
    expect(update).toMatchSnapshot();
  });
});
