import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { ColumnBlock, ColumnListBlock } from "@blocknote/xl-multi-column";
import { partialBlocksToBlocksForTesting } from "@shared/formatConversionTestUtil.js";
import { testDocument } from "@shared/testDocument.js";
import { testResolveFileUrl } from "@shared/util/testFileResolver.js";
import { compileTypstForTesting } from "@shared/util/typstTestUtil.js";
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
    // fullSchema (incl. multi-column) matches the shared testDocument. The
    // document's images resolve through the network-free test resolver, like
    // the other exporters' tests. emojiFontFamily matches the example +
    // pdfua.test, so the snapshot exercises the explicit emoji-font fallback
    // (needed for ZWJ emoji).
    const exporter = new TypstExporter(fullSchema, typstDefaultSchemaMappings, {
      emojiFontFamily: "Noto Color Emoji",
      resolveFileUrl: testResolveFileUrl,
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

    // This `.typ` snapshot is the markup that pdfua.test.ts compiles and checks
    // for PDF/UA-1 conformance.
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
      {
        title: "My Report",
        author: "Jane Doe",
        lang: "fr",
        paper: "us-letter",
        margin: "2cm",
      },
    );

    expect(typ).toContain(
      '#set document(title: "My Report", author: "Jane Doe")',
    );
    expect(typ).toContain(
      '#set text(font: "Times New Roman", size: 14pt, lang: "fr")',
    );
    expect(typ).toContain('#show raw: set text(font: "Courier New")');
    expect(typ).toContain('#set page(paper: "us-letter", margin: 2cm)');
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
    const exporter = new TypstExporter(schema, typstDefaultSchemaMappings, {
      resolveFileUrl: testResolveFileUrl,
    });

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
    // Asset paths are extension-less: Typst detects the format from the
    // bytes (see registerImageBytes).
    expect(typ).toContain(
      '#figure(image("/assets/asset-0", width: 75.0pt), caption: [#"Cap"], alt: "Cap")',
    );
    // ...and its bytes are collected for the compiler.
    const asset = exporter.assetFiles.get("/assets/asset-0");
    expect(asset).toBeInstanceOf(Uint8Array);
    expect(asset!.byteLength).toBeGreaterThan(0);
  });

  it("keeps nested children outside the parent's alignment scope", async () => {
    // Typst's `align` styles everything in its scope, but in the editor a
    // block's alignment applies to its own content only - indenting a block
    // under a right-aligned heading must not right-align the child.
    const exporter = new TypstExporter(schema, typstDefaultSchemaMappings);
    const typ = await exporter.toTypst(
      partialBlocksToBlocksForTesting(schema, [
        {
          type: "heading",
          props: { level: 1, textAlignment: "right" },
          content: "Heading right",
          children: [
            {
              type: "heading",
              props: { level: 2 },
              content: "Heading 2",
            },
          ],
        },
      ]),
    );

    // The parent's own content is aligned...
    expect(typ).toContain(
      '#align(right)[#heading(level: 1, outlined: true)[#"Heading right"]]',
    );
    // ...while the indented child sits outside that scope, unaligned.
    const child = '#heading(level: 2, outlined: true)[#"Heading 2"]';
    expect(typ).toContain(child);
    expect(typ.indexOf("#pad(left: 1.5em)")).toBeLessThan(typ.indexOf(child));
    expect(typ).not.toContain(`#align(right)[#block`);
  });

  it("rejects caller assets that collide with exporter-registered ones", async () => {
    const { blocksToPdfUA } = await import("../index.js");
    const exporter = new TypstExporter(schema, typstDefaultSchemaMappings, {
      resolveFileUrl: testResolveFileUrl,
    });

    // The document's image registers `/assets/asset-0`; a caller asset under
    // the same key would be silently shadowed by the merge, so the export
    // must fail loudly instead (before ever reaching the compiler).
    await expect(
      blocksToPdfUA(
        exporter,
        partialBlocksToBlocksForTesting(schema, [
          {
            type: "image",
            props: { url: "https://placehold.co/60x60.png", caption: "Cap" },
          },
        ]),
        { assets: new Map([["/assets/asset-0", new Uint8Array([1])]]) },
      ),
    ).rejects.toThrow('the caller-supplied asset "/assets/asset-0" collides');
  });

  it("fails the export when an image can't be resolved", async () => {
    // An unreachable image is an environment failure, not expected input -
    // the export fails loudly instead of silently degrading the document
    // (see the error-handling conventions in AGENTS.md).
    const exporter = new TypstExporter(schema, typstDefaultSchemaMappings, {
      resolveFileUrl: async () => {
        throw new Error("offline");
      },
    });

    await expect(
      exporter.toTypst(
        partialBlocksToBlocksForTesting(schema, [
          { type: "image", props: { url: "https://example.com/x.png" } },
        ]),
      ),
    ).rejects.toThrow("offline");
  });

  it(
    "spans merged table cells and emits a single multi-row header",
    { timeout: 20000 },
    async () => {
      const exporter = new TypstExporter(schema, typstDefaultSchemaMappings);

      const typ = await exporter.toTypst(
        partialBlocksToBlocksForTesting(schema, [
          {
            type: "table",
            content: {
              type: "tableContent",
              headerRows: 2,
              // Explicit widths for both tracks: the test-fixture converter
              // would otherwise derive the column count from the first row's
              // cell count, which a merged first-row cell undercounts (the
              // editor always stores full-length columnWidths).
              columnWidths: [100, 100],
              rows: [
                {
                  cells: [
                    {
                      type: "tableCell",
                      content: "Wide header",
                      props: { colspan: 2 },
                    },
                  ],
                },
                { cells: ["H1", "H2"] },
                {
                  // Homogeneous cells: a row is either all inline content or
                  // all tableCell objects (see PartialTableContent).
                  cells: [
                    {
                      type: "tableCell",
                      content: "Tall",
                      props: { rowspan: 2 },
                    },
                    { type: "tableCell", content: "B1" },
                  ],
                },
                { cells: ["B2"] },
              ],
            },
          },
        ]),
      );

      // Merged cells span their tracks, so following cells stay in the right
      // columns...
      expect(typ).toContain("colspan: 2");
      expect(typ).toContain("rowspan: 2");
      // ...and both header rows live in ONE table.header - Typst rejects a
      // table with more than one.
      expect(typ.match(/table\.header\(/g)).toHaveLength(1);
      const pdf = await compileTypstForTesting(typ);
      expect(pdf.length).toBeGreaterThan(0);
    },
  );

  it("renders a placeholder figure for an image without a URL", async () => {
    const exporter = new TypstExporter(schema, typstDefaultSchemaMappings);

    const typ = await exporter.toTypst(
      partialBlocksToBlocksForTesting(schema, [
        { type: "image", props: { caption: "Later" } },
      ]),
    );

    // Nothing to embed yet - a placeholder rectangle in a Figure that still
    // carries alt text (PDF/UA requires one on every figure).
    expect(typ).toContain("#figure(rect(");
    expect(typ).toContain('alt: "Later"');
    expect(exporter.assetFiles.size).toBe(0);
  });
});
