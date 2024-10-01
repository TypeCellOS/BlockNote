import { NodeSelection, TextSelection } from "prosemirror-state";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor";

import { addIdsToBlocks, partialBlocksToBlocksForTesting } from "../../..";
import { PartialBlock } from "../../../blocks/defaultBlocks";
import { BlockSchema } from "../../../schema/blocks/types";
import { InlineContentSchema } from "../../../schema/inlineContent/types";
import { StyleSchema } from "../../../schema/styles/types";
import { initializeESMDependencies } from "../../../util/esmDependencies";
import { customBlocksTestCases } from "../../testUtil/cases/customBlocks";
import { customInlineContentTestCases } from "../../testUtil/cases/customInlineContent";
import { customStylesTestCases } from "../../testUtil/cases/customStyles";
import { defaultSchemaTestCases } from "../../testUtil/cases/defaultSchema";
import { createExternalHTMLExporter } from "./externalHTMLExporter";
import { createInternalHTMLSerializer } from "./internalHTMLSerializer";
import { Node } from "prosemirror-model";

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
  const serializer = createInternalHTMLSerializer(editor.pmSchema, editor);
  const internalHTML = serializer.serializeBlocks(blocks, {});
  const internalHTMLSnapshotPath =
    "./__snapshots__/" +
    snapshotDirectory +
    "/" +
    snapshotName +
    "/internal.html";
  expect(internalHTML).toMatchFileSnapshot(internalHTMLSnapshotPath);

  // turn the internalHTML back into blocks, and make sure no data was lost
  const fullBlocks = partialBlocksToBlocksForTesting(
    editor.schema.blockSchema,
    blocks
  );
  const parsed = await editor.tryParseHTMLToBlocks(internalHTML);

  expect(parsed).toStrictEqual(fullBlocks);

  await initializeESMDependencies();
  // Create the "external" HTML, which is a cleaned up HTML representation, but lossy
  const exporter = createExternalHTMLExporter(editor.pmSchema, editor);
  const externalHTML = exporter.exportBlocks(blocks, {});
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
  customBlocksTestCases,
  customStylesTestCases,
  customInlineContentTestCases,
];

