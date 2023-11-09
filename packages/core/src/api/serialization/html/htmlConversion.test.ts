import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBlockSpec } from "../../../extensions/Blocks/api/block";
import {
  imagePropSchema,
  renderImage,
} from "../../../extensions/Blocks/nodes/BlockContent/ImageBlockContent/ImageBlockContent";
import { defaultBlockSchema } from "../../../extensions/Blocks/api/defaultBlocks";
import {
  BlockSchema,
  PartialBlock,
} from "../../../extensions/Blocks/api/blockTypes";
import { BlockNoteEditor } from "../../../BlockNoteEditor";
import { Editor } from "@tiptap/core";
import { uploadToTmpFilesDotOrg_DEV_ONLY } from "../../../extensions/Blocks/nodes/BlockContent/ImageBlockContent/uploadToTmpFilesDotOrg_DEV_ONLY";
import { createInternalHTMLSerializer } from "./internalHTMLSerializer";
import { createExternalHTMLExporter } from "./externalHTMLExporter";

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
} satisfies BlockSchema;

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

async function convertToHTMLAndCompareSnapshots(
  blocks: PartialBlock<typeof customSchema>[],
  snapshotDirectory: string,
  snapshotName: string
) {
  const serializer = createInternalHTMLSerializer(tt.schema, editor);
  const internalHTML = serializer.serializeBlocks(blocks);
  const internalHTMLSnapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/internal.html";
  expect(internalHTML).toMatchFileSnapshot(internalHTMLSnapshotPath);

  const exporter = createExternalHTMLExporter(tt.schema, editor);
  const externalHTML = await exporter.exportBlocks(blocks);
  const externalHTMLSnapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/external.html";
  expect(externalHTML).toMatchFileSnapshot(externalHTMLSnapshotPath);
}

describe("Convert paragraphs to HTML", () => {
  it("Convert paragraph to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "paragraph",
        content: "Paragraph",
      },
    ];

    await convertToHTMLAndCompareSnapshots(blocks, "paragraph", "basic");
  });

  it("Convert styled paragraph to HTML", async () => {
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

    await convertToHTMLAndCompareSnapshots(blocks, "paragraph", "styled");
  });

  it("Convert nested paragraph to HTML", async () => {
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

    await convertToHTMLAndCompareSnapshots(blocks, "paragraph", "nested");
  });
});

describe("Convert images to HTML", () => {
  it("Convert add image button to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "image",
      },
    ];

    await convertToHTMLAndCompareSnapshots(blocks, "image", "button");
  });

  it("Convert image to HTML", async () => {
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

    await convertToHTMLAndCompareSnapshots(blocks, "image", "basic");
  });

  it("Convert nested image to HTML", async () => {
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

    await convertToHTMLAndCompareSnapshots(blocks, "image", "nested");
  });
});

describe("Convert simple images to HTML", () => {
  it("Convert simple add image button to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "simpleImage",
      },
    ];

    await convertToHTMLAndCompareSnapshots(blocks, "simpleImage", "button");
  });

  it("Convert simple image to HTML", async () => {
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

    await convertToHTMLAndCompareSnapshots(blocks, "simpleImage", "basic");
  });

  it("Convert nested image to HTML", async () => {
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

    await convertToHTMLAndCompareSnapshots(blocks, "simpleImage", "nested");
  });
});
