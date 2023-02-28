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
  it("Convert simple spec to node", async () => {
    const output = blockToNode(simpleBlock, editor.schema);

    expect(output).toMatchSnapshot();
  });

  it("Convert simple node to block", async () => {
    const output = nodeToBlock(simpleNode);

    expect(output).toMatchSnapshot();
  });
});

const complexBlock: PartialBlock = {
  type: "heading",
  props: {
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
      props: {},
      content: "Paragraph",
      children: [],
    },
    {
      type: "bulletListItem",
    },
  ],
};
const complexNode = editor.schema.nodes["blockContainer"].create({}, [
  editor.schema.nodes["heading"].create({ level: "2" }, [
    editor.schema.text("Heading ", [
      editor.schema.mark("bold"),
      editor.schema.mark("underline"),
    ]),
    editor.schema.text("2", [
      editor.schema.mark("italic"),
      editor.schema.mark("strike"),
    ]),
  ]),
  editor.schema.nodes["blockGroup"].create({}, [
    editor.schema.nodes["blockContainer"].create({}, [
      editor.schema.nodes["paragraph"].create(
        {},
        editor.schema.text("Paragraph")
      ),
    ]),
    editor.schema.nodes["blockContainer"].create({}, [
      editor.schema.nodes["bulletListItem"].create(),
    ]),
  ]),
]);

describe("Complex ProseMirror Node Conversions", () => {
  it("Convert complex spec to node", async () => {
    const output = blockToNode(complexBlock, editor.schema);

    expect(output).toMatchSnapshot();
  });

  it("Convert complex node to block", async () => {
    const output = nodeToBlock(complexNode);

    expect(output).toMatchSnapshot();
  });
});
