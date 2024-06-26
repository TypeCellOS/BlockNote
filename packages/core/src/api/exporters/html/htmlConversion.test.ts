import { Fragment } from "prosemirror-model";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor";

import { addIdsToBlocks, partialBlocksToBlocksForTesting } from "../../..";
import { PartialBlock } from "../../../blocks/defaultBlocks";
import { BlockSchema } from "../../../schema/blocks/types";
import { InlineContentSchema } from "../../../schema/inlineContent/types";
import { StyleSchema } from "../../../schema/styles/types";
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
    editor.schema.blockSchema,
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
    it("Selection within a block's children", () => {
      // Fragment created when the selection starts and ends within a block's
      // children.
      const copiedFragment = Fragment.from(
        editor._tiptapEditor.schema.nodes["blockGroup"].create(
          null,
          editor._tiptapEditor.schema.nodes["blockContainer"].create(
            null,
            editor._tiptapEditor.schema.nodes["blockGroup"].create(null, [
              editor._tiptapEditor.schema.nodes["blockContainer"].create(
                null,
                editor._tiptapEditor.schema.nodes["paragraph"].create(
                  null,
                  editor._tiptapEditor.schema.text("Nested Paragraph 1")
                )
              ),
              editor._tiptapEditor.schema.nodes["blockContainer"].create(
                null,
                editor._tiptapEditor.schema.nodes["paragraph"].create(
                  null,
                  editor._tiptapEditor.schema.text("Nested Paragraph 2")
                )
              ),
              editor._tiptapEditor.schema.nodes["blockContainer"].create(
                null,
                editor._tiptapEditor.schema.nodes["paragraph"].create(
                  null,
                  editor._tiptapEditor.schema.text("Nested Paragraph 3")
                )
              ),
            ])
          )
        )
      );

      const exporter = createExternalHTMLExporter(
        editor._tiptapEditor.schema,
        editor
      );
      const externalHTML = exporter.exportProseMirrorFragment(copiedFragment);
      expect(externalHTML).toMatchFileSnapshot(
        "./__snapshots_fragment_edge_cases__/" +
          "selectionWithinBlockChildren.html"
      );
    });

    it("Selection leaves a block's children", () => {
      // Fragment created when the selection starts within a block's children and
      // ends outside, at a shallower nesting level.
      const copiedFragment = Fragment.from(
        editor._tiptapEditor.schema.nodes["blockGroup"].create(null, [
          editor._tiptapEditor.schema.nodes["blockContainer"].create(
            null,
            editor._tiptapEditor.schema.nodes["blockGroup"].create(null, [
              editor._tiptapEditor.schema.nodes["blockContainer"].create(
                null,
                editor._tiptapEditor.schema.nodes["paragraph"].create(
                  null,
                  editor._tiptapEditor.schema.text("Nested Paragraph 1")
                )
              ),
              editor._tiptapEditor.schema.nodes["blockContainer"].create(
                null,
                editor._tiptapEditor.schema.nodes["paragraph"].create(
                  null,
                  editor._tiptapEditor.schema.text("Nested Paragraph 2")
                )
              ),
              editor._tiptapEditor.schema.nodes["blockContainer"].create(
                null,
                editor._tiptapEditor.schema.nodes["paragraph"].create(
                  null,
                  editor._tiptapEditor.schema.text("Nested Paragraph 3")
                )
              ),
            ])
          ),
          editor._tiptapEditor.schema.nodes["blockContainer"].create(
            null,
            editor._tiptapEditor.schema.nodes["paragraph"].create(
              null,
              editor._tiptapEditor.schema.text("Paragraph 2")
            )
          ),
        ])
      );

      const exporter = createExternalHTMLExporter(
        editor._tiptapEditor.schema,
        editor
      );
      const externalHTML = exporter.exportProseMirrorFragment(copiedFragment);
      expect(externalHTML).toMatchFileSnapshot(
        "./__snapshots_fragment_edge_cases__/" +
          "selectionLeavesBlockChildren.html"
      );
    });

    it("Selection spans multiple blocks' children", () => {
      // Fragment created when the selection starts within a block's children
      // and ends in a different block's children, at the same nesting level.
      const copiedFragment = Fragment.from(
        editor._tiptapEditor.schema.nodes["blockGroup"].create(null, [
          editor._tiptapEditor.schema.nodes["blockContainer"].create(
            null,
            editor._tiptapEditor.schema.nodes["blockGroup"].create(null, [
              editor._tiptapEditor.schema.nodes["blockContainer"].create(
                null,
                editor._tiptapEditor.schema.nodes["paragraph"].create(
                  null,
                  editor._tiptapEditor.schema.text("Nested Paragraph 1")
                )
              ),
              editor._tiptapEditor.schema.nodes["blockContainer"].create(
                null,
                editor._tiptapEditor.schema.nodes["paragraph"].create(
                  null,
                  editor._tiptapEditor.schema.text("Nested Paragraph 2")
                )
              ),
              editor._tiptapEditor.schema.nodes["blockContainer"].create(
                null,
                editor._tiptapEditor.schema.nodes["paragraph"].create(
                  null,
                  editor._tiptapEditor.schema.text("Nested Paragraph 3")
                )
              ),
            ])
          ),
          editor._tiptapEditor.schema.nodes["blockContainer"].create(null, [
            editor._tiptapEditor.schema.nodes["paragraph"].create(
              null,
              editor._tiptapEditor.schema.text("Paragraph 2")
            ),
            editor._tiptapEditor.schema.nodes["blockGroup"].create(null, [
              editor._tiptapEditor.schema.nodes["blockContainer"].create(
                null,
                editor._tiptapEditor.schema.nodes["paragraph"].create(
                  null,
                  editor._tiptapEditor.schema.text("Nested Paragraph 1")
                )
              ),
              editor._tiptapEditor.schema.nodes["blockContainer"].create(
                null,
                editor._tiptapEditor.schema.nodes["paragraph"].create(
                  null,
                  editor._tiptapEditor.schema.text("Nested Paragraph 1")
                )
              ),
              editor._tiptapEditor.schema.nodes["blockContainer"].create(
                null,
                editor._tiptapEditor.schema.nodes["paragraph"].create(
                  null,
                  editor._tiptapEditor.schema.text("Nested Paragraph 1")
                )
              ),
            ]),
          ]),
        ])
      );

      const exporter = createExternalHTMLExporter(
        editor._tiptapEditor.schema,
        editor
      );
      const externalHTML = exporter.exportProseMirrorFragment(copiedFragment);
      expect(externalHTML).toMatchFileSnapshot(
        "./__snapshots_fragment_edge_cases__/" +
          "selectionSpansBlocksChildren.html"
      );
    });
  });
});
