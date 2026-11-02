import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { Text } from "@react-pdf/renderer";
import { partialBlocksToBlocksForTesting } from "@shared/formatConversionTestUtil.js";
import { testDocument } from "@shared/testDocument.js";
import { testResolveFileUrl } from "@shared/util/testFileResolver.js";
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
      { resolveFileUrl: testResolveFileUrl },
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
      { resolveFileUrl: testResolveFileUrl },
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

  it("should start each numbered list at its start number", async () => {
    const schema = BlockNoteSchema.create();
    const exporter = new PDFExporter(schema, pdfDefaultSchemaMappings, {
      resolveFileUrl: testResolveFileUrl,
    });

    // Like in the editor, the first item of a list sets the number it starts
    // at; a start number on a later item is ignored.
    const transformed = await exporter.toReactPDFDocument(
      partialBlocksToBlocksForTesting(schema, [
        { type: "numberedListItem", content: "five", props: { start: 5 } },
        { type: "numberedListItem", content: "six" },
        { type: "numberedListItem", content: "seven", props: { start: 2 } },
        { type: "paragraph", content: "a paragraph breaks the list" },
        { type: "numberedListItem", content: "one" },
      ]),
    );
    const listMarkers = [
      ...reactElementToJSXString(transformed).matchAll(/listMarker="([^"]*)"/g),
    ].map((match) => match[1]);

    expect(listMarkers).toEqual(["5.", "6.", "7.", "1."]);
  });
});
