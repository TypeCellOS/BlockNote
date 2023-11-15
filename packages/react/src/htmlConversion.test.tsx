import {
  BlockNoteEditor,
  BlockSchema,
  PartialBlock,
  createExternalHTMLExporter,
  createInternalHTMLSerializer,
  defaultBlockSchema,
  defaultProps,
  uploadToTmpFilesDotOrg_DEV_ONLY,
} from "@blocknote/core";
import { Editor } from "@tiptap/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InlineContent, createReactBlockSpec } from "./ReactBlockSpec";

const ReactCustomParagraph = createReactBlockSpec(
  {
    type: "reactCustomParagraph" as const,
    propSchema: defaultProps,
    containsInlineContent: true,
  },
  {
    render: () => (
      <InlineContent as={"p"} className={"react-custom-paragraph"} />
    ),
    toExternalHTML: () => (
      <p className={"react-custom-paragraph"}>Hello World</p>
    ),
  }
);

const SimpleReactCustomParagraph = createReactBlockSpec(
  {
    type: "simpleReactCustomParagraph" as const,
    propSchema: defaultProps,
    containsInlineContent: true,
  },
  {
    render: () => (
      <InlineContent as={"p"} className={"simple-react-custom-paragraph"} />
    ),
  }
);

const customSchema = {
  ...defaultBlockSchema,
  reactCustomParagraph: ReactCustomParagraph,
  simpleReactCustomParagraph: SimpleReactCustomParagraph,
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

function convertToHTMLAndCompareSnapshots(
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
  const externalHTML = exporter.exportBlocks(blocks);
  const externalHTMLSnapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/external.html";
  expect(externalHTML).toMatchFileSnapshot(externalHTMLSnapshotPath);
}

describe("Convert custom blocks with inline content to HTML", () => {
  it("Convert custom block with inline content to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "reactCustomParagraph",
        content: "React Custom Paragraph",
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "reactCustomParagraph", "basic");
  });

  it("Convert styled custom block with inline content to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "reactCustomParagraph",
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

    convertToHTMLAndCompareSnapshots(blocks, "reactCustomParagraph", "styled");
  });

  it("Convert nested block with inline content to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "reactCustomParagraph",
        content: "React Custom Paragraph",
        children: [
          {
            type: "reactCustomParagraph",
            content: "Nested React Custom Paragraph 1",
          },
          {
            type: "reactCustomParagraph",
            content: "Nested React Custom Paragraph 2",
          },
        ],
      },
    ];

    convertToHTMLAndCompareSnapshots(blocks, "reactCustomParagraph", "nested");
  });
});

describe("Convert custom blocks with non-exported inline content to HTML", () => {
  it("Convert custom block with non-exported inline content to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "simpleReactCustomParagraph",
        content: "React Custom Paragraph",
      },
    ];

    convertToHTMLAndCompareSnapshots(
      blocks,
      "simpleReactCustomParagraph",
      "basic"
    );
  });

  it("Convert styled custom block with non-exported inline content to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "simpleReactCustomParagraph",
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

    convertToHTMLAndCompareSnapshots(
      blocks,
      "simpleReactCustomParagraph",
      "styled"
    );
  });

  it("Convert nested block with non-exported inline content to HTML", async () => {
    const blocks: PartialBlock<typeof customSchema>[] = [
      {
        type: "simpleReactCustomParagraph",
        content: "Custom React Paragraph",
        children: [
          {
            type: "simpleReactCustomParagraph",
            content: "Nested React Custom Paragraph 1",
          },
          {
            type: "simpleReactCustomParagraph",
            content: "Nested React Custom Paragraph 2",
          },
        ],
      },
    ];

    convertToHTMLAndCompareSnapshots(
      blocks,
      "simpleReactCustomParagraph",
      "nested"
    );
  });
});
