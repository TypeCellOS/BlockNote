import { Editor } from "@tiptap/core";
import { Node } from "prosemirror-model";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BlockNoteEditor, PartialBlock } from "../..";
import UniqueID from "../../extensions/UniqueID/UniqueID";
import { blockToNode, nodeToBlock } from "./nodeConversions";
import { partialBlockToBlockForTesting } from "./testUtil";
import {
  defaultBlockSchema,
  DefaultBlockSchema,
} from "../../extensions/Blocks/api/defaultBlocks";

let editor: BlockNoteEditor;
let tt: Editor;

let simpleBlock: PartialBlock<DefaultBlockSchema>;
let simpleNode: Node;

let complexBlock: PartialBlock<DefaultBlockSchema>;
let complexNode: Node;

beforeEach(() => {
  (window as Window & { __TEST_OPTIONS?: {} }).__TEST_OPTIONS = {};

  editor = new BlockNoteEditor();
  tt = editor._tiptapEditor;

  simpleBlock = {
    type: "paragraph",
  };
  simpleNode = tt.schema.nodes["blockContainer"].create(
    { id: UniqueID.options.generateID() },
    tt.schema.nodes["paragraph"].create()
  );

  complexBlock = {
    type: "heading",
    props: {
      backgroundColor: "blue",
      textColor: "yellow",
      textAlignment: "right",
      level: "2",
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
        type: "paragraph",
        props: {
          backgroundColor: "red",
        },
        content: "Paragraph",
        children: [],
      },
      {
        type: "bulletListItem",
      },
    ],
  };
  complexNode = tt.schema.nodes["blockContainer"].create(
    {
      id: UniqueID.options.generateID(),
      backgroundColor: "blue",
      textColor: "yellow",
    },
    [
      tt.schema.nodes["heading"].create(
        { textAlignment: "right", level: "2" },
        [
          tt.schema.text("Heading ", [
            tt.schema.mark("bold"),
            tt.schema.mark("underline"),
          ]),
          tt.schema.text("2", [
            tt.schema.mark("italic"),
            tt.schema.mark("strike"),
          ]),
        ]
      ),
      tt.schema.nodes["blockGroup"].create({}, [
        tt.schema.nodes["blockContainer"].create(
          { id: UniqueID.options.generateID(), backgroundColor: "red" },
          [tt.schema.nodes["paragraph"].create({}, tt.schema.text("Paragraph"))]
        ),
        tt.schema.nodes["blockContainer"].create(
          { id: UniqueID.options.generateID() },
          [tt.schema.nodes["bulletListItem"].create()]
        ),
      ]),
    ]
  );
});

afterEach(() => {
  tt.destroy();
  editor = undefined as any;
  tt = undefined as any;

  delete (window as Window & { __TEST_OPTIONS?: {} }).__TEST_OPTIONS;
});

describe("Simple ProseMirror Node Conversions", () => {
  it("Convert simple block to node", async () => {
    const firstNodeConversion = blockToNode(simpleBlock, tt.schema);

    expect(firstNodeConversion).toMatchSnapshot();
  });

  it("Convert simple node to block", async () => {
    const firstBlockConversion = nodeToBlock<DefaultBlockSchema>(
      simpleNode,
      defaultBlockSchema
    );

    expect(firstBlockConversion).toMatchSnapshot();

    const firstNodeConversion = blockToNode(firstBlockConversion, tt.schema);

    expect(firstNodeConversion).toStrictEqual(simpleNode);
  });
});

describe("Complex ProseMirror Node Conversions", () => {
  it("Convert complex block to node", async () => {
    const firstNodeConversion = blockToNode(complexBlock, tt.schema);

    expect(firstNodeConversion).toMatchSnapshot();
  });

  it("Convert complex node to block", async () => {
    const firstBlockConversion = nodeToBlock<DefaultBlockSchema>(
      complexNode,
      defaultBlockSchema
    );

    expect(firstBlockConversion).toMatchSnapshot();

    const firstNodeConversion = blockToNode(firstBlockConversion, tt.schema);

    expect(firstNodeConversion).toStrictEqual(complexNode);
  });
});

describe("links", () => {
  it("Convert a block with link", async () => {
    const block: PartialBlock<DefaultBlockSchema> = {
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
    const node = blockToNode(block, tt.schema);
    expect(node).toMatchSnapshot();
    const outputBlock = nodeToBlock<DefaultBlockSchema>(
      node,
      defaultBlockSchema
    );

    // Temporary fix to set props to {}, because at this point
    // we don't have an easy way to access default props at runtime,
    // so partialBlockToBlockForTesting will not set them.
    (outputBlock as any).props = {};
    const fullOriginalBlock = partialBlockToBlockForTesting(block);

    expect(outputBlock).toStrictEqual(fullOriginalBlock);
  });

  it("Convert link block with marks", async () => {
    const block: PartialBlock<DefaultBlockSchema> = {
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
    const node = blockToNode(block, tt.schema);
    // expect(node).toMatchSnapshot();
    const outputBlock = nodeToBlock<DefaultBlockSchema>(
      node,
      defaultBlockSchema
    );

    // Temporary fix to set props to {}, because at this point
    // we don't have an easy way to access default props at runtime,
    // so partialBlockToBlockForTesting will not set them.
    (outputBlock as any).props = {};
    const fullOriginalBlock = partialBlockToBlockForTesting(block);

    expect(outputBlock).toStrictEqual(fullOriginalBlock);
  });

  it("Convert two adjacent links in a block", async () => {
    const block: PartialBlock<DefaultBlockSchema> = {
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

    const node = blockToNode(block, tt.schema);
    expect(node).toMatchSnapshot();
    const outputBlock = nodeToBlock<DefaultBlockSchema>(
      node,
      defaultBlockSchema
    );

    // Temporary fix to set props to {}, because at this point
    // we don't have an easy way to access default props at runtime,
    // so partialBlockToBlockForTesting will not set them.
    (outputBlock as any).props = {};
    const fullOriginalBlock = partialBlockToBlockForTesting(block);

    expect(outputBlock).toStrictEqual(fullOriginalBlock);
  });
});
