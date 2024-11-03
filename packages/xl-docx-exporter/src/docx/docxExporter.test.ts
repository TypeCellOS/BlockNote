import { BlockNoteSchema } from "@blocknote/core";
import { testDocument } from "@shared/testDocument.js";
import { Packer } from "docx";
import fs from "fs";
import { describe, it } from "vitest";
import { docxDefaultSchemaMappings } from "./defaultSchema/index.js";
import { DOCXExporter } from "./docxExporter.js";
describe("exporter", () => {
  it("should export a document", async () => {
    const exporter = new DOCXExporter(
      BlockNoteSchema.create(),
      docxDefaultSchemaMappings
    );
    const doc = await exporter.toDocxJsDocument(testDocument);

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(__dirname + "/My Document.docx", buffer);
  });
});
