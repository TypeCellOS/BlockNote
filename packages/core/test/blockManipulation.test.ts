import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Block, BlockNoteEditor, PartialBlock } from "../src";

const singleBlock: PartialBlock = {
  type: "paragraph",
  content: "Paragraph",
};

const multipleBlocks: PartialBlock[] = [
  {
    type: "heading",
    props: {
      level: "1",
    },
    content: "Heading 1",
    children: [
      {
        type: "heading",
        props: {
          level: "1",
        },
        content: "Nested Heading 1",
      },
    ],
  },
  {
    type: "heading",
    props: {
      level: "2",
    },
    content: "Heading 2",
    children: [
      {
        type: "heading",
        props: {
          level: "2",
        },
        content: "Nested Heading 2",
      },
    ],
  },
];

beforeEach(() => {
  (window as Window & { __TEST_OPTIONS?: {} }).__TEST_OPTIONS = {};
});

afterEach(() => {
  delete (window as Window & { __TEST_OPTIONS?: {} }).__TEST_OPTIONS;
});

describe("Inserting Blocks with Different Placements", () => {
  function insert(placement: "before" | "nested" | "after"): Block[] {
    const editor = new BlockNoteEditor();
    (window as Window & { __TEST_OPTIONS?: {} }).__TEST_OPTIONS =
      (window as Window & { __TEST_OPTIONS?: {} }).__TEST_OPTIONS || {};

    const existingBlock = editor.allBlocks[0];

    editor.insertBlocks(multipleBlocks, existingBlock, placement);

    return editor.allBlocks;
  }

  it("Insert before existing block", async () => {
    const output = insert("before");

    expect(output).toMatchSnapshot();
  });

  it("Insert nested inside existing block", async () => {
    const output = insert("nested");

    expect(output).toMatchSnapshot();
  });

  it("Insert after existing block", async () => {
    const output = insert("after");

    expect(output).toMatchSnapshot();
  });
});

describe("Insert, Update, & Delete Blocks", () => {
  it("Insert, update, & delete single block", async () => {
    const editor = new BlockNoteEditor();

    const existingBlock = editor.allBlocks[0];

    editor.insertBlocks([singleBlock], existingBlock);

    expect(editor.allBlocks).toMatchSnapshot();

    const newBlock = editor.allBlocks[0];

    editor.updateBlock(newBlock, {
      type: "heading",
      props: {
        textAlignment: "right",
        level: "3",
      },
      content: [
        {
          text: "Heading ",
          styles: [
            {
              type: "textColor",
              props: {
                color: "red",
              },
            },
          ],
        },
        {
          text: "3",
          styles: [
            {
              type: "backgroundColor",
              props: {
                color: "red",
              },
            },
          ],
        },
      ],
      children: [singleBlock],
    });

    expect(editor.allBlocks).toMatchSnapshot();

    const updatedBlock = editor.allBlocks[0];

    editor.removeBlocks([updatedBlock]);

    expect(editor.allBlocks).toMatchSnapshot();
  });

  it("Insert, update, & delete multiple blocks", async () => {
    const editor = new BlockNoteEditor();

    const existingBlock = editor.allBlocks[0];

    editor.insertBlocks(multipleBlocks, existingBlock);

    expect(editor.allBlocks).toMatchSnapshot();

    const newBlock = editor.allBlocks[0];

    editor.updateBlock(newBlock, {
      type: "paragraph",
    });

    expect(editor.allBlocks).toMatchSnapshot();

    const updatedBlocks = editor.allBlocks.slice(0, 2);

    editor.removeBlocks([updatedBlocks[0].children[0], updatedBlocks[1]]);

    expect(editor.allBlocks).toMatchSnapshot();
  });
});
