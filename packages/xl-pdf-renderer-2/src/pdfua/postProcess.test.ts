import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { describe, expect, it } from "vite-plus/test";
import { declarePdfUA } from "./postProcess.js";

// `tagged.pdf` is a Typst-generated, tagged-but-NOT-declared PDF/UA document
// (the same kind the wasm browser engine emits).
function loadFixture(): Uint8Array {
  const candidates = [
    resolve(process.cwd(), "src/pdfua/__fixtures__/tagged.pdf"),
    resolve(process.cwd(), "__fixtures__/tagged.pdf"),
  ];
  const path = candidates.find((p) => existsSync(p));
  if (!path) {
    throw new Error("tagged.pdf fixture not found; cwd=" + process.cwd());
  }
  return new Uint8Array(readFileSync(path));
}

describe("declarePdfUA", () => {
  it("adds DisplayDocTitle + pdfuaid:part=1 to a tagged PDF", async () => {
    const out = await declarePdfUA(loadFixture());

    const doc = await PDFDocument.load(out, { updateMetadata: false });

    // 1) ViewerPreferences / DisplayDocTitle = true
    const vp = doc.catalog.lookup(PDFName.of("ViewerPreferences"), PDFDict);
    expect(vp).toBeDefined();
    expect(String(vp!.get(PDFName.of("DisplayDocTitle")))).toBe("true");

    // 2) PDF/UA identification in XMP
    const meta = doc.context.lookup(
      doc.catalog.get(PDFName.of("Metadata")),
    ) as PDFRawStream;
    const xmp = new TextDecoder().decode(meta.getContents());
    expect(xmp).toContain("pdfuaid");
    expect(xmp).toMatch(/<pdfuaid:part>1<\/pdfuaid:part>/);

    // structure is preserved (still a tagged PDF)
    expect(doc.catalog.get(PDFName.of("StructTreeRoot"))).toBeDefined();
  });

  it("is idempotent", async () => {
    const once = await declarePdfUA(loadFixture());
    const twice = await declarePdfUA(once);
    const doc = await PDFDocument.load(twice, { updateMetadata: false });
    const meta = doc.context.lookup(
      doc.catalog.get(PDFName.of("Metadata")),
    ) as PDFRawStream;
    const xmp = new TextDecoder().decode(meta.getContents());
    // not doubled
    expect(xmp.match(/<pdfuaid:part>/g)?.length).toBe(1);
  });
});
