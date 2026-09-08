import {
  BlockNoteSchema,
  createBlockSpec,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { Text, View } from "@react-pdf/renderer";
import { partialBlocksToBlocksForTesting } from "@shared/formatConversionTestUtil.js";
import { testDocument } from "@shared/testDocument.js";
import { Fragment } from "react";
import reactElementToJSXString from "react-element-to-jsx-string";
import { describe, expect, it } from "vite-plus/test";
import { pdfDefaultSchemaMappings } from "./defaultSchema/index.js";
import { PDFExporter } from "./pdfExporter.js";
describe("exporter", () => {
  it("should export a document", async () => {
    const exporter = new PDFExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
          column: ColumnBlock,
          columnList: ColumnListBlock,
        },
      }),
      pdfDefaultSchemaMappings,
    );

    const transformed = await exporter.toReactPDFDocument(testDocument);
    const str = reactElementToJSXString(transformed);

    await expect(str).toMatchFileSnapshot("__snapshots__/example.jsx");

    // Visual verification of an actually produced PDF lives in the browser
    // suite (tests/src/end-to-end/exporters/exporterImages.test.tsx), which
    // renders the file's pages with pdf.js and screenshots them - possible
    // there because a real browser needs no native canvas dependencies,
    // which is what blocked doing this in Node.
  });

  it("should export a document with header and footer", async () => {
    const exporter = new PDFExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
          column: ColumnBlock,
          columnList: ColumnListBlock,
        },
      }),
      pdfDefaultSchemaMappings,
    );

    const transformed = await exporter.toReactPDFDocument(testDocument, {
      header: <Text>Header</Text>,
      footer: <Text>Footer</Text>,
    });
    const str = reactElementToJSXString(transformed);
    await expect(str).toMatchFileSnapshot(
      "__snapshots__/exampleWithHeaderAndFooter.jsx",
    );
  });
});

describe("titled blocks", () => {
  // A titled block: inline content (the title) plus children (the body). The
  // mapping renders the title and places the children inside its own view;
  // because the block counts as a container, transformBlocks must not wrap
  // them after it in padded sibling views.
  const Alert = createBlockSpec(
    {
      type: "alert" as const,
      propSchema: {},
      content: "inline",
      children: { allow: "blocks" },
    },
    {
      render: (block: any) => {
        const dom = document.createElement("div");
        dom.setAttribute("data-node-type", "alert");
        dom.setAttribute("data-id", block.id);
        return { dom, contentDOM: dom };
      },
      renderFrame: (_block: any) => {
        const dom = document.createElement("div");
        dom.className = "alert-box";
        return { dom, slot: dom };
      },
    },
  )();

  const alertSchema = BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      alert: Alert,
    },
  });

  const alertDocument = partialBlocksToBlocksForTesting(alertSchema, [
    {
      type: "alert",
      content: "Heads up",
      children: [
        { type: "paragraph", content: "First" },
        { type: "paragraph", content: "Second" },
      ],
    },
  ] as any);

  it("throws a clear error for an unmapped container block", async () => {
    const exporter = new PDFExporter(
      alertSchema,
      pdfDefaultSchemaMappings as any,
    );

    await expect(
      exporter.transformBlocks(alertDocument as any),
    ).rejects.toThrow(/container block type "alert"/);
  });

  it("renders a titled block's title and places its children inside", async () => {
    const exporter = new PDFExporter(alertSchema, {
      ...pdfDefaultSchemaMappings,
      blockMapping: {
        ...pdfDefaultSchemaMappings.blockMapping,
        alert: (
          block: any,
          exporter: any,
          _nestingLevel: any,
          _numberedListIndex: any,
          children: any,
        ) => (
          <View>
            <Text>ALERT:{exporter.transformInlineContent(block.content)}</Text>
            {children}
          </View>
        ),
      },
    } as any);

    const transformed = await exporter.transformBlocks(alertDocument as any);
    const str = reactElementToJSXString(
      <Fragment>{transformed as any}</Fragment>,
    );

    // The mapping's own view holds the title and both children - the block
    // took the container branch, so no marginLeft wrapper view was added
    // around the children (react-element-to-jsx-string prints the primitives
    // upper case, as in the document snapshots). The children themselves
    // arrive pre-wrapped in their usual padded views, exactly as column
    // children do.
    expect(str).not.toContain("marginLeft");
    const titleIdx = str.indexOf("Heads up");
    expect(titleIdx).toBeGreaterThan(-1);
    expect(str.indexOf("First")).toBeGreaterThan(titleIdx);
    expect(str).toContain("Second");
  });
});
