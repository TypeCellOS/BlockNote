import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../../BlockNoteEditor";

import { addIdsToBlocks, partialBlocksToBlocksForTesting } from "../../..";
import { createBlockSpec } from "../../../extensions/Blocks/api/blocks/createSpec";
import {
  BlockSchema,
  BlockSchemaFromSpecs,
  BlockSpecs,
  PartialBlock,
} from "../../../extensions/Blocks/api/blocks/types";
import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  defaultBlockSpecs,
} from "../../../extensions/Blocks/api/defaultBlocks";
import { defaultProps } from "../../../extensions/Blocks/api/defaultProps";
import { InlineContentSchema } from "../../../extensions/Blocks/api/inlineContent/types";
import { StyleSchema } from "../../../extensions/Blocks/api/styles/types";
import {
  imagePropSchema,
  renderImage,
} from "../../../extensions/Blocks/nodes/BlockContent/ImageBlockContent/ImageBlockContent";
import { uploadToTmpFilesDotOrg_DEV_ONLY } from "../../../extensions/Blocks/nodes/BlockContent/ImageBlockContent/uploadToTmpFilesDotOrg_DEV_ONLY";
import { EditorTestCases } from "../../testCases";
import { customInlineContentTestCases } from "../../testCases/cases/customInlineContent";
import { customStylesTestCases } from "../../testCases/cases/customStyles";
import { defaultSchemaTestCases } from "../../testCases/cases/defaultSchema";
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

const editorTestCases: EditorTestCases<
  BlockSchemaFromSpecs<typeof customSpecs>,
  DefaultInlineContentSchema,
  DefaultStyleSchema
> = {
  name: "custom schema",
  createEditor: () => {
    return BlockNoteEditor.create({
      blockSpecs: customSpecs,
      uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
    });
  },
  documents: [
    {
      name: "simpleImage/button",
      blocks: [
        {
          type: "simpleImage" as const,
        },
      ],
    },
    {
      name: "simpleImage/basic",
      blocks: [
        {
          type: "simpleImage" as const,
          props: {
            url: "exampleURL",
            caption: "Caption",
            width: 256,
          } as const,
        },
      ],
    },
    {
      name: "simpleImage/nested",
      blocks: [
        {
          type: "simpleImage" as const,
          props: {
            url: "exampleURL",
            caption: "Caption",
            width: 256,
          } as const,
          children: [
            {
              type: "simpleImage" as const,
              props: {
                url: "exampleURL",
                caption: "Caption",
                width: 256,
              } as const,
            },
          ],
        },
      ],
    },
    {
      name: "customParagraph/basic",
      blocks: [
        {
          type: "customParagraph" as const,
          content: "Custom Paragraph",
        },
      ],
    },
    {
      name: "customParagraph/styled",
      blocks: [
        {
          type: "customParagraph" as const,
          props: {
            textAlignment: "center",
            textColor: "orange",
            backgroundColor: "pink",
          } as const,
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
      ],
    },
    {
      name: "customParagraph/nested",
      blocks: [
        {
          type: "customParagraph" as const,
          content: "Custom Paragraph",
          children: [
            {
              type: "customParagraph" as const,
              content: "Nested Custom Paragraph 1",
            },
            {
              type: "customParagraph" as const,
              content: "Nested Custom Paragraph 2",
            },
          ],
        },
      ],
    },
    {
      name: "simpleCustomParagraph/basic",
      blocks: [
        {
          type: "simpleCustomParagraph" as const,
          content: "Custom Paragraph",
        },
      ],
    },
    {
      name: "simpleCustomParagraph/styled",
      blocks: [
        {
          type: "simpleCustomParagraph" as const,
          props: {
            textAlignment: "center",
            textColor: "orange",
            backgroundColor: "pink",
          } as const,
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
      ],
    },
    {
      name: "simpleCustomParagraph/nested",
      blocks: [
        {
          type: "simpleCustomParagraph" as const,
          content: "Custom Paragraph",
          children: [
            {
              type: "simpleCustomParagraph" as const,
              content: "Nested Custom Paragraph 1",
            },
            {
              type: "simpleCustomParagraph" as const,
              content: "Nested Custom Paragraph 2",
            },
          ],
        },
      ],
    },
  ],
};

async function convertToHTMLAndCompareSnapshots<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  blocks: PartialBlock<B, I, S>[],
  snapshotDirectory: string,
  snapshotName: string
) {
  addIdsToBlocks(blocks);
  const serializer = createInternalHTMLSerializer(
    editor._tiptapEditor.schema,
    editor
  );
  const internalHTML = serializer.serializeBlocks(blocks);
  const internalHTMLSnapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/internal.html";
  expect(internalHTML).toMatchFileSnapshot(internalHTMLSnapshotPath);

  // turn the internalHTML back into blocks, and make sure no data was lost
  const fullBlocks = partialBlocksToBlocksForTesting(
    editor.blockSchema,
    blocks
  );
  const parsed = await editor.tryParseHTMLToBlocks(internalHTML);

  expect(parsed).toStrictEqual(fullBlocks);

  // Create the "external" HTML, which is a cleaned up HTML representation, but lossy
  const exporter = createExternalHTMLExporter(
    editor._tiptapEditor.schema,
    editor
  );
  const externalHTML = exporter.exportBlocks(blocks);
  const externalHTMLSnapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/external.html";
  expect(externalHTML).toMatchFileSnapshot(externalHTMLSnapshotPath);
}

const testCases = [
  defaultSchemaTestCases,
  editorTestCases,
  customStylesTestCases,
  customInlineContentTestCases,
];

describe("Test HTML conversion", () => {
  for (const testCase of testCases) {
    describe("Case: " + testCase.name, () => {
      let editor: BlockNoteEditor<any, any, any>;

      beforeEach(() => {
        editor = testCase.createEditor();
      });

      afterEach(() => {
        editor._tiptapEditor.destroy();
        editor = undefined as any;

        delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
      });

      for (const document of testCase.documents) {
        // eslint-disable-next-line no-loop-func
        it("Convert " + document.name + " to HTML", async () => {
          const nameSplit = document.name.split("/");
          await convertToHTMLAndCompareSnapshots(
            editor,
            document.blocks,
            nameSplit[0],
            nameSplit[1]
          );
        });
      }
    });
  }
});
