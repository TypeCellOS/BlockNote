import { BlockNoteSchema, defaultBlockSpecs, PageBreak } from "@blocknote/core";
import { testDocument } from "@shared/testDocument.js";
import { BlobReader, TextWriter, ZipReader } from "@zip.js/zip.js";
import { describe, beforeAll, expect, it } from "vitest";
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
        blockSpecs: { ...defaultBlockSpecs, pageBreak: PageBreak },
      }),
      odtDefaultSchemaMappings
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
          blockSpecs: { ...defaultBlockSpecs, pageBreak: PageBreak },
        }),
        odtDefaultSchemaMappings
      );

      const odt = await exporter.toODTDocument(testDocument, {
        footer: "<text:p>FOOTER</text:p>",
        header: new DOMParser().parseFromString(
          `<text:p xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">HEADER</text:p>`,
          "text/xml"
        ),
      });

      await testODTDocumentAgainstSnapshot(odt, {
        styles: "__snapshots__/withCustomOptions/styles.xml",
        content: "__snapshots__/withCustomOptions/content.xml",
      });
    }
  );
});
async function testODTDocumentAgainstSnapshot(
  odt: globalThis.Blob,
  snapshots: {
    styles: string;
    content: string;
  }
) {
  const zipReader = new ZipReader(new BlobReader(odt));
  const entries = await zipReader.getEntries();
  const stylesXMLWriter = new TextWriter();
  const contentXMLWriter = new TextWriter();
  const stylesXML = entries.find((entry) => entry.filename === "styles.xml");
  const contentXML = entries.find((entry) => {
    return entry.filename === "content.xml";
  });

  expect(stylesXML).toBeDefined();
  expect(contentXML).toBeDefined();
  expect(
    xmlFormat(await stylesXML!.getData!(stylesXMLWriter))
  ).toMatchFileSnapshot(snapshots.styles);
  expect(
    xmlFormat(await contentXML!.getData!(contentXMLWriter))
  ).toMatchFileSnapshot(snapshots.content);
}
