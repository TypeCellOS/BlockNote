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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pdfDefaultSchemaMappings } from "./defaultSchema/index.js";
import {
  PDFExporter,
  DEFAULT_EMOJI_CDN,
  createNativeEmojiSource,
} from "./pdfExporter.js";
import { partialBlocksToBlocksForTesting } from "@shared/formatConversionTestUtil.js";
// import * as ReactPDF from "@react-pdf/renderer";
// expect.extend({ toMatchImageSnapshot });
// import { toMatchImageSnapshot } from "jest-image-snapshot";
// import { pdf } from "pdf-to-img";

describe("BLO-940: emojis unsupported by twemoji", () => {
  it("should use a twemoji CDN that supports modern emojis like 🙋 and 🚶‍♀️", async () => {
    const schema = BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        pageBreak: createPageBreakBlockSpec(),
        column: ColumnBlock,
        columnList: ColumnListBlock,
      },
    });
    const exporter = new PDFExporter(schema, pdfDefaultSchemaMappings);

    // These emojis are NOT available in twemoji v14.0.2 (the current default CDN)
    // 🙋 = U+1F64B (person raising hand)
    // 🚶‍♀️ = U+1F6B6 U+200D U+2640 U+FE0F (woman walking)
    const blocks = partialBlocksToBlocksForTesting(schema, [
      {
        type: "paragraph",
        content: "Hello 🙋 and 🚶‍♀️",
      },
    ]);

    const transformed = await exporter.toReactPDFDocument(blocks);
    const str = reactElementToJSXString(transformed);

    // Verify the emojis are present in the output
    expect(str).toContain("🙋");
    expect(str).toContain("🚶");

    // The default emojiSource should point to a CDN that supports these emojis
    // With twemoji v14.0.2, these would 404. The CDN URL should be updated.
    const emojiSourceUrl = exporter.options.emojiSource;
    expect(emojiSourceUrl).not.toBe(false);
    if (emojiSourceUrl !== false) {
      // Should NOT be using the old twemoji v14.0.2 CDN
      expect(emojiSourceUrl.url).not.toContain("twemoji/14.0.2");
    }
  });

  it("should allow disabling emoji source with emojiSource: false", () => {
    const schema = BlockNoteSchema.create();
    const exporter = new PDFExporter(schema, pdfDefaultSchemaMappings, {
      emojiSource: false,
    });
    expect(exporter.options.emojiSource).toBe(false);
  });

  it("should export DEFAULT_EMOJI_CDN pointing to jdecked/twemoji v15", () => {
    expect(DEFAULT_EMOJI_CDN).toContain("jdecked/twemoji");
    expect(DEFAULT_EMOJI_CDN).toContain("15.1.0");
  });
});

describe("createNativeEmojiSource", () => {
  const FAKE_DATA_URL = "data:image/png;base64,fakedata";

  beforeEach(() => {
    // jsdom doesn't support Canvas, so we mock it
    const mockCtx = {
      font: "",
      textBaseline: "",
      fillText: vi.fn(),
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toDataURL: vi.fn(() => FAKE_DATA_URL),
    };
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") {
        return mockCanvas as unknown as HTMLCanvasElement;
      }
      return document.createElementNS(
        "http://www.w3.org/1999/xhtml",
        tag,
      ) as HTMLElement;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return an emoji source with format 'png' and a builder function", () => {
    const source = createNativeEmojiSource();
    expect(source.format).toBe("png");
    expect(typeof source.builder).toBe("function");
  });

  it("should generate a data URL from an emoji codepoint", () => {
    const source = createNativeEmojiSource(32);
    const result = source.builder("1f600");
    expect(result).toBe(FAKE_DATA_URL);
  });

  it("should cache results for repeated calls", () => {
    const source = createNativeEmojiSource(32);
    const first = source.builder("1f600");
    const second = source.builder("1f600");
    expect(first).toBe(second);
    // createElement should only be called once for the same code
    expect(document.createElement).toHaveBeenCalledTimes(1);
  });

  it("should handle multi-codepoint emojis", () => {
    const source = createNativeEmojiSource(32);
    // 🚶‍♀️ = U+1F6B6 U+200D U+2640 U+FE0F
    const result = source.builder("1f6b6-200d-2640-fe0f");
    expect(result).toBe(FAKE_DATA_URL);
  });

  it("should be usable as an emojiSource option for PDFExporter", () => {
    const schema = BlockNoteSchema.create();
    const source = createNativeEmojiSource();
    const exporter = new PDFExporter(schema, pdfDefaultSchemaMappings, {
      emojiSource: source,
    });
    expect(exporter.options.emojiSource).toBe(source);
  });
});

describe("exporter", () => {
  it("typescript: schema with extra block", async () => {
    // const exporter = createPdfExporterForDefaultSchema();
    // const ps = exporter.transform(testDocument);

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
