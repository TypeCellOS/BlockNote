import {
  BlockNoteSchema,
  createBlockSpec,
  createInlineContentSpec,
  createPageBreakBlockSpec,
  createStyleSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { Text } from "@react-pdf/renderer";
import { testDocument } from "@shared/testDocument.js";
import reactElementToJSXString from "react-element-to-jsx-string";
import { describe, expect, it } from "vite-plus/test";
import { pdfDefaultSchemaMappings } from "./defaultSchema/index.js";
import { PDFExporter } from "./pdfExporter.js";
import { partialBlocksToBlocksForTesting } from "@shared/formatConversionTestUtil.js";

describe("exporter", () => {
  it("typescript: schema with extra block", async () => {
    const schema = BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        pageBreak: createPageBreakBlockSpec(),
        column: ColumnBlock,
        columnList: ColumnListBlock,
        extraBlock: createBlockSpec(
          {
            content: "none",
            type: "extraBlock",
            propSchema: {},
          },
          {} as any,
        )(),
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
  it("should export a document with a multi-column block", async () => {
    const schema = BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        pageBreak: createPageBreakBlockSpec(),
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
