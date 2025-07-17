import {
  BlockNoteSchema,
  createBlockSpec,
  createInlineContentSpec,
  createStyleSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
  PageBreak,
} from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { Text } from "@react-pdf/renderer";
import { testDocument } from "@shared/testDocument.js";
import reactElementToJSXString from "react-element-to-jsx-string";
import { describe, expect, it } from "vitest";
import { pdfDefaultSchemaMappings } from "./defaultSchema/index.js";
import { PDFExporter } from "./pdfExporter.js";
import { partialBlocksToBlocksForTesting } from "@shared/formatConversionTestUtil.js";
// import * as ReactPDF from "@react-pdf/renderer";
// expect.extend({ toMatchImageSnapshot });
// import { toMatchImageSnapshot } from "jest-image-snapshot";
// import { pdf } from "pdf-to-img";

describe("exporter", () => {
  it("typescript: schema with extra block", async () => {
    // const exporter = createPdfExporterForDefaultSchema();
    // const ps = exporter.transform(testDocument);

    const schema = BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        pageBreak: PageBreak,
        column: ColumnBlock,
        columnList: ColumnListBlock,
        extraBlock: createBlockSpec(
          {
            content: "none",
            type: "extraBlock",
            propSchema: {},
          },
          {} as any,
        ),
      },
    });

    new PDFExporter(
      schema,
      // @ts-expect-error
      pdfDefaultSchemaMappings,
    );

    new PDFExporter(schema, {
      // @ts-expect-error
      blockMapping: pdfDefaultSchemaMappings.blockMapping,
      inlineContentMapping: pdfDefaultSchemaMappings.inlineContentMapping,
      styleMapping: pdfDefaultSchemaMappings.styleMapping,
    });

    new PDFExporter(schema, {
      blockMapping: {
        ...pdfDefaultSchemaMappings.blockMapping,
        extraBlock: (_b, _t) => {
          throw new Error("sdf");
        },
      },
      inlineContentMapping: pdfDefaultSchemaMappings.inlineContentMapping,
      styleMapping: pdfDefaultSchemaMappings.styleMapping,
    });
  });

  it("typescript: schema with extra inline content", async () => {
    const schema = BlockNoteSchema.create({
      inlineContentSpecs: {
        ...defaultInlineContentSpecs,
        extraInlineContent: createInlineContentSpec(
          {
            type: "extraInlineContent",
            content: "styled",
            propSchema: {},
          },
          {} as any,
        ),
      },
    });

    new PDFExporter(
      schema,
      // @ts-expect-error
      pdfDefaultSchemaMappings,
    );

    new PDFExporter(schema, {
      blockMapping: pdfDefaultSchemaMappings.blockMapping,
      // @ts-expect-error
      inlineContentMapping: pdfDefaultSchemaMappings.inlineContentMapping,
      styleMapping: pdfDefaultSchemaMappings.styleMapping,
    });

    // no error
    new PDFExporter(schema, {
      blockMapping: pdfDefaultSchemaMappings.blockMapping,
      styleMapping: pdfDefaultSchemaMappings.styleMapping,
      inlineContentMapping: {
        ...pdfDefaultSchemaMappings.inlineContentMapping,
        extraInlineContent: () => {
          throw new Error("extraInlineContent not implemented");
        },
      },
    });
  });

  it("typescript: schema with extra style", async () => {
    const schema = BlockNoteSchema.create({
      styleSpecs: {
        ...defaultStyleSpecs,
        extraStyle: createStyleSpec(
          {
            type: "extraStyle",
            propSchema: "boolean",
          },
          {} as any,
        ),
      },
    });

    new PDFExporter(
      schema,
      // @ts-expect-error
      pdfDefaultSchemaMappings,
    );

    new PDFExporter(schema, {
      blockMapping: pdfDefaultSchemaMappings.blockMapping,
      inlineContentMapping: pdfDefaultSchemaMappings.inlineContentMapping,
      // @ts-expect-error
      styleMapping: pdfDefaultSchemaMappings.styleMapping,
    });

    // no error
    new PDFExporter(schema, {
      blockMapping: pdfDefaultSchemaMappings.blockMapping,
      inlineContentMapping: pdfDefaultSchemaMappings.inlineContentMapping,
      styleMapping: {
        ...pdfDefaultSchemaMappings.styleMapping,
        extraStyle: () => {
          throw new Error("extraStyle not implemented");
        },
      },
    });
  });

  it("typescript: schema with block and style removed", async () => {
    const schema = BlockNoteSchema.create({
      blockSpecs: {},
      styleSpecs: {},
    });

    // still works (no error)
    new PDFExporter(schema, pdfDefaultSchemaMappings);
  });

  it("should export a document", async () => {
    const exporter = new PDFExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: PageBreak,
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
          pageBreak: PageBreak,
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
  it("should export a document with a multi-column block", async () => {
    const schema = BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        pageBreak: PageBreak,
        column: ColumnBlock,
        columnList: ColumnListBlock,
      },
    });
    const exporter = new PDFExporter(schema, pdfDefaultSchemaMappings);
    const transformed = await exporter.toReactPDFDocument(
      partialBlocksToBlocksForTesting(schema, [
        {
          type: "columnList",
          children: [
            {
              type: "column",
              props: {
                width: 0.8,
              },
              children: [
                {
                  type: "paragraph",
                  content: "This paragraph is in a column!",
                },
              ],
            },
            {
              type: "column",
              props: {
                width: 1.4,
              },
              children: [
                {
                  type: "heading",
                  content: "So is this heading!",
                },
              ],
            },
            {
              type: "column",
              props: {
                width: 0.8,
              },
              children: [
                {
                  type: "paragraph",
                  content: "You can have multiple blocks in a column too",
                },
                {
                  type: "bulletListItem",
                  content: "Block 1",
                },
                {
                  type: "bulletListItem",
                  content: "Block 2",
                },
                {
                  type: "bulletListItem",
                  content: "Block 3",
                },
              ],
            },
          ],
        },
      ]),
    );
    const str = reactElementToJSXString(transformed);

    await expect(str).toMatchFileSnapshot(
      "__snapshots__/exampleWithMultiColumn.jsx",
    );
  });
});
