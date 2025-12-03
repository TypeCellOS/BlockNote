import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
  partialBlocksToBlocks,
} from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { testDocument } from "@shared/testDocument.js";
import { BlobReader, FileEntry, TextWriter, ZipReader } from "@zip.js/zip.js";
import { beforeAll, describe, expect, it } from "vitest";
import xmlFormat from "xml-formatter";
import { odtDefaultSchemaMappings } from "./defaultSchema/index.js";
import { ODTExporter } from "./odtExporter.js";

beforeAll(async () => {
  // @ts-ignore
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
      const exporter = new ODTExporter(schema, odtDefaultSchemaMappings);
      const odt = await exporter.toODTDocument(
        partialBlocksToBlocks(schema, [
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
});

async function testODTDocumentAgainstSnapshot(
  odt: globalThis.Blob,
  snapshots: {
    styles: string;
    content: string;
  },
) {
  const zipReader = new ZipReader(new BlobReader(odt));
  const entries = await zipReader.getEntries();
  const stylesXMLWriter = new TextWriter();
  const contentXMLWriter = new TextWriter();
  const stylesXML = entries.find(
    (entry) => entry.filename === "styles.xml",
  ) as FileEntry;
  const contentXML = entries.find((entry) => {
    return entry.filename === "content.xml";
  }) as FileEntry;

  expect(stylesXML).toBeDefined();
  expect(contentXML).toBeDefined();
  await expect(
    xmlFormat(await stylesXML.getData(stylesXMLWriter)),
  ).toMatchFileSnapshot(snapshots.styles);
  await expect(
    xmlFormat(await contentXML.getData(contentXMLWriter)),
  ).toMatchFileSnapshot(snapshots.content);
}