describe("Test HTML conversion", () => {
  for (const testCase of testCases) {
    describe("Case: " + testCase.name, () => {
      let editor: BlockNoteEditor<any, any, any>;
      const div = document.createElement("div");
      beforeEach(() => {
        editor = testCase.createEditor();

        // Note that we don't necessarily need to mount a root
        // Currently, we do mount to a root so that it reflects the "production" use-case more closely.

        // However, it would be nice to increased converage and share the same set of tests for these cases:
        // - does render to a root
        // - does not render to a root
        // - runs in server (jsdom) environment using server-util
        editor.mount(div);
      });

      afterEach(() => {
        editor.mount(undefined);
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

// These tests are meant to test the copying of user selections in the editor.
// The test cases used for the other HTML conversion tests are not suitable here
// as they are represented in the BlockNote API, whereas here we want to test
// ProseMirror/TipTap selections directly.
describe("Test ProseMirror selection clipboard HTML", () => {
  const initialContent: PartialBlock[] = [
    {
      type: "heading",
      props: {
        level: 2,
        textColor: "red",
      },
      content: "Heading 1",
      children: [
        {
          type: "paragraph",
          content: "Nested Paragraph 1",
        },
        {
          type: "paragraph",
          content: "Nested Paragraph 2",
        },
        {
          type: "paragraph",
          content: "Nested Paragraph 3",
        },
      ],
    },
    {
      type: "heading",
      props: {
        level: 2,
        textColor: "red",
      },
      content: "Heading 2",
      children: [
        {
          type: "paragraph",
          content: "Nested Paragraph 1",
        },
        {
          type: "paragraph",
          content: "Nested Paragraph 2",
        },
        {
          type: "paragraph",
          content: "Nested Paragraph 3",
        },
      ],
    },
    {
      type: "heading",
      props: {
        level: 2,
        textColor: "red",
      },
      content: [
        {
          type: "text",
          text: "Bold",
          styles: {
            bold: true,
          },
        },
        {
          type: "text",
          text: "Italic",
          styles: {
            italic: true,
          },
        },
        {
          type: "text",
          text: "Regular",
          styles: {},
        },
      ],
      children: [
        {
          type: "image",
          props: {
            url: "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg",
          },
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph",
            },
          ],
        },
      ],
    },
    {
      type: "table",
      content: {
        type: "tableContent",
        rows: [
          {
            cells: ["Table Cell", "Table Cell"],
          },
          {
            cells: ["Table Cell", "Table Cell"],
          },
        ],
      },
      // Not needed as selections starting in table cells will get snapped to
      // the table boundaries.
      // children: [
      //   {
      //     type: "table",
      //     content: {
      //       type: "tableContent",
      //       rows: [
      //         {
      //           cells: ["Table Cell", "Table Cell"],
      //         },
      //         {
      //           cells: ["Table Cell", "Table Cell"],
      //         },
      //       ],
      //     },
      //   },
      // ],
    },
  ];

  let pmView: any;
  let editor: BlockNoteEditor;
  const div = document.createElement("div");
  document.body.append(div);

  beforeEach(() => {
    editor.replaceBlocks(editor.document, initialContent);
  });

  beforeAll(async () => {
    pmView = await import("prosemirror-view");
    (window as any).__TEST_OPTIONS = (window as any).__TEST_OPTIONS || {};

    editor = BlockNoteEditor.create();
    editor.mount(div);

    await initializeESMDependencies();
  });

  afterAll(() => {
    editor.mount(undefined);
    editor._tiptapEditor.destroy();
    editor = undefined as any;

    delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
  });

  // Sets the editor selection to the given start and end positions, then
  // exports the selected content to HTML and compares it to a snapshot.
  function testSelection(testName: string, startPos: number, endPos: number) {
    editor.dispatch(
      editor._tiptapEditor.state.tr.setSelection(
        TextSelection.create(editor._tiptapEditor.state.doc, startPos, endPos)
      )
    );
    if (
      "node" in editor._tiptapEditor.view.state.selection &&
      (editor._tiptapEditor.view.state.selection.node as Node).type.spec
        .group === "blockContent"
    ) {
      editor.dispatch(
        editor._tiptapEditor.state.tr.setSelection(
          new NodeSelection(
            editor._tiptapEditor.view.state.doc.resolve(
              editor._tiptapEditor.view.state.selection.from - 1
            )
          )
        )
      );
    }

    const originalSlice = editor._tiptapEditor.view.state.selection.content();

    // Uses default ProseMirror clipboard serialization.
    const internalHTML: string = pmView.__serializeForClipboard(
      editor._tiptapEditor.view,
      originalSlice
    ).dom.innerHTML;

    expect(internalHTML).toMatchFileSnapshot(
      `./__snapshots_selection_html__/${testName}.html`
    );

    const recreatedSlice = pmView.__parseFromClipboard(
      editor._tiptapEditor.view,
      "",
      internalHTML,
      false,
      editor._tiptapEditor.state.selection.$from
    );

    expect(recreatedSlice).toStrictEqual(originalSlice);
  }

  const testCases: { testName: string; startPos: number; endPos: number }[] = [
    // TODO: Consider adding test cases for nested blocks & double nested blocks.
    // TODO: Add test case for copying 2 paragraphs as this was a bug in the past.
    // TODO: Add test case for copying multiple list items as this was a bug in the past.
    // Selection spans all of first heading's children.
    {
      testName: "multipleChildren",
      startPos: 16,
      endPos: 78,
    },
    // Selection spans from start of first heading to end of its first child.
    {
      testName: "childToParent",
      startPos: 3,
      endPos: 34,
    },
    // Selection spans from middle of first heading to the middle of its first
    // child.
    {
      testName: "partialChildToParent",
      startPos: 6,
      endPos: 23,
    },
    // Selection spans from start of first heading's first child to end of
    // second heading's content (does not include second heading's children).
    {
      testName: "childrenToNextParent",
      startPos: 16,
      endPos: 93,
    },
    // Selection spans from start of first heading's first child to end of
    // second heading's last child.
    {
      testName: "childrenToNextParentsChildren",
      startPos: 16,
      endPos: 159,
    },
    // Selection spans "Regular" text inside third heading.
    {
      testName: "unstyledText",
      startPos: 175,
      endPos: 182,
    },
    // Selection spans "Italic" text inside third heading.
    {
      testName: "styledText",
      startPos: 169,
      endPos: 175,
    },
    // Selection spans third heading's content (does not include third heading's
    // children).
    {
      testName: "multipleStyledText",
      startPos: 165,
      endPos: 182,
    },
    // Selection spans the image block content.
    {
      testName: "image",
      startPos: 185,
      endPos: 186,
    },
    // Selection spans from start of third heading to end of it's last
    // descendant.
    {
      testName: "nestedImage",
      startPos: 165,
      endPos: 205,
    },
    // Selection spans text in first cell of the table.
    {
      testName: "tableCellText",
      startPos: 216,
      endPos: 226,
    },
    // Selection spans first cell of the table.
    {
      testName: "tableCell",
      startPos: 215,
      endPos: 227,
    },
    // Selection spans first row of the table.
    {
      testName: "tableRow",
      startPos: 229,
      endPos: 241,
    },
    // Selection spans all cells of the table.
    {
      testName: "tableAllCells",
      startPos: 259,
      endPos: 271,
    },
  ];

  for (const testCase of testCases) {
    it(`${testCase.testName}`, () => {
      testSelection(testCase.testName, testCase.startPos, testCase.endPos);
    });
  }
});
