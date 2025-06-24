import { describe, it, expect } from "vitest";
import { render } from "@react-email/render";
import { ReactEmailExporter } from "./reactEmailExporter";
import { reactEmailDefaultSchemaMappings } from "./defaultSchema";
import { BlockNoteSchema } from "@blocknote/core";
import { testDocument } from "@shared/testDocument.js";

describe("react email exporter", () => {
  it("should export a document (HTML snapshot)", async () => {
    const exporter = new ReactEmailExporter(
      BlockNoteSchema.create(),
      reactEmailDefaultSchemaMappings,
    );

    const reactElement = await exporter.toReactEmailDocument(
      testDocument as any,
    );
    const html = await render(reactElement);
    expect(html).toMatchSnapshot("__snapshots__/reactEmailExporter");
  });
});
