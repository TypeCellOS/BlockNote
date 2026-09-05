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
          column: ColumnBlock,
          columnList: ColumnListBlock,
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
            column: ColumnBlock,
            columnList: ColumnListBlock,
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
