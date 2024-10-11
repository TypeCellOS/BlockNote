import { BlockNoteSchema } from "@blocknote/core";
import { Packer } from "docx";
import fs from "fs";
import { describe, it } from "vitest";
import { testDocument } from "../testDocument";
import { docxDefaultSchemaMappings } from "./defaultSchema";
import { DOCXExporter } from "./docxExporter";
describe("exporter", () => {
  it("should export a document", async () => {
    const exporter = new DOCXExporter(
      BlockNoteSchema.create(),
      docxDefaultSchemaMappings
    );
    const doc = exporter.toDocxJsDocument(testDocument);

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(__dirname + "/My Document.docx", buffer);
  });
});
