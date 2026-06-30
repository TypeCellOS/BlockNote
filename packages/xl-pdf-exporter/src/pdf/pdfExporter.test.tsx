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

    // would be nice to compare pdf images, but currently doesn't work on mac os (due to node canvas installation issue)

    // await ReactPDF.render(transformed, `${__dirname}/example.pdf`);
    // eslint-disable-next-line
    // const b = await ReactPDF(transformed);

    // await toMatchBinaryFileSnapshot(b, `__snapshots__/example.pdf`);
    // expect(b.toString("utf-8")).toMatchFileSnapshot(
    //   `__snapshots__/example.pdf`
    // );
    // const doc = await pdf(`${__dirname}/example.pdf`);

    // // expect(doc.length).toBe(2);
    // // expect(doc.metadata).toEqual({ ... });

    // for await (const page of doc) {
    //   expect(page).toMatchImageSnapshot();
    // }
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

    // await ReactPDF.render(
    //   transformed,
    //   `${__dirname}/exampleWithHeaderAndFooter.pdf`
    // );
  });
});
