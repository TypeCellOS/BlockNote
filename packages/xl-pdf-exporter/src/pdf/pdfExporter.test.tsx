import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { Text } from "@react-pdf/renderer";
import { testDocument } from "@shared/testDocument.js";
import reactElementToJSXString from "react-element-to-jsx-string";
import { describe, expect, it } from "vite-plus/test";
import { pdfDefaultSchemaMappings } from "./defaultSchema/index.js";
import { PDFExporter } from "./pdfExporter.js";
// import * as ReactPDF from "@react-pdf/renderer";
// expect.extend({ toMatchImageSnapshot });
// import { toMatchImageSnapshot } from "jest-image-snapshot";
// import { pdf } from "pdf-to-img";

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
