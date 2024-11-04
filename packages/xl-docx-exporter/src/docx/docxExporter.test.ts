import { BlockNoteSchema } from "@blocknote/core";
import { testDocument } from "@shared/testDocument.js";
import AdmZip from "adm-zip";
import { Packer } from "docx";
import { describe, expect, it } from "vitest";
import xmlFormat from "xml-formatter";
import { docxDefaultSchemaMappings } from "./defaultSchema/index.js";
import { DOCXExporter } from "./docxExporter.js";
describe("exporter", () => {
  it(
    "should export a document",
    async () => {
      const exporter = new DOCXExporter(
        BlockNoteSchema.create(),
        docxDefaultSchemaMappings
      );
      const doc = await exporter.toDocxJsDocument(testDocument);

      const buffer = await Packer.toBuffer(doc);
      const zip = new AdmZip(buffer);

      expect(
        prettify(zip.getEntry("word/document.xml")!.getData().toString())
      ).toMatchFileSnapshot("__snapshots__/document.xml");
      expect(
        prettify(zip.getEntry("word/styles.xml")!.getData().toString())
      ).toMatchFileSnapshot("__snapshots__/styles.xml");

      // fs.writeFileSync(__dirname + "/My Document.docx", buffer);
    },
    { timeout: 10000 }
  );
});

function prettify(sourceXml: string) {
  let ret = xmlFormat(sourceXml);

  // replace random ids like r:id="rIdll8_ocxarmodcwrnsavfb"
  ret = ret.replace(/r:id="[a-zA-Z0-9_-]*"/g, 'r:id="FAKE-ID"');
  return ret;
}
