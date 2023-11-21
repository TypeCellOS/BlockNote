import { Editor } from "@tiptap/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BlockNoteEditor, BlockSchema, PartialBlock } from "../..";
import {
  defaultBlockSchema,
  defaultStyleSchema,
} from "../../extensions/Blocks/api/defaultBlocks";
import UniqueID from "../../extensions/UniqueID/UniqueID";
import { blockToNode, nodeToBlock } from "./nodeConversions";
import { partialBlockToBlockForTesting } from "./testUtil";

let editor: BlockNoteEditor;
let tt: Editor;

beforeEach(() => {
  editor = BlockNoteEditor.create();
  tt = editor._tiptapEditor;
});

afterEach(() => {
  tt.destroy();
  editor = undefined as any;
  tt = undefined as any;
});

function validateConversion(
  block: PartialBlock<any, any, any>,
  schema: BlockSchema
) {
  const node = blockToNode(block, tt.schema, defaultStyleSchema);

  expect(node).toMatchSnapshot();

  const outputBlock = nodeToBlock(node, defaultBlockSchema, defaultStyleSchema);

  const fullOriginalBlock = partialBlockToBlockForTesting(schema, block);

  expect(outputBlock).toStrictEqual(fullOriginalBlock);
}

describe("Simple ProseMirror Node Conversions", () => {
  it("Convert simple block to node", async () => {
    const block: PartialBlock<any, any, any> = {
      id: UniqueID.options.generateID(),
      type: "paragraph",
    };
    validateConversion(block, defaultBlockSchema);
  });
});

describe("Complex ProseMirror Node Conversions", () => {
  it("Convert complex block to node", async () => {
    const block: PartialBlock<any, any, any> = {
      id: UniqueID.options.generateID(),
      type: "heading",
      props: {
        backgroundColor: "blue",
        textColor: "yellow",
        textAlignment: "right",
        level: 2,
      },
      content: [
        {
          type: "text",
          text: "Heading ",
          styles: {
            bold: true,
            underline: true,
          },
        },
        {
          type: "text",
          text: "2",
          styles: {
            italic: true,
            strike: true,
          },
        },
      ],
      children: [
        {
          id: UniqueID.options.generateID(),
          type: "paragraph",
          props: {
            backgroundColor: "red",
          },
          content: "Paragraph",
          children: [],
        },
        {
          id: UniqueID.options.generateID(),
          type: "bulletListItem",
          props: {},
        },
      ],
    };
    validateConversion(block, defaultBlockSchema);
  });
});

describe("links", () => {
  it("Convert a block with link", async () => {
    const block: PartialBlock<any, any, any> = {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://www.website.com",
          content: "Website",
        },
      ],
    };
    validateConversion(block, defaultBlockSchema);
  });

  it("Convert link block with marks", async () => {
    const block: PartialBlock<any, any, any> = {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://www.website.com",
          content: [
            {
              type: "text",
              text: "Web",
              styles: {
                bold: true,
              },
            },
            {
              type: "text",
              text: "site",
              styles: {},
            },
          ],
        },
      ],
    };
    validateConversion(block, defaultBlockSchema);
  });

  it("Convert two adjacent links in a block", async () => {
    const block: PartialBlock<any, any, any> = {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://www.website.com",
          content: "Website",
        },
        {
          type: "link",
          href: "https://www.website2.com",
          content: "Website2",
        },
      ],
    };

    validateConversion(block, defaultBlockSchema);
  });
});

describe("hard breaks", () => {
  it("Convert a block with a hard break", async () => {
    const block: PartialBlock<any, any, any> = {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Text1\nText2",
          styles: {},
        },
      ],
    };
    validateConversion(block, defaultBlockSchema);
  });

  it("Convert a block with multiple hard breaks", async () => {
    const block: PartialBlock<any, any, any> = {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Text1\nText2\nText3",
          styles: {},
        },
      ],
    };
    validateConversion(block, defaultBlockSchema);
  });

  it("Convert a block with a hard break at the start", async () => {
    const block: PartialBlock<any, any, any> = {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "\nText1",
          styles: {},
        },
      ],
    };
    validateConversion(block, defaultBlockSchema);
  });

  it("Convert a block with a hard break at the end", async () => {
    const block: PartialBlock<any, any, any> = {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Text1\n",
          styles: {},
        },
      ],
    };
    validateConversion(block, defaultBlockSchema);
  });

  it("Convert a block with only a hard break", async () => {
    const block: PartialBlock<any, any, any> = {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "\n",
          styles: {},
        },
      ],
    };
    validateConversion(block, defaultBlockSchema);
  });

  it("Convert a block with a hard break and different styles", async () => {
    const block: PartialBlock<any, any, any> = {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Text1\n",
          styles: {},
        },
        {
          type: "text",
          text: "Text2",
          styles: { bold: true },
        },
      ],
    };
    validateConversion(block, defaultBlockSchema);
  });

  it("Convert a block with a hard break in a link", async () => {
    const block: PartialBlock<any, any, any> = {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://www.website.com",
          content: "Link1\nLink1",
        },
      ],
    };
    validateConversion(block, defaultBlockSchema);
  });

  it("Convert a block with a hard break between links", async () => {
    const block: PartialBlock<any, any, any> = {
      id: UniqueID.options.generateID(),
      type: "paragraph",
      content: [
        {
          type: "link",
          href: "https://www.website.com",
          content: "Link1\n",
        },
        {
          type: "link",
          href: "https://www.website2.com",
          content: "Link2",
        },
      ],
    };
    validateConversion(block, defaultBlockSchema);
  });
});
