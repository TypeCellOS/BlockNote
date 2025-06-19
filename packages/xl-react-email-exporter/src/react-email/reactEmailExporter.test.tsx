import { describe, it } from "vitest";

import { ReactEmailExporter } from "./reactEmailExporter";
import { reactEmailDefaultSchemaMappings } from "./defaultSchema";
import { BlockNoteSchema } from "@blocknote/core";
import { testDocument } from "@shared/testDocument.js";


describe("react email exporter", () => {
  it("should export a document", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings
    );

    const html = await exporter.toReactEmailDocument(testDocument as any);

    // eslint-disable-next-line no-console
    console.log(html);
    // const buffer = await Packer.toBuffer(doc);
    // fs.writeFileSync(__dirname + "/My Document.docx", buffer);
  });
});