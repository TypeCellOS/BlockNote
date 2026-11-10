import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import {
  DOCXExporter,
  docxDefaultSchemaMappings,
} from "@blocknote/xl-docx-exporter";
import { testDocumentWithSourceBlocks } from "@shared/testDocument.js";
import { testResolveFileUrl } from "@shared/util/testFileResolver.js";
import {
  BlobReader,
  Entry,
  FileEntry,
  TextWriter,
  ZipReader,
} from "@zip.js/zip.js";
import { Document, Packer, Paragraph } from "docx";
import { describe, expect, it } from "vite-plus/test";
import xmlFormat from "xml-formatter";

import { inlineMathMapping, mathBlockMapping } from "./index.js";

const getZIPEntryContent = (entries: Entry[], fileName: string) => {
  const entry = entries.find((entry) => {
    return entry.filename === fileName && !entry.directory;
  }) as FileEntry | undefined;

  if (!entry) {
    return "";
  }

  return entry.getData!(new TextWriter());
};

const prettify = (sourceXml: string) => {
  // Replace random ids like r:id="rIdll8_ocxarmodcwrnsavfb"
  return xmlFormat(sourceXml)
    .replace(/r:id="[a-zA-Z0-9_-]*"/g, 'r:id="FAKE-ID"')
    .replace(/ Id="[a-zA-Z0-9_-]*"/g, ' Id="FAKE-ID"');
};

describe("docx exporter mappings", () => {
  it.each([
    ["x < 0", "x&lt;0"],
    [String.raw`\text{a\&b}`, "a&amp;b"],
    [String.raw`\text{<tag>\&amp;}`, "&lt;tag&gt;&amp;amp;"],
  ])(
    "should preserve XML escaping in block and inline math: %s",
    async (source, escaped) => {
      const exporter = new DOCXExporter(
        BlockNoteSchema.create(),
        docxDefaultSchemaMappings,
      );
      const doc = new Document({
        sections: [
          {
            children: [
              mathBlockMapping(
                {
                  id: "math",
                  type: "mathBlock",
                  props: {},
                  content: [{ type: "text", text: source, styles: {} }],
                },
                exporter,
              ),
              new Paragraph({
                children: [
                  inlineMathMapping(
                    { type: "math", content: source },
                    exporter,
                  ),
                ],
              }),
            ],
          },
        ],
      });
      const zip = new ZipReader(new BlobReader(await Packer.toBlob(doc)));
      try {
        const xml = await getZIPEntryContent(
          await zip.getEntries(),
          "word/document.xml",
        );
        expect(xml.match(/<m:oMath[ >]/g)).toHaveLength(2);
        expect(xml.split(escaped)).toHaveLength(3);
        expect(() => xmlFormat(xml)).not.toThrow();
      } finally {
        await zip.close();
      }
    },
  );

  it("should export math as native equations", { timeout: 10000 }, async () => {
    // Assembled outside the constructor call as the schema doesn't include
    // the math specs - like the default mappings, the math entries just
    // map the block JSON.
    const mappings = {
      ...docxDefaultSchemaMappings,
      blockMapping: {
        ...docxDefaultSchemaMappings.blockMapping,
        mathBlock: mathBlockMapping,
      },
      inlineContentMapping: {
        ...docxDefaultSchemaMappings.inlineContentMapping,
        math: inlineMathMapping,
      },
    };
    const exporter = new DOCXExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
        },
      }),
      mappings,
      { resolveFileUrl: testResolveFileUrl },
    );

    // The math block & inline math paragraph from the shared test document.
    const doc = await exporter.toDocxJsDocument(
      // `as any`: the filtered subset holds no multi-column blocks, but the
      // fixture's type still carries them and this schema doesn't.
      testDocumentWithSourceBlocks.filter((block) =>
        ["math-block", "paragraph-with-inline-math"].includes(block.id),
      ) as any,
      { sectionOptions: {}, documentOptions: {}, locale: "en-US" },
    );

    const blob = await Packer.toBlob(doc);
    const zip = new ZipReader(new BlobReader(blob));
    const entries = await zip.getEntries();

    await expect(
      prettify(await getZIPEntryContent(entries, "word/document.xml")),
    ).toMatchFileSnapshot("__snapshots__/withMathMappings/document.xml");
  });

  it("should render error placeholders for invalid LaTeX", async () => {
    // Assembled outside the constructor call as the schema doesn't include
    // the math specs - like the default mappings, the math entries just map
    // the block JSON.
    const mappings = {
      ...docxDefaultSchemaMappings,
      blockMapping: {
        ...docxDefaultSchemaMappings.blockMapping,
        mathBlock: mathBlockMapping,
      },
      inlineContentMapping: {
        ...docxDefaultSchemaMappings.inlineContentMapping,
        math: inlineMathMapping,
      },
    };
    const exporter = new DOCXExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
        },
      }),
      mappings,
      { resolveFileUrl: testResolveFileUrl },
    );

    const doc = await exporter.toDocxJsDocument(
      [
        {
          id: "1",
          type: "mathBlock",
          props: {},
          content: [{ type: "text", text: "\\invalidcommand{", styles: {} }],
          children: [],
        },
        {
          id: "2",
          type: "paragraph",
          props: {},
          content: [
            { type: "text", text: "Broken: ", styles: {} },
            { type: "math", props: {}, content: "\\invalidcommand{" },
          ],
          children: [],
        },
      ] as any,
      {
        sectionOptions: {},
        documentOptions: {},
        locale: "en-US",
      },
    );

    const blob = await Packer.toBlob(doc);
    const zip = new ZipReader(new BlobReader(blob));
    const entries = await zip.getEntries();
    const documentXML = await getZIPEntryContent(entries, "word/document.xml");

    // Mirrors the editor's error placeholder rather than dumping the LaTeX
    // source on readers - once for the block, once for the inline math.
    expect(documentXML.match(/Invalid formula/g)).toHaveLength(2);
    expect(documentXML).not.toContain("m:oMath");
  });
});
