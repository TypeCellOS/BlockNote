import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";

import { partialBlockToBlockForTesting } from "./formatConversionTestUtil.js";
import { testDocumentBlocks } from "./testDocumentBlocks.js";

// Re-exported so existing imports of `testDocumentBlocks` from this module keep
// working. The data itself lives in the self-contained `testDocumentBlocks.ts`
// so the example generator can copy it verbatim into the playground examples.
export { testDocumentBlocks };

const testDocumentSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageBreak: createPageBreakBlockSpec(),
  },
});

// The document contains multi-column blocks, but `shared` can't depend on
// `@blocknote/xl-multi-column` for their specs — it dev-depends on `shared`,
// which would be a workspace build cycle. The conversion below only reads each
// block type's `content` kind and prop defaults, so the two entries are
// declared by hand instead, typed to structurally match the configs of
// `ColumnBlock` / `ColumnListBlock`. Exported so xl-multi-column's tests can
// guard against drift from the real specs (see `testDocumentSchema.test` in
// that package).
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

// Math, inline math & diagram blocks. Their specs live in separate packages
// (`@blocknote/math-block`, `@blocknote/diagram-block`) that `shared` doesn't
// depend on, so they're hand-built (rather than via
// `partialBlocksToBlocksForTesting`) — the exporters only need the block JSON.
//
// These are kept OUT of the base `testDocument` and exposed via
// `testDocumentWithSourceBlocks` below, because `testDocument` is also consumed
// by the suggestion-gallery example / e2e tests, whose editor schema does NOT
// register these block types — seeding them there throws "schema.nodes[...] is
// undefined". Only the exporters (which map the raw block JSON and don't need
// the runtime specs) opt in to the extended document.
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
