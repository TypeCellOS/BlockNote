import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { testDocument } from "../../../../tests/src/fixtures/exporters/testDocument.js";
import { describe, expect } from "vite-plus/test";
import { createElement } from "react";
import { odtDefaultSchemaMappings } from "./defaultSchema/index.js";
import { ODTExporter } from "./odtExporter.js";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";

describe("exporter", () => {
  it(
    "should export a document",
    { timeout: 10000 },
    async ({ testResolveFileUrl, testODTDocumentAgainstSnapshot }) => {
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
    },
  );

  it("passes raw block and inline mapping results to custom mappings", async ({
    partialBlocksToBlocksForTesting,
  }) => {
    const schema = BlockNoteSchema.create();
    const child = createElement("text:p", null, "visible child");
    const parent = createElement("text:section");
    const exporter = new ODTExporter(schema, {
      ...odtDefaultSchemaMappings,
      blockMapping: {
        ...odtDefaultSchemaMappings.blockMapping,
        paragraph: {
          withChildren: (block, exporter, _level, _number, children) => {
            expect(children).toEqual([null, child]);
            expect(exporter.transformInlineContent(block.content)).toEqual([
              "raw link",
            ]);
            return parent;
          },
        },
        quote: () => child,
        image: () => null,
      },
      inlineContentMapping: {
        ...odtDefaultSchemaMappings.inlineContentMapping,
        link: () => "raw link",
      },
    });
    const blocks = partialBlocksToBlocksForTesting(schema, [
      {
        type: "paragraph",
        content: [
          {
            type: "link",
            href: "https://example.com",
            content: [{ type: "text", text: "link", styles: {} }],
          },
        ],
        children: [{ type: "image" }, { type: "quote" }],
      },
    ]);

    expect(await exporter.transformBlocks(blocks)).toEqual([parent]);
  });

  it("deduplicates identical automatic styles", ({ testResolveFileUrl }) => {
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
