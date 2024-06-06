import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Block,
  defaultBlockSpecs,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  PartialBlock,
} from "../../blocks/defaultBlocks";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { createBlockSpec } from "../../schema";
import { BlockNoteSchema } from "../../editor/BlockNoteSchema";

const CustomBlock = createBlockSpec(
  {
    type: "customBlock",
    propSchema: {},
    content: "inline",
  } as const,
  {
    render: () => {
      const dom = document.createElement("div");
      dom.className = "custom-block";

      return {
        dom: dom,
        contentDOM: dom,
      };
    },
  }
);

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    customBlock: CustomBlock,
  },
});

let editor: BlockNoteEditor<typeof schema.blockSchema>;
const div = document.createElement("div");

function waitForEditor() {
  // wait for create event on editor,
  // this is necessary because otherwise UniqueId.create hasn't been called yet, and
  // blocks would have "null" as their id
  return new Promise<void>((resolve) => {
    editor._tiptapEditor.on("create", () => {
      resolve();
    });
  });
}

let singleBlock: PartialBlock<
  typeof schema.blockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema
>;

let multipleBlocks: PartialBlock<
  typeof schema.blockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema
>[];

let blocksWithLineBreaks: PartialBlock<
  typeof schema.blockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema
>[];

let insert: (
  placement: "before" | "nested" | "after"
) => Block<
  typeof schema.blockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema
>[];

beforeEach(() => {
  editor = BlockNoteEditor.create<typeof schema.blockSchema>({
    schema: schema,
  });

  editor.mount(div);

  singleBlock = {
    type: "paragraph",
    content: "Paragraph",
  };

  multipleBlocks = [
    {
      type: "heading",
      props: {
        level: 1,
      },
      content: "Heading 1",
      children: [
        {
          type: "heading",
          props: {
            level: 1,
          },
          content: "Nested Heading 1",
        },
      ],
    },
    {
      type: "heading",
      props: {
        level: 2,
      },
      content: "Heading 2",
      children: [
        {
          type: "heading",
          props: {
            level: 2,
          },
          content: "Nested Heading 2",
        },
      ],
    },
  ];

  blocksWithLineBreaks = [
    {
      type: "paragraph",
      content: "Line1\nLine2",
    },
    {
      type: "customBlock",
      content: "Line1\nLine2",
    },
  ];

  insert = (placement) => {
    const existingBlock = editor.document[0];
    editor.insertBlocks(multipleBlocks, existingBlock, placement);

    return editor.document;
  };
});

afterEach(() => {
  editor.mount(undefined);
  editor._tiptapEditor.destroy();
  editor = undefined as any;
});

describe("Test strong typing", () => {
  it("checks that block types are inferred correctly", () => {
    try {
      editor.updateBlock(
        { id: "sdf" },
        {
          // @ts-expect-error invalid type
          type: "non-existing",
        }
      );
    } catch (e) {
      // id doesn't exists, which is fine, this is a compile-time check
    }
  });

  it("checks that block props are inferred correctly", () => {
    try {
      editor.updateBlock(
        { id: "sdf" },
        {
          type: "paragraph",
          props: {
            // @ts-expect-error invalid type
            level: 1,
          },
        }
      );
    } catch (e) {
      // id doesn't exists, which is fine, this is a compile-time check
    }
    try {
      editor.updateBlock(
        { id: "sdf" },
        {
          type: "heading",
          props: {
            level: 1,
          },
        }
      );
    } catch (e) {
      // id doesn't exists, which is fine, this is a compile-time check
    }
  });
});

describe("Inserting Blocks with Different Placements", () => {
  it("Insert before existing block", async () => {
    await waitForEditor();

    const output = insert("before");

    expect(output).toMatchSnapshot();
  });

  it("Insert nested inside existing block", async () => {
    await waitForEditor();

    const output = insert("nested");

    expect(output).toMatchSnapshot();
  });

  it("Insert after existing block", async () => {
    await waitForEditor();

    const output = insert("after");

    expect(output).toMatchSnapshot();
  });
});

describe("Insert, Update, & Delete Blocks", () => {
  it("Insert, update, & delete single block", async () => {
    await waitForEditor();

    const existingBlock = editor.document[0];
    editor.insertBlocks([singleBlock], existingBlock);

    expect(editor.document).toMatchSnapshot();

    const newBlock = editor.document[0];
    editor.updateBlock(newBlock, {
      type: "heading",
      props: {
        textAlignment: "right",
        level: 3,
      },
      content: [
        {
          type: "text",
          text: "Heading ",
          styles: {
            textColor: "red",
          },
        },
        {
          type: "text",
          text: "3",
          styles: {
            backgroundColor: "red",
          },
        },
      ],
      children: [singleBlock],
    });

    expect(editor.document).toMatchSnapshot();

    const updatedBlock = editor.document[0];
    editor.removeBlocks([updatedBlock]);

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert, update, & delete multiple blocks", async () => {
    await waitForEditor();

    const existingBlock = editor.document[0];
    editor.insertBlocks(multipleBlocks, existingBlock);

    expect(editor.document).toMatchSnapshot();

    const newBlock = editor.document[0];
    editor.updateBlock(newBlock, {
      type: "paragraph",
    });

    expect(editor.document).toMatchSnapshot();

    const updatedBlocks = editor.document.slice(0, 2);
    editor.removeBlocks([updatedBlocks[0].children[0], updatedBlocks[1]]);

    expect(editor.document).toMatchSnapshot();
  });
});

describe("Update Line Breaks", () => {
  it("Update paragraph with line break", async () => {
    await waitForEditor();

    const existingBlock = editor.document[0];
    editor.insertBlocks(blocksWithLineBreaks, existingBlock);

    const newBlock = editor.document[0];
    editor.updateBlock(newBlock, {
      type: "paragraph",
      content: "Updated Custom Block with \nline \nbreak",
    });

    expect(editor.document).toMatchSnapshot();
  });
  it("Update custom block with line break", async () => {
    await waitForEditor();

    const existingBlock = editor.document[0];
    editor.insertBlocks(blocksWithLineBreaks, existingBlock);

    const newBlock = editor.document[1];
    editor.updateBlock(newBlock, {
      type: "customBlock",
      content: "Updated Custom Block with \nline \nbreak",
    });

    expect(editor.document).toMatchSnapshot();
  });
});
