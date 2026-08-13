import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { testODTDocumentAgainstSnapshot } from "@shared/util/odtTestUtil.js";
import { testDocument } from "@shared/testDocument.js";
import { beforeAll, describe, expect, it } from "vite-plus/test";
import { createElement } from "react";
import { odtDefaultSchemaMappings } from "./defaultSchema/index.js";
import { ODTExporter } from "./odtExporter.js";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { partialBlocksToBlocksForTesting } from "@shared/formatConversionTestUtil.js";
import { testResolveFileUrl } from "@shared/util/testFileResolver.js";

beforeAll(async () => {
  // @ts-expect-error - Blob polyfill for Node test environment
  globalThis.Blob = (await import("node:buffer")).Blob;
});

describe("exporter", () => {
  it("should export a document", { timeout: 10000 }, async () => {
    const exporter = new ODTExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
        },
      }),
      odtDefaultSchemaMappings,
      { resolveFileUrl: testResolveFileUrl },
    );
    const odt = await exporter.toODTDocument(testDocument);
    await testODTDocumentAgainstSnapshot(odt, {
      styles: "__snapshots__/basic/styles.xml",
      content: "__snapshots__/basic/content.xml",
    });
  });

  it(
    "should export a document with custom document options",
    { timeout: 10000 },
    async () => {
      const exporter = new ODTExporter(
        BlockNoteSchema.create({
          blockSpecs: {
            ...defaultBlockSpecs,
            pageBreak: createPageBreakBlockSpec(),
          },
        }),
        odtDefaultSchemaMappings,
        { resolveFileUrl: testResolveFileUrl },
      );

      const odt = await exporter.toODTDocument(testDocument, {
        footer: "<text:p>FOOTER</text:p>",
        header: new DOMParser().parseFromString(
          `<text:p xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">HEADER</text:p>`,
          "text/xml",
        ),
      });

      await testODTDocumentAgainstSnapshot(odt, {
        styles: "__snapshots__/withCustomOptions/styles.xml",
        content: "__snapshots__/withCustomOptions/content.xml",
      });
    },
  );

  it(
    "should export a document with a multi-column block",
    { timeout: 10000 },
    async () => {
      const schema = BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
          column: ColumnBlock,
          columnList: ColumnListBlock,
        },
      });
      const exporter = new ODTExporter(schema, odtDefaultSchemaMappings, {
        resolveFileUrl: testResolveFileUrl,
      });
      const odt = await exporter.toODTDocument(
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

      await testODTDocumentAgainstSnapshot(odt, {
        styles: "__snapshots__/withMultiColumn/styles.xml",
        content: "__snapshots__/withMultiColumn/content.xml",
      });
    },
  );

  it("deduplicates identical automatic styles", () => {
    const exporter = new ODTExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
        },
      }),
      odtDefaultSchemaMappings,
      { resolveFileUrl: testResolveFileUrl },
    );

    const italic = (name: string) =>
      createElement(
        "style:style",
        { "style:family": "text", "style:name": name },
        createElement("style:text-properties", { "fo:font-style": "italic" }),
      );
    const bold = (name: string) =>
      createElement(
        "style:style",
        { "style:family": "text", "style:name": name },
        createElement("style:text-properties", { "fo:font-weight": "bold" }),
      );

    expect(exporter.registerStyle(italic)).toBe(exporter.registerStyle(italic));
    expect(exporter.registerStyle(italic)).not.toBe(
      exporter.registerStyle(bold),
    );
  });
});
