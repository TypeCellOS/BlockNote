import { Editor } from "@tiptap/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../../BlockNoteEditor";

import {
  BlockSchemaFromSpecs,
  BlockSpecs,
  PartialBlock,
} from "../../../extensions/Blocks/api/blockTypes";
import { createBlockSpec } from "../../../extensions/Blocks/api/customBlocks";
import { defaultBlockSpecs } from "../../../extensions/Blocks/api/defaultBlocks";
import { defaultProps } from "../../../extensions/Blocks/api/defaultProps";
import {
  imagePropSchema,
  renderImage,
} from "../../../extensions/Blocks/nodes/BlockContent/ImageBlockContent/ImageBlockContent";
import { uploadToTmpFilesDotOrg_DEV_ONLY } from "../../../extensions/Blocks/nodes/BlockContent/ImageBlockContent/uploadToTmpFilesDotOrg_DEV_ONLY";
import { createExternalHTMLExporter } from "./externalHTMLExporter";
import { createInternalHTMLSerializer } from "./internalHTMLSerializer";

// This is a modified version of the default image block that does not implement
// a `serialize` function. It's used to test if the custom serializer by default
// serializes custom blocks using their `render` function.
const SimpleImage = createBlockSpec(
  {
    type: "simpleImage" as const,
    propSchema: imagePropSchema,
    content: "none",
  },
  { render: renderImage as any }
);

const CustomParagraph = createBlockSpec(
  {
    type: "customParagraph" as const,
    propSchema: defaultProps,
    content: "inline",
  },
  {
    render: () => {
      const paragraph = document.createElement("p");
      paragraph.className = "custom-paragraph";

      return {
        dom: paragraph,
        contentDOM: paragraph,
      };
    },
    toExternalHTML: () => {
      const paragraph = document.createElement("p");
      paragraph.className = "custom-paragraph";
      paragraph.innerHTML = "Hello World";

      return {
        dom: paragraph,
      };
    },
  }
);

const SimpleCustomParagraph = createBlockSpec(
  {
    type: "simpleCustomParagraph" as const,
    propSchema: defaultProps,
    content: "inline",
  },
  {
    render: () => {
      const paragraph = document.createElement("p");
      paragraph.className = "simple-custom-paragraph";

      return {
        dom: paragraph,
        contentDOM: paragraph,
      };
    },
  }
);

const customSpecs = {
  ...defaultBlockSpecs,
  simpleImage: SimpleImage,
  customParagraph: CustomParagraph,
  simpleCustomParagraph: SimpleCustomParagraph,
} satisfies BlockSpecs;

type CustomSchemaType = BlockSchemaFromSpecs<typeof customSpecs>;

let editor: BlockNoteEditor<CustomSchemaType>;
let tt: Editor;

beforeEach(() => {
  editor = BlockNoteEditor.create({
    blockSpecs: customSpecs,
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

function convertToHTMLAndCompareSnapshots(
  blocks: PartialBlock<CustomSchemaType>[],
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
  const externalHTML = exporter.exportBlocks(blocks);
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
    const blocks: PartialBlock<CustomSchemaType>[] = [
      {
        type: "paragraph",
        content: "Paragraph",
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "paragraph", "basic");
  });

  it("Convert styled paragraph to HTML", async () => {
    const blocks: PartialBlock<CustomSchemaType>[] = [
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

    convertToHTMLAndCompareSnapshots(blocks, "paragraph", "styled");
  });

  it("Convert nested paragraph to HTML", async () => {
    const blocks: PartialBlock<CustomSchemaType>[] = [
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

    convertToHTMLAndCompareSnapshots(blocks, "paragraph", "nested");
  });
});

describe("Convert images to HTML", () => {
  it("Convert add image button to HTML", async () => {
    const blocks: PartialBlock<CustomSchemaType>[] = [
      {
        type: "image",
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "image", "button");
  });

  it("Convert image to HTML", async () => {
    const blocks: PartialBlock<CustomSchemaType>[] = [
      {
        type: "image",
        props: {
          url: "exampleURL",
          caption: "Caption",
          width: 256,
        },
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "image", "basic");
  });

  it("Convert nested image to HTML", async () => {
    const blocks: PartialBlock<CustomSchemaType>[] = [
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

    convertToHTMLAndCompareSnapshots(blocks, "image", "nested");
  });
});

describe("Convert simple images to HTML", () => {
  it("Convert simple add image button to HTML", async () => {
    const blocks: PartialBlock<CustomSchemaType>[] = [
      {
        type: "simpleImage",
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "simpleImage", "button");
  });

  it("Convert simple image to HTML", async () => {
    const blocks: PartialBlock<CustomSchemaType>[] = [
      {
        type: "simpleImage",
        props: {
          url: "exampleURL",
          caption: "Caption",
          width: 256,
        },
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "simpleImage", "basic");
  });

  it("Convert nested image to HTML", async () => {
    const blocks: PartialBlock<CustomSchemaType>[] = [
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

    convertToHTMLAndCompareSnapshots(blocks, "simpleImage", "nested");
  });
});

describe("Convert custom blocks with inline content to HTML", () => {
  it("Convert custom block with inline content to HTML", async () => {
    const blocks: PartialBlock<CustomSchemaType>[] = [
      {
        type: "customParagraph",
        content: "Custom Paragraph",
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "customParagraph", "basic");
  });

  it("Convert styled custom block with inline content to HTML", async () => {
    const blocks: PartialBlock<CustomSchemaType>[] = [
      {
        type: "customParagraph",
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

    convertToHTMLAndCompareSnapshots(blocks, "customParagraph", "styled");
  });

  it("Convert nested block with inline content to HTML", async () => {
    const blocks: PartialBlock<CustomSchemaType>[] = [
      {
        type: "customParagraph",
        content: "Custom Paragraph",
        children: [
          {
            type: "customParagraph",
            content: "Nested Custom Paragraph 1",
          },
          {
            type: "customParagraph",
            content: "Nested Custom Paragraph 2",
          },
        ],
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "customParagraph", "nested");
  });
});

describe("Convert custom blocks with non-exported inline content to HTML", () => {
  it("Convert custom block with non-exported inline content to HTML", async () => {
    const blocks: PartialBlock<CustomSchemaType>[] = [
      {
        type: "simpleCustomParagraph",
        content: "Custom Paragraph",
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "simpleCustomParagraph", "basic");
  });

  it("Convert styled custom block with non-exported inline content to HTML", async () => {
    const blocks: PartialBlock<CustomSchemaType>[] = [
      {
        type: "simpleCustomParagraph",
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

    convertToHTMLAndCompareSnapshots(blocks, "simpleCustomParagraph", "styled");
  });

  it("Convert nested block with non-exported inline content to HTML", async () => {
    const blocks: PartialBlock<CustomSchemaType>[] = [
      {
        type: "simpleCustomParagraph",
        content: "Custom Paragraph",
        children: [
          {
            type: "simpleCustomParagraph",
            content: "Nested Custom Paragraph 1",
          },
          {
            type: "simpleCustomParagraph",
            content: "Nested Custom Paragraph 2",
          },
        ],
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "simpleCustomParagraph", "nested");
  });
});
