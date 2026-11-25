import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";

import { partialBlockToBlockForTesting } from "../../commands/node/formatConversion.js";
import { testDocumentBlocks } from "./testDocumentBlocks.js";

// The static editor and exporter baselines deliberately use the same input
// so a rendering difference isn't caused by different test data. Keep
// documents that exercise only one behavior in the test that needs them.
const testDocumentSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageBreak: createPageBreakBlockSpec(),
  },
});

// Keep this fixture independent of the multi-column implementation. The
// conversion below only reads each block type's `content` kind and prop
// defaults, so the two entries are declared by hand to match the configs of
// `ColumnBlock` / `ColumnListBlock`. Exported so xl-multi-column's tests can
// guard against drift from the real specs (see `testDocumentSchema.test` in
// that package).
//
// The columns are layout blocks: every exporter maps them with
// `{ withChildren }`, so the mapping places their children. The exporters'
// snapshot tests of this document check that each exporter gives the
// children to the mapping and does not also place them after the block. An
// exporter's custom blocks need no test of their own for this: the exporter
// handles every `{ withChildren }` mapping the same (`placesChildren`).
export const columnBlockSchema: {
  column: {
    type: "column";
    content: "none";
    propSchema: { width: { default: number } };
  };
  columnList: {
    type: "columnList";
    content: "none";
    propSchema: Record<string, never>;
  };
} = {
  column: {
    type: "column",
    content: "none",
    propSchema: { width: { default: 1 } },
  },
  columnList: {
    type: "columnList",
    content: "none",
    propSchema: {},
  },
};

const testDocumentBlockSchema = {
  ...testDocumentSchema.blockSchema,
  ...columnBlockSchema,
};

// TODO: Update tests that use this to the new format and remove
export const testDocument = testDocumentBlocks.map((partialBlock) =>
  partialBlockToBlockForTesting<
    typeof testDocumentBlockSchema,
    typeof testDocumentSchema.inlineContentSchema,
    typeof testDocumentSchema.styleSchema
  >(
    testDocumentBlockSchema,
    partialBlock as any,
    testDocumentSchema.inlineContentSchema,
  ),
);

// The base schema lacks the math and diagram specs. The exporters only need
// their block JSON, so these blocks are hand-built.
//
// These are kept OUT of the base `testDocument` and exposed via
// `testDocumentWithSourceBlocks` below, because `testDocument` is also consumed
// by e2e tests whose editor schema does not register these block types. Only
// exporter tests opt in to the extended document.
const sourceBlocksForTesting = [
  {
    id: "math-block",
    type: "mathBlock",
    props: {},
    content: [{ type: "text", text: "a^2 = \\sqrt{b^2 + c^2}", styles: {} }],
    children: [],
  },
  {
    id: "paragraph-with-inline-math",
    type: "paragraph",
    props: {
      backgroundColor: "default",
      textColor: "default",
      textAlignment: "left",
    },
    content: [
      { type: "text", text: "Inline math: ", styles: {} },
      {
        type: "math",
        props: {},
        content: "e^{i\\pi} + 1 = 0",
      },
    ],
    children: [],
  },
  {
    id: "diagram-block",
    type: "diagram",
    props: {},
    content: [
      {
        type: "text",
        text: "graph TD\n  A[Start] --> B[End]",
        styles: {},
      },
    ],
    children: [],
  },
] as unknown as typeof testDocument;

/**
 * `testDocument` plus the math / inline-math / diagram blocks whose specs live
 * in separate packages. Used by the exporter tests (which serialize raw block
 * JSON via their default mappings and so don't need the runtime specs). The
 * source blocks are appended at the end, so exporter snapshots are unaffected.
 */
export const testDocumentWithSourceBlocks = [
  ...testDocument,
  ...sourceBlocksForTesting,
] as typeof testDocument;
