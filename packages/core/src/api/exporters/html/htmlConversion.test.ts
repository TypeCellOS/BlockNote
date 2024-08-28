import { TextSelection } from "prosemirror-state";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

// Fragments created from ProseMirror selections don't always conform to the
// schema. This is because ProseMirror preserves the full ancestry of selected
// nodes, but not the siblings of ancestor nodes. These tests are to verify that
// Fragments like this are exported to HTML properly, as they can't be created
// from Block objects like all the other test cases (Block object conversions
// always conform to the schema).
describe("Test ProseMirror fragment edge case conversion", () => {
  let editor: BlockNoteEditor;
  const div = document.createElement("div");
  beforeEach(() => {
    editor = BlockNoteEditor.create();
    editor.mount(div);
  });

  afterEach(() => {
    editor.mount(undefined);
    editor._tiptapEditor.destroy();
    editor = undefined as any;

    delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
  });

  // When the selection starts in a nested block, the Fragment from it omits the
  // `blockContent` node of the parent `blockContainer` if it's not also
  // included in the selection. In the schema, `blockContainer` nodes should
  // contain a single `blockContent` node, so this edge case needs to be tested.
  describe("No block content", () => {
    const blocks: PartialBlock[] = [
      {
        type: "paragraph",
        content: "Paragraph 1",
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
        type: "paragraph",
        content: "Paragraph 2",
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
    ];

    beforeEach(() => {
      editor.replaceBlocks(editor.document, blocks);
    });

    it("Selection within a block's children", async () => {
      // Selection starts and ends within the first block's children.
      editor.dispatch(
        editor._tiptapEditor.state.tr.setSelection(
          TextSelection.create(editor._tiptapEditor.state.doc, 18, 80)
        )
      );

      const copiedFragment =
        editor._tiptapEditor.state.selection.content().content;

      await initializeESMDependencies();
      const exporter = createExternalHTMLExporter(editor.pmSchema, editor);
      const externalHTML = exporter.exportProseMirrorFragment(
        copiedFragment,
        {}
      );
      expect(externalHTML).toMatchFileSnapshot(
        "./__snapshots_fragment_edge_cases__/" +
          "selectionWithinBlockChildren.html"
      );
    });

    it("Selection leaves a block's children", async () => {
      // Selection starts and ends within the first block's children and ends
      // outside, at a shallower nesting level in the second block.
      editor.dispatch(
        editor._tiptapEditor.state.tr.setSelection(
          TextSelection.create(editor._tiptapEditor.state.doc, 18, 97)
        )
      );

      const copiedFragment =
        editor._tiptapEditor.state.selection.content().content;

      await initializeESMDependencies();
      const exporter = createExternalHTMLExporter(editor.pmSchema, editor);
      const externalHTML = exporter.exportProseMirrorFragment(
        copiedFragment,
        {}
      );
      expect(externalHTML).toMatchFileSnapshot(
        "./__snapshots_fragment_edge_cases__/" +
          "selectionLeavesBlockChildren.html"
      );
    });

    it("Selection spans multiple blocks' children", async () => {
      // Selection starts and ends within the first block's children and ends
      // within the second block's children.
      editor.dispatch(
        editor._tiptapEditor.state.tr.setSelection(
          TextSelection.create(editor._tiptapEditor.state.doc, 18, 163)
        )
      );

      const copiedFragment =
        editor._tiptapEditor.state.selection.content().content;
      await initializeESMDependencies();
      const exporter = createExternalHTMLExporter(editor.pmSchema, editor);
      const externalHTML = exporter.exportProseMirrorFragment(
        copiedFragment,
        {}
      );
      expect(externalHTML).toMatchFileSnapshot(
        "./__snapshots_fragment_edge_cases__/" +
          "selectionSpansBlocksChildren.html"
      );
    });
  });
});
