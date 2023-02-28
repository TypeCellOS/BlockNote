import { describe, expect, it } from "vitest";
import {
  PartialBlock,
  BlockNoteEditor,
  blockToNode,
  nodeToBlock,
} from "../src";

const editor = new BlockNoteEditor().tiptapEditor;

const simpleBlock: PartialBlock = {
  type: "paragraph",
};
const simpleNode = editor.schema.nodes["blockContainer"].create(
  {},
  editor.schema.nodes["paragraph"].create()
);

describe("Simple ProseMirror Node Conversions", () => {
  it("Convert simple block to node", async () => {
    const firstNodeConversion = blockToNode(simpleBlock, editor.schema);

    expect(firstNodeConversion).toMatchSnapshot();

    const firstBlockConversion = nodeToBlock(firstNodeConversion);

    const secondNodeConversion = blockToNode(
      firstBlockConversion,
      editor.schema
    );

    expect(secondNodeConversion).toStrictEqual(simpleNode);
  });

  it("Convert simple node to block", async () => {
    const firstBlockConversion = nodeToBlock(simpleNode);

    expect(firstBlockConversion).toMatchSnapshot();

    const firstNodeConversion = blockToNode(
      firstBlockConversion,
      editor.schema
    );

    expect(firstNodeConversion).toStrictEqual(simpleNode);
  });
});

const complexBlock: PartialBlock = {
  type: "heading",
  props: {
    backgroundColor: "blue",
    textColor: "yellow",
    textAlignment: "right",
    level: "2",
  },
  content: [
    {
      text: "Heading ",
      styles: [
        {
          type: "bold",
          props: {},
        },
        {
          type: "underline",
          props: {},
        },
      ],
    },
    {
      text: "2",
      styles: [
        {
          type: "italic",
          props: {},
        },
        {
          type: "strike",
          props: {},
        },
      ],
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

const complexNode = editor.schema.nodes["blockContainer"].create(
  { backgroundColor: "blue", textColor: "yellow" },
  [
    editor.schema.nodes["heading"].create(
      { textAlignment: "right", level: "2" },
      [
        editor.schema.text("Heading ", [
          editor.schema.mark("bold"),
          editor.schema.mark("underline"),
        ]),
        editor.schema.text("2", [
          editor.schema.mark("italic"),
          editor.schema.mark("strike"),
        ]),
      ]
    ),
    editor.schema.nodes["blockGroup"].create({}, [
      editor.schema.nodes["blockContainer"].create({ backgroundColor: "red" }, [
        editor.schema.nodes["paragraph"].create(
          {},
          editor.schema.text("Paragraph")
        ),
      ]),
      editor.schema.nodes["blockContainer"].create({}, [
        editor.schema.nodes["bulletListItem"].create(),
      ]),
    ]),
  ]
);

describe("Complex ProseMirror Node Conversions", () => {
  it("Convert complex block to node", async () => {
    const firstNodeConversion = blockToNode(complexBlock, editor.schema);

    expect(firstNodeConversion).toMatchSnapshot();

    const firstBlockConversion = nodeToBlock(firstNodeConversion);

    const secondNodeConversion = blockToNode(
      firstBlockConversion,
      editor.schema
    );

    expect(secondNodeConversion).toStrictEqual(complexNode);
  });

  it("Convert complex node to block", async () => {
    const firstBlockConversion = nodeToBlock(complexNode);

    expect(firstBlockConversion).toMatchSnapshot();

    const firstNodeConversion = blockToNode(
      firstBlockConversion,
      editor.schema
    );

    expect(firstNodeConversion).toStrictEqual(complexNode);
  });
});
