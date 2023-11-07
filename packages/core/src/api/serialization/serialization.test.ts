import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { Editor } from "@tiptap/core";
import { customBlockSerializer } from "./serialization";
import { uploadToTmpFilesDotOrg_DEV_ONLY } from "../../extensions/Blocks/nodes/BlockContent/ImageBlockContent/uploadToTmpFilesDotOrg_DEV_ONLY";
import { createBlockSpec } from "../../extensions/Blocks/api/block";
import {
  imagePropSchema,
  renderImage,
} from "../../extensions/Blocks/nodes/BlockContent/ImageBlockContent/ImageBlockContent";
import { defaultBlockSchema } from "../../extensions/Blocks/api/defaultBlocks";
import { cleanHTML } from "../formatConversions/formatConversions";
import { DOMSerializer, Fragment, Node } from "prosemirror-model";
import { blockToNode } from "../nodeConversions/nodeConversions";
import { PartialBlock } from "../../extensions/Blocks/api/blockTypes";

// This is a modified version of the default image block that does not implement
// a `serialize` function. It's used to test if the custom serializer by default
// serializes custom blocks using their `render` function.
const SimpleImage = createBlockSpec({
  type: "simpleImage",
  propSchema: imagePropSchema,
  containsInlineContent: false,
  render: renderImage as any,
});

const customSchema = {
  ...defaultBlockSchema,
  simpleImage: SimpleImage,
};

let editor: BlockNoteEditor<typeof customSchema>;
let tt: Editor;

beforeEach(() => {
  editor = new BlockNoteEditor({
    blockSchema: customSchema,
    uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
  });
  tt = editor._tiptapEditor;
});

afterEach(() => {
  tt.destroy();
  editor = undefined as any;
  tt = undefined as any;

  delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
});

// Tests `serializeNode`, `serializeFragment`, and `cleanHTML` methods.
async function serializeAndCompareSnapshots(
  serializer: DOMSerializer,
  blockGroup: Node,
  snapshotName: string
) {
  const serializeNodeHTML = (
    serializer.serializeNode(blockGroup) as HTMLElement
  ).outerHTML;
  const serializeFragmentHTML = (
    serializer.serializeFragment(Fragment.from(blockGroup)) as HTMLElement
  ).firstElementChild!.outerHTML;
  const structuredHTMLSnapshotPath =
    "./__snapshots__/" + snapshotName + "Structured.html";

  expect(serializeNodeHTML).toMatchFileSnapshot(structuredHTMLSnapshotPath);
  expect(serializeFragmentHTML).toMatchFileSnapshot(structuredHTMLSnapshotPath);

  const serializeNodeCleanHTML = await cleanHTML(serializeNodeHTML);
  const serializeFragmentCleanHTML = await cleanHTML(serializeFragmentHTML);
  const cleanHTMLSnapshotPath =
    "./__snapshots__/" + snapshotName + "Clean.html";

  expect(serializeNodeCleanHTML).toMatchFileSnapshot(cleanHTMLSnapshotPath);
  expect(serializeFragmentCleanHTML).toMatchFileSnapshot(cleanHTMLSnapshotPath);
}

