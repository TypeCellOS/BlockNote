import {
  BlockNoteSchema,
  createBlockSpec,
  createInlineContentSpec,
  createStyleSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import ReactPDF from "@react-pdf/renderer";
import { describe, it } from "vitest";
import { testDocument } from "../testDocument.js";
import { pdfDefaultSchemaMappings } from "./defaultSchema/index.js";
import { PDFExporter } from "./pdfExporter.js";

describe("exporter", () => {
  it("typescript: schema with extra block", async () => {
    // const exporter = createPdfExporterForDefaultSchema();
    // const ps = exporter.transform(testDocument);

    const schema = BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        extraBlock: createBlockSpec(
          {
            content: "none",
            type: "extraBlock",
            propSchema: {},
          },
          {} as any
        ),
      },
    });

    new PDFExporter(
      schema,
      // @ts-expect-error
      pdfDefaultSchemaMappings
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
        extraBlock: () => {
          throw new Error("extraBlock not implemented");
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
          {} as any
        ),
      },
    });

    new PDFExporter(
      schema,
      // @ts-expect-error
      pdfDefaultSchemaMappings
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
          {} as any
        ),
      },
    });

    new PDFExporter(
      schema,
      // @ts-expect-error
      pdfDefaultSchemaMappings
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
    // const exporter = createPdfExporterForDefaultSchema();
    // const ps = exporter.transform(testDocument);

    const exporter = new PDFExporter(
      BlockNoteSchema.create(),
      pdfDefaultSchemaMappings
    );

    const transformed = exporter.toReactPDFDocument(testDocument);

    await ReactPDF.render(transformed, `${__dirname}/example.pdf`);
  });
});
