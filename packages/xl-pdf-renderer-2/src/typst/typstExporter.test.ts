import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { testDocument } from "@shared/testDocument.js";
import { describe, expect, it } from "vite-plus/test";
import { typstDefaultSchemaMappings } from "./defaultSchema/index.js";
import { TypstExporter } from "./typstExporter.js";

describe("TypstExporter", () => {
  it("exports a real BlockNote document to Typst", async () => {
    const exporter = new TypstExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
        },
      }),
      typstDefaultSchemaMappings,
      { title: "BlockNote Export", lang: "en", author: "BlockNote" },
    );

    const typ = await exporter.toTypst(testDocument);

    // Round-trips into the expected (tag-bearing) Typst constructs.
    expect(typ).toContain("#set document(title:");
    expect(typ).toContain("#heading(level:");
    expect(typ).toContain("#list(");
    expect(typ).toContain("#enum(");
    expect(typ).toContain("#table(");
    expect(typ).toContain("#figure(");
    expect(typ).toContain("alt:");
    expect(typ).toContain("#raw(");
    expect(typ).toContain("link(");

    // The snapshot file IS the golden `.typ` the veraPDF gate compiles.
    await expect(typ).toMatchFileSnapshot("__snapshots__/testDocument.typ");
  });
});
