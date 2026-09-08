import {
  BlockNoteSchema,
  createBlockSpec,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { testODTDocumentAgainstSnapshot } from "@shared/util/odtTestUtil.js";
import { partialBlocksToBlocksForTesting } from "@shared/formatConversionTestUtil.js";
import { BlobReader, FileEntry, TextWriter, ZipReader } from "@zip.js/zip.js";
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

describe("custom container blocks", () => {
  // A minimal custom container, standing in for a callout/card:
  // content-less, holding child blocks. Its mapping is what has to place
  // them (mirrors the typst/docx exporters' `box` fixture).
  const Box = createBlockSpec(
    {
      type: "box" as const,
      propSchema: {},
      content: "none",
      children: { allow: "blocks" },
    },
    {
      render: (block: any) => {
        const dom = document.createElement("div");
        dom.setAttribute("data-node-type", "box");
        dom.setAttribute("data-id", block.id);
        return { dom, contentDOM: dom };
      },
    },
  )();

  const boxSchema = BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      box: Box,
    },
  });

  const boxDocument = partialBlocksToBlocksForTesting(boxSchema, [
    {
      type: "box",
      children: [
        { type: "paragraph", content: "First" },
        { type: "paragraph", content: "Second" },
      ],
    },
  ] as any);

  it("throws a clear error for an unmapped container block", async () => {
    const exporter = new ODTExporter(
      boxSchema,
      odtDefaultSchemaMappings as any,
      { resolveFileUrl: testResolveFileUrl },
    );

    await expect(exporter.transformBlocks(boxDocument as any)).rejects.toThrow(
      /container block type "box"/,
    );
  });
});

describe("titled blocks", () => {
  // A titled block: inline content (the title) plus children (the body). The
  // mapping renders the title and places the children inside its own
  // section; because the block counts as a container, transformBlocks must
  // not append them after it as tab-indented siblings.
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

  it("renders a titled block's title and places its children inside", async () => {
    const exporter = new ODTExporter(
      alertSchema,
      {
        ...odtDefaultSchemaMappings,
        blockMapping: {
          ...odtDefaultSchemaMappings.blockMapping,
          alert: (
            block: any,
            exporter: any,
            _nesting: any,
            _index: any,
            children: any,
          ) =>
            createElement(
              "text:section",
              { "text:name": "alert-body" },
              createElement(
                "text:p",
                null,
                "ALERT:",
                ...exporter.transformInlineContent(block.content),
              ),
              ...((children ?? []) as any[]),
            ),
        },
      } as any,
      { resolveFileUrl: testResolveFileUrl },
    );

    const odt = await exporter.toODTDocument(alertDocument as any);
    const entries = await new ZipReader(new BlobReader(odt)).getEntries();
    const contentEntry = entries.find(
      (entry) => entry.filename === "content.xml",
    ) as FileEntry;
    expect(contentEntry).toBeDefined();
    const xml = await contentEntry.getData(new TextWriter());

    // Title and children all sit inside the mapping's own section - placed
    // by the mapping, not appended after it.
    const sectionOpen = xml.indexOf("<text:section");
    const sectionClose = xml.indexOf("</text:section>");
    expect(sectionOpen).toBeGreaterThan(-1);
    const titleIdx = xml.indexOf("Heads up");
    expect(titleIdx).toBeGreaterThan(sectionOpen);
    const firstIdx = xml.indexOf(">First<");
    expect(firstIdx).toBeGreaterThan(titleIdx);
    const secondIdx = xml.indexOf(">Second<");
    expect(secondIdx).toBeGreaterThan(firstIdx);
    expect(secondIdx).toBeLessThan(sectionClose);
  });
});
