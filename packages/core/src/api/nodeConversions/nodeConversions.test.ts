import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BlockNoteEditor, PartialBlock } from "../..";
import { blockToNode, nodeToBlock } from "./nodeConversions";

import { Editor } from "@tiptap/core";
import { Node } from "prosemirror-model";
import UniqueID from "../../extensions/UniqueID/UniqueID";

let editor: Editor;

let simpleBlock: PartialBlock;
let simpleNode: Node;

let complexBlock: PartialBlock;
let complexNode: Node;

beforeEach(() => {
  (window as Window & { __TEST_OPTIONS?: {} }).__TEST_OPTIONS = {};

  editor = new BlockNoteEditor()._tiptapEditor;

  simpleBlock = {
    type: "paragraph",
  };
  simpleNode = editor.schema.nodes["blockContainer"].create(
    { id: UniqueID.options.generateID() },
    editor.schema.nodes["paragraph"].create()
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
  complexNode = editor.schema.nodes["blockContainer"].create(
    {
      id: UniqueID.options.generateID(),
      backgroundColor: "blue",
      textColor: "yellow",
    },
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
        editor.schema.nodes["blockContainer"].create(
          { id: UniqueID.options.generateID(), backgroundColor: "red" },
          [
            editor.schema.nodes["paragraph"].create(
              {},
              editor.schema.text("Paragraph")
            ),
          ]
        ),
        editor.schema.nodes["blockContainer"].create(
          { id: UniqueID.options.generateID() },
          [editor.schema.nodes["bulletListItem"].create()]
        ),
      ]),
    ]
  );
});

afterEach(() => {
  editor.destroy();
  editor = undefined as any;

  delete (window as Window & { __TEST_OPTIONS?: {} }).__TEST_OPTIONS;
});

describe("Simple ProseMirror Node Conversions", () => {
  it("Convert simple block to node", async () => {
    const firstNodeConversion = blockToNode(simpleBlock, editor.schema);

    expect(firstNodeConversion).toMatchSnapshot();
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

describe("Complex ProseMirror Node Conversions", () => {
  it("Convert complex block to node", async () => {
    const firstNodeConversion = blockToNode(complexBlock, editor.schema);

    expect(firstNodeConversion).toMatchSnapshot();
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
