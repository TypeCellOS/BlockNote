import {
  BlockNoteSchema,
  defaultBlockSpecs,
  createPageBreakBlockSpec,
  PartialBlock,
} from "@blocknote/core";
import { de } from "@blocknote/core/locales";
import { testDocument } from "@shared/testDocument.js";
import {
  BlobReader,
  Entry,
  FileEntry,
  TextWriter,
  ZipReader,
} from "@zip.js/zip.js";
import { Packer, Paragraph, TextRun } from "docx";
import { describe, expect, it } from "vite-plus/test";
import xmlFormat from "xml-formatter";
import { docxDefaultSchemaMappings } from "./defaultSchema/index.js";
import { DOCXExporter } from "./docxExporter.js";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { partialBlocksToBlocksForTesting } from "@shared/formatConversionTestUtil.js";
import { testResolveFileUrl } from "@shared/util/testFileResolver.js";

const getZIPEntryContent = (entries: Entry[], fileName: string) => {
  const entry = entries.find((entry) => {
    return entry.filename === fileName && !entry.directory;
  }) as FileEntry | undefined;

  if (!entry) {
    return "";
  }

  return entry.getData!(new TextWriter());
};
describe("exporter", () => {
  it("should export a document", { timeout: 10000 }, async () => {
    const exporter = new DOCXExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
        },
      }),
      docxDefaultSchemaMappings,
      { resolveFileUrl: testResolveFileUrl },
    );
    const doc = await exporter.toDocxJsDocument(testDocument, {
      sectionOptions: {},
      documentOptions: {},
      locale: "en-US",
    });

    const blob = await Packer.toBlob(doc);
    const zip = new ZipReader(new BlobReader(blob));
    const entries = await zip.getEntries();

    await expect(
      prettify(await getZIPEntryContent(entries, "word/document.xml")),
    ).toMatchFileSnapshot("__snapshots__/basic/document.xml");
    await expect(
      prettify(await getZIPEntryContent(entries, "word/styles.xml")),
    ).toMatchFileSnapshot("__snapshots__/basic/styles.xml");
  });

  it(
    "should export a document with custom document options",
    { timeout: 10000 },
    async () => {
      const exporter = new DOCXExporter(
        BlockNoteSchema.create({
          blockSpecs: {
            ...defaultBlockSpecs,
            pageBreak: createPageBreakBlockSpec(),
          },
        }),
        docxDefaultSchemaMappings,
        { resolveFileUrl: testResolveFileUrl },
      );

      const doc = await exporter.toDocxJsDocument(testDocument, {
        locale: "en-US",
        documentOptions: {
          creator: "John Doe",
        },
        sectionOptions: {
          headers: {
            default: {
              options: {
                children: [
                  new Paragraph({ children: [new TextRun("Header")] }),
                ],
              },
            },
          },
          footers: {
            default: {
              options: {
                children: [
                  new Paragraph({ children: [new TextRun("Footer")] }),
                ],
              },
            },
          },
        },
      });

      const blob = await Packer.toBlob(doc);

      const zip = new ZipReader(new BlobReader(blob));
      const entries = await zip.getEntries();

      // files related to header / footer
      await expect(
        prettify(
          await getZIPEntryContent(entries, "word/_rels/document.xml.rels"),
        ),
      ).toMatchFileSnapshot(
        "__snapshots__/withCustomOptions/document.xml.rels",
      );

      await expect(
        prettify(await getZIPEntryContent(entries, "word/header1.xml")),
      ).toMatchFileSnapshot("__snapshots__/withCustomOptions/header1.xml");

      await expect(
        prettify(await getZIPEntryContent(entries, "word/footer1.xml")),
      ).toMatchFileSnapshot("__snapshots__/withCustomOptions/footer1.xml");

      // has author data
      await expect(
        prettify(await getZIPEntryContent(entries, "docProps/core.xml")),
      ).toMatchFileSnapshot("__snapshots__/withCustomOptions/core.xml");
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
      const exporter = new DOCXExporter(schema, docxDefaultSchemaMappings, {
        resolveFileUrl: testResolveFileUrl,
      });
      const doc = await exporter.toDocxJsDocument(
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
        { sectionOptions: {}, documentOptions: {}, locale: "en-US" },
      );

      const blob = await Packer.toBlob(doc);
      const zip = new ZipReader(new BlobReader(blob));
      const entries = await zip.getEntries();

      await expect(
        prettify(await getZIPEntryContent(entries, "word/document.xml")),
      ).toMatchFileSnapshot("__snapshots__/withMultiColumn/document.xml");
      await expect(
        prettify(await getZIPEntryContent(entries, "word/styles.xml")),
      ).toMatchFileSnapshot("__snapshots__/withMultiColumn/styles.xml");
    },
  );

  it(
    "should clamp list nesting deeper than DOCX supports",
    { timeout: 10000 },
    async () => {
      const schema = BlockNoteSchema.create({
        blockSpecs: { ...defaultBlockSpecs },
      });

      // A list nested `depth` items deep, i.e. nesting levels 0..depth-1.
      const nestedList = (depth: number) => {
        type SchemaPartialBlock = PartialBlock<
          typeof schema.blockSchema,
          typeof schema.inlineContentSchema,
          typeof schema.styleSchema
        >;

        let block: SchemaPartialBlock = {
          type: "bulletListItem",
          content: `level ${depth}`,
        };
        for (let i = depth - 1; i >= 1; i--) {
          block = {
            type: "bulletListItem",
            content: `level ${i}`,
            children: [block],
          };
        }
        return [block];
      };
      const exporter = new DOCXExporter(schema, docxDefaultSchemaMappings, {
        resolveFileUrl: testResolveFileUrl,
      });

      // Deeper than the 9 levels the numbering config defines. Without
      // clamping, `docx` throws "Level cannot be greater than 9" and the whole
      // export fails.
      const doc = await exporter.toDocxJsDocument(
        partialBlocksToBlocksForTesting(schema, nestedList(12)),
        { sectionOptions: {}, documentOptions: {}, locale: "en-US" },
      );

      const blob = await Packer.toBlob(doc);
      const zip = new ZipReader(new BlobReader(blob));
      const entries = await zip.getEntries();
      const documentXml = await getZIPEntryContent(
        entries,
        "word/document.xml",
      );

      const levels = [...documentXml.matchAll(/<w:ilvl w:val="(\d+)"\/>/g)].map(
        (match) => Number(match[1]),
      );

      // Every item is still exported, and every level it references is one the
      // numbering config actually defines (0-8) - levels past that are pinned
      // to the deepest defined level rather than dropped or left undefined.
      expect(levels).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8, 8]);
    },
  );

  async function exportAndGetStylesEntries(locale?: string) {
    const exporter = new DOCXExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
        },
      }),
      docxDefaultSchemaMappings,
      { resolveFileUrl: testResolveFileUrl },
    );
    const doc = await exporter.toDocxJsDocument(testDocument, {
      sectionOptions: {},
      documentOptions: {},
      ...(locale && { locale }),
    });

    const blob = await Packer.toBlob(doc);
    const zip = new ZipReader(new BlobReader(blob));
    return zip.getEntries();
  }

  it(
    "should export file links with the configured dictionary",
    { timeout: 10000 },
    async () => {
      // Exporter strings are never hardcoded - the file link text comes
      // from the `exporter` section of the configured dictionary (English
      // when not configured).
      const exporter = new DOCXExporter(
        BlockNoteSchema.create({
          blockSpecs: {
            ...defaultBlockSpecs,
            pageBreak: createPageBreakBlockSpec(),
          },
        }),
        docxDefaultSchemaMappings,
        { resolveFileUrl: testResolveFileUrl, dictionary: de },
      );
      const doc = await exporter.toDocxJsDocument(testDocument, {
        sectionOptions: {},
        documentOptions: {},
        locale: "de-DE",
      });

      const zip = new ZipReader(new BlobReader(await Packer.toBlob(doc)));
      const documentXML = await getZIPEntryContent(
        await zip.getEntries(),
        "word/document.xml",
      );

      expect(documentXML).toContain("Datei öffnen");
      expect(documentXML).not.toContain("Open file");
    },
  );

  it(
    "should export a document without w:lang when no locale is provided",
    { timeout: 10000 },
    async () => {
      const entries = await exportAndGetStylesEntries();

      await expect(
        prettify(await getZIPEntryContent(entries, "word/styles.xml")),
      ).toMatchFileSnapshot("__snapshots__/noLocale/styles.xml");
    },
  );

  it(
    "should export a document with w:lang when locale is provided",
    { timeout: 10000 },
    async () => {
      const entries = await exportAndGetStylesEntries("fr-FR");

      await expect(
        prettify(await getZIPEntryContent(entries, "word/styles.xml")),
      ).toMatchFileSnapshot("__snapshots__/withLocale/styles.xml");
    },
  );
});

function prettify(sourceXml: string) {
  let ret = xmlFormat(sourceXml);

  // replace random ids like r:id="rIdll8_ocxarmodcwrnsavfb"
  ret = ret.replace(/r:id="[a-zA-Z0-9_-]*"/g, 'r:id="FAKE-ID"');

  // replace random ids like Id="rIdll8_ocxarmodcwrnsavfb"
  ret = ret.replace(/ Id="[a-zA-Z0-9_-]*"/g, ' Id="FAKE-ID"');

  // replace created date <dcterms:created xsi:type="dcterms:W3CDTF">...</dcterms:created>
  ret = ret.replace(
    /<dcterms:created xsi:type="dcterms:W3CDTF">[^<]*<\/dcterms:created>/g,
    '<dcterms:created xsi:type="dcterms:W3CDTF">FAKE-DATE</dcterms:created>',
  );

  // replace modified date <dcterms:modified xsi:type="dcterms:W3CDTF">...</dcterms:modified>
  ret = ret.replace(
    /<dcterms:modified xsi:type="dcterms:W3CDTF">[^<]*<\/dcterms:modified>/g,
    '<dcterms:modified xsi:type="dcterms:W3CDTF">FAKE-DATE</dcterms:modified>',
  );
  return ret;
}
