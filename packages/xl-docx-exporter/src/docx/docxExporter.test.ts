import { BlockNoteSchema, defaultBlockSpecs, PageBreak } from "@blocknote/core";
import { testDocument } from "@shared/testDocument.js";
import AdmZip from "adm-zip";
import { Packer, Paragraph, TextRun } from "docx";
import { describe, expect, it } from "vitest";
import xmlFormat from "xml-formatter";
import { docxDefaultSchemaMappings } from "./defaultSchema/index.js";
import { DOCXExporter } from "./docxExporter.js";

describe("exporter", () => {
  it("should export a document", { timeout: 10000 }, async () => {
    const exporter = new DOCXExporter(
      BlockNoteSchema.create({
        blockSpecs: { ...defaultBlockSpecs, pageBreak: PageBreak },
      }),
      docxDefaultSchemaMappings
    );
    const doc = await exporter.toDocxJsDocument(testDocument);

    const buffer = await Packer.toBuffer(doc);
    const zip = new AdmZip(buffer);

    expect(
      prettify(zip.getEntry("word/document.xml")!.getData().toString())
    ).toMatchFileSnapshot("__snapshots__/basic/document.xml");
    expect(
      prettify(zip.getEntry("word/styles.xml")!.getData().toString())
    ).toMatchFileSnapshot("__snapshots__/basic/styles.xml");

    // fs.writeFileSync(__dirname + "/My Document.docx", buffer);
  });

  it(
    "should export a document with custom document options",
    { timeout: 10000 },
    async () => {
      const exporter = new DOCXExporter(
        BlockNoteSchema.create({
          blockSpecs: { ...defaultBlockSpecs, pageBreak: PageBreak },
        }),
        docxDefaultSchemaMappings
      );

      const doc = await exporter.toDocxJsDocument(testDocument, {
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

      const buffer = await Packer.toBuffer(doc);

      // fs.writeFileSync(__dirname + "/My Document.docx", buffer);

      const zip = new AdmZip(buffer);

      // files related to header / footer
      expect(
        prettify(
          zip.getEntry("word/_rels/document.xml.rels")!.getData().toString()
        )
      ).toMatchFileSnapshot(
        "__snapshots__/withCustomOptions/document.xml.rels"
      );

      expect(
        prettify(zip.getEntry("word/header1.xml")!.getData().toString())
      ).toMatchFileSnapshot("__snapshots__/withCustomOptions/header1.xml");

      expect(
        prettify(zip.getEntry("word/footer1.xml")!.getData().toString())
      ).toMatchFileSnapshot("__snapshots__/withCustomOptions/footer1.xml");

      // has author data
      expect(
        prettify(zip.getEntry("docProps/core.xml")!.getData().toString())
      ).toMatchFileSnapshot("__snapshots__/withCustomOptions/core.xml");
    }
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
    '<dcterms:created xsi:type="dcterms:W3CDTF">FAKE-DATE</dcterms:created>'
  );

  // replace modified date <dcterms:modified xsi:type="dcterms:W3CDTF">...</dcterms:modified>
  ret = ret.replace(
    /<dcterms:modified xsi:type="dcterms:W3CDTF">[^<]*<\/dcterms:modified>/g,
    '<dcterms:modified xsi:type="dcterms:W3CDTF">FAKE-DATE</dcterms:modified>'
  );
  return ret;
}