describe("Convert paragraphs to structured HTML", () => {
  it("Convert paragraph to structured HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "paragraph",
        content: "Paragraph",
      },
    ];
    const nodes: Node[] = blocks.map((block) =>
      blockToNode(block, editor._tiptapEditor.schema)
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, nodes);

    const serializer = customBlockSerializer(tt.schema, editor);

    await serializeAndCompareSnapshots(serializer, blockGroup, "paragraph");
  });

  it("Convert styled paragraph to structured HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "paragraph",
        props: {
          textAlignment: "center",
          textColor: "orange",
          backgroundColor: "pink",
        },
        content: [
          {
            type: "text",
            styles: {},
            text: "Plain ",
          },
          {
            type: "text",
            styles: {
              textColor: "red",
            },
            text: "Red Text ",
          },
          {
            type: "text",
            styles: {
              backgroundColor: "blue",
            },
            text: "Blue Background ",
          },
          {
            type: "text",
            styles: {
              textColor: "red",
              backgroundColor: "blue",
            },
            text: "Mixed Colors",
          },
        ],
      },
    ];
    const nodes: Node[] = blocks.map((block) =>
      blockToNode(block, editor._tiptapEditor.schema)
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, nodes);

    const serializer = customBlockSerializer(tt.schema, editor);

    await serializeAndCompareSnapshots(
      serializer,
      blockGroup,
      "paragraphStyled"
    );
  });

  it("Convert nested paragraph to structured HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "paragraph",
        content: "Paragraph",
        children: [
          {
            type: "paragraph",
            content: "Nested Paragraph 1",
          },
          {
            type: "paragraph",
            content: "Nested Paragraph 2",
          },
        ],
      },
    ];
    const nodes: Node[] = blocks.map((block) =>
      blockToNode(block, editor._tiptapEditor.schema)
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, nodes);

    const serializer = customBlockSerializer(tt.schema, editor);

    await serializeAndCompareSnapshots(
      serializer,
      blockGroup,
      "paragraphNested"
    );
  });
});

describe("Convert images to structured HTML", () => {
  it("Convert add image button to structured HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "image",
      },
    ];
    const nodes: Node[] = blocks.map((block) =>
      blockToNode(block, editor._tiptapEditor.schema)
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, nodes);

    const serializer = customBlockSerializer(tt.schema, editor);

    await serializeAndCompareSnapshots(serializer, blockGroup, "imageButton");
  });

  it("Convert image to structured HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "image",
        props: {
          url: "exampleURL",
          caption: "Caption",
          width: 256,
        },
      },
    ];
    const nodes: Node[] = blocks.map((block) =>
      blockToNode(block, editor._tiptapEditor.schema)
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, nodes);

    const serializer = customBlockSerializer(tt.schema, editor);

    await serializeAndCompareSnapshots(serializer, blockGroup, "image");
  });

  it("Convert nested image to structured HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "image",
        props: {
          url: "exampleURL",
          caption: "Caption",
          width: 256,
        },
        children: [
          {
            type: "image",
            props: {
              url: "exampleURL",
              caption: "Caption",
              width: 256,
            },
          },
        ],
      },
    ];
    const nodes: Node[] = blocks.map((block) =>
      blockToNode(block, editor._tiptapEditor.schema)
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, nodes);

    const serializer = customBlockSerializer(tt.schema, editor);

    await serializeAndCompareSnapshots(serializer, blockGroup, "imageNested");
  });
});

describe("Convert simple images to structured HTML", () => {
  it("Convert simple add image button to structured HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "simpleImage",
      },
    ];
    const nodes: Node[] = blocks.map((block) =>
      blockToNode(block, editor._tiptapEditor.schema)
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, nodes);

    const serializer = customBlockSerializer(tt.schema, editor);

    await serializeAndCompareSnapshots(
      serializer,
      blockGroup,
      "simpleImageButton"
    );
  });

  it("Convert simple image to structured HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "simpleImage",
        props: {
          url: "exampleURL",
          caption: "Caption",
          width: 256,
        },
      },
    ];
    const nodes: Node[] = blocks.map((block) =>
      blockToNode(block, editor._tiptapEditor.schema)
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, nodes);

    const serializer = customBlockSerializer(tt.schema, editor);

    await serializeAndCompareSnapshots(serializer, blockGroup, "simpleImage");
  });

  it("Convert nested image to structured HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "simpleImage",
        props: {
          url: "exampleURL",
          caption: "Caption",
          width: 256,
        },
        children: [
          {
            type: "simpleImage",
            props: {
              url: "exampleURL",
              caption: "Caption",
              width: 256,
            },
          },
        ],
      },
    ];
    const nodes: Node[] = blocks.map((block) =>
      blockToNode(block, editor._tiptapEditor.schema)
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, nodes);

    const serializer = customBlockSerializer(tt.schema, editor);

    await serializeAndCompareSnapshots(
      serializer,
      blockGroup,
      "simpleImageNested"
    );
  });
});
