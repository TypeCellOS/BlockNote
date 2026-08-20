import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from "@cantoo/pdf-lib";
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

// A minimal one-page PDF whose /Metadata stream holds the given XMP packet,
// for exercising declarePdfUA against XMP shapes the Typst fixture cannot
// produce (e.g. a pre-existing pdfuaid:part claim).
async function pdfWithXmp(xmp: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage();
  const bytes = new TextEncoder().encode(xmp);
  doc.catalog.set(
    PDFName.of("Metadata"),
    doc.context.register(
      PDFRawStream.of(
        doc.context.obj({
          Type: "Metadata",
          Subtype: "XML",
          Length: bytes.length,
        }),
        bytes,
      ),
    ),
  );
  return doc.save({ useObjectStreams: false });
}

function xmpWithDescription(content: string): string {
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/">${content}</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="r"?>`;
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

  it("keeps an existing PDF/UA-1 claim without doubling it", async () => {
    const out = await declarePdfUA(
      await pdfWithXmp(xmpWithDescription("<pdfuaid:part>1</pdfuaid:part>")),
    );
    const doc = await PDFDocument.load(out, { updateMetadata: false });
    const meta = doc.context.lookup(
      doc.catalog.get(PDFName.of("Metadata")),
    ) as PDFRawStream;
    const xmp = new TextDecoder().decode(meta.getContents());
    expect(xmp.match(/<pdfuaid:part>/g)?.length).toBe(1);
  });

  it("rejects an existing claim of a different PDF/UA part", async () => {
    await expect(
      declarePdfUA(
        await pdfWithXmp(xmpWithDescription("<pdfuaid:part>2</pdfuaid:part>")),
      ),
    ).rejects.toThrow("pdfuaid:part");
  });

  it("rejects an existing empty pdfuaid:part element", async () => {
    await expect(
      declarePdfUA(
        await pdfWithXmp(xmpWithDescription("<pdfuaid:part></pdfuaid:part>")),
      ),
    ).rejects.toThrow("pdfuaid:part");
  });
});
