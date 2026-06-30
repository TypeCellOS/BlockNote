import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { partialBlocksToBlocksForTesting } from "@shared/formatConversionTestUtil.js";
import { testDocument } from "@shared/testDocument.js";
import { describe, expect, it } from "vite-plus/test";
import { typstDefaultSchemaMappings } from "./defaultSchema/index.js";
import { TypstExporter } from "./typstExporter.js";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageBreak: createPageBreakBlockSpec(),
  },
});

// Schema including the multi-column blocks, matching the shared testDocument.
const fullSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageBreak: createPageBreakBlockSpec(),
    column: ColumnBlock,
    columnList: ColumnListBlock,
  },
});

describe("TypstExporter", () => {
  it("exports a real BlockNote document to Typst", async () => {
    // fullSchema (incl. multi-column) matches the shared testDocument. Resolves
    // the document's images over the network, like the other exporters.
    // emojiFontFamily matches the example + golden test, so the snapshot
    // exercises the explicit emoji-font fallback (needed for ZWJ emoji).
    const exporter = new TypstExporter(fullSchema, typstDefaultSchemaMappings, {
      emojiFontFamily: "Noto Color Emoji",
    });

    const typ = await exporter.toTypst(testDocument, {
      title: "BlockNote Export",
      lang: "en",
      author: "BlockNote",
    });

    // Emoji font is listed as an explicit fallback after the body font.
    expect(typ).toContain(
      '#set text(font: ("Inter 18pt", "Noto Color Emoji"), size: 12pt, lang: "en")',
    );

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

  it("applies default document options when none are given", async () => {
    const exporter = new TypstExporter(schema, typstDefaultSchemaMappings);

    const typ = await exporter.toTypst(
      partialBlocksToBlocksForTesting(schema, [
        { type: "paragraph", content: "x" },
      ]),
    );

    expect(typ).toContain('#set document(title: "Document", author: "")');
    expect(typ).toContain(
      '#set text(font: "Inter 18pt", size: 12pt, lang: "en")',
    );
    expect(typ).toContain('#show raw: set text(font: "Geist Mono")');
  });

  it("propagates font (constructor) and document (export) options into the preamble", async () => {
    // Font/theme config -> constructor; document metadata -> export call.
    const exporter = new TypstExporter(schema, typstDefaultSchemaMappings, {
      fontFamily: "Times New Roman",
      monoFontFamily: "Courier New",
      fontSize: 14,
    });

    const typ = await exporter.toTypst(
      partialBlocksToBlocksForTesting(schema, [
        { type: "paragraph", content: "x" },
      ]),
      { title: "My Report", author: "Jane Doe", lang: "fr" },
    );

    expect(typ).toContain(
      '#set document(title: "My Report", author: "Jane Doe")',
    );
    expect(typ).toContain(
      '#set text(font: "Times New Roman", size: 14pt, lang: "fr")',
    );
    expect(typ).toContain('#show raw: set text(font: "Courier New")');
  });

  it("escapes Typst-significant characters in text content", async () => {
    const exporter = new TypstExporter(schema, typstDefaultSchemaMappings);

    const typ = await exporter.toTypst(
      partialBlocksToBlocksForTesting(schema, [
        { type: "paragraph", content: 'Backslash \\ quote " hash # star *' },
      ]),
    );

    // Text is emitted as a Typst string literal (#"..."), so backslash and
    // double-quote must be escaped; markup-significant chars (#, *) are inert
    // inside the literal and pass through untouched.
    expect(typ).toContain('#"Backslash \\\\ quote \\" hash # star *"');
  });

  it("sets a running page header and footer when provided", async () => {
    const exporter = new TypstExporter(schema, typstDefaultSchemaMappings);

    const typ = await exporter.toTypst(
      partialBlocksToBlocksForTesting(schema, [
        { type: "paragraph", content: "x" },
      ]),
      {
        header: "My Document",
        footer: "#context counter(page).display()",
      },
    );

    expect(typ).toContain(
      '#set page(paper: "a4", margin: 48pt, ' +
        "header: [My Document], footer: [#context counter(page).display()])",
    );
  });

  it("omits header/footer from the page setup by default", async () => {
    const exporter = new TypstExporter(schema, typstDefaultSchemaMappings);

    const typ = await exporter.toTypst(
      partialBlocksToBlocksForTesting(schema, [
        { type: "paragraph", content: "x" },
      ]),
    );

    expect(typ).toContain('#set page(paper: "a4", margin: 48pt)');
    expect(typ).not.toContain("header:");
    expect(typ).not.toContain("footer:");
  });

  it("embeds a resolved image as a Typst image() shadow file", async () => {
    // Fetches the image for real (no local resolver), like the other exporters.
    const exporter = new TypstExporter(schema, typstDefaultSchemaMappings);

    const typ = await exporter.toTypst(
      partialBlocksToBlocksForTesting(schema, [
        {
          type: "image",
          props: {
            url: "https://placehold.co/60x60.png",
            caption: "Cap",
            previewWidth: 100,
          },
        },
      ]),
    );

    // Real image, not the placeholder rectangle. previewWidth 100px -> 75pt.
    expect(typ).toContain(
      '#figure(image("/assets/asset-0.png", width: 75.0pt), caption: [#"Cap"], alt: "Cap")',
    );
    // ...and its bytes are collected for the compiler.
    const asset = exporter.assetFiles.get("/assets/asset-0.png");
    expect(asset).toBeInstanceOf(Uint8Array);
    expect(asset!.byteLength).toBeGreaterThan(0);
  });

  // TODO: review
  it("falls back to a placeholder figure when an image can't be resolved", async () => {
    const exporter = new TypstExporter(schema, typstDefaultSchemaMappings, {
      // TODO: review
      resolveFileUrl: async () => {
        throw new Error("offline");
      },
    });

    const typ = await exporter.toTypst(
      partialBlocksToBlocksForTesting(schema, [
        { type: "image", props: { url: "https://example.com/x.png" } },
      ]),
    );

    expect(typ).toContain("#figure(rect(");
    expect(typ).toContain('alt: "https://example.com/x.png"');
    expect(exporter.assetFiles.size).toBe(0);
  });
});
