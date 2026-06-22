import { PDFDict, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";

const PDFUA_NS = "http://www.aiim.org/pdfua/ns/id/";

/**
 * Promote a *tagged* PDF (as produced by the Typst engine) to a declared
 * PDF/UA-1 document.
 *
 * Typst 0.15 already emits a UA-conformant tag tree by default. The only things
 * the engine's `--pdf-standard ua-1` export flag adds — and that the published
 * wasm binding does not expose — are two declarations:
 *
 *   1. `catalog /ViewerPreferences << /DisplayDocTitle true >>`  (ISO 14289-1, 7.1)
 *   2. the PDF/UA identification in XMP metadata (`pdfuaid:part = 1`) (clause 5)
 *
 * We add both here in pure JS (pdf-lib runs in the browser), so the whole
 * pipeline stays client-side. The output should always be independently
 * verified with veraPDF — see the golden gate in the spike / CI.
 *
 * NOTE: this declares conformance; it does not *create* it. Garbage in (an
 * untagged PDF, missing alt text, ...) stays non-conformant — which is why
 * veraPDF is the gate, not this function.
 */
export async function declarePdfUA(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes, { updateMetadata: false });
  const ctx = doc.context;
  const catalog = doc.catalog;

  // 1) ViewerPreferences / DisplayDocTitle = true
  let viewerPrefs = catalog.lookup(PDFName.of("ViewerPreferences"), PDFDict) as
    | PDFDict
    | undefined;
  if (!viewerPrefs) {
    viewerPrefs = ctx.obj({}) as PDFDict;
    catalog.set(PDFName.of("ViewerPreferences"), viewerPrefs);
  }
  viewerPrefs.set(PDFName.of("DisplayDocTitle"), ctx.obj(true));

  // 2) Inject pdfuaid:part=1 into the XMP packet, preserving any existing XMP.
  const xmp = injectPdfUaId(readMetadataXmp(doc));
  const xmpBytes = new TextEncoder().encode(xmp);
  const metaDict = ctx.obj({
    Type: "Metadata",
    Subtype: "XML",
    Length: xmpBytes.length,
  });
  catalog.set(
    PDFName.of("Metadata"),
    ctx.register(PDFRawStream.of(metaDict, xmpBytes)),
  );

  return doc.save({ useObjectStreams: false });
}

function readMetadataXmp(doc: PDFDocument): string {
  const ref = doc.catalog.get(PDFName.of("Metadata"));
  if (ref) {
    const stream = doc.context.lookup(ref) as PDFRawStream;
    const bytes = stream.getContents();
    return new TextDecoder().decode(bytes);
  }
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about=""></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="r"?>`;
}

function injectPdfUaId(xmp: string): string {
  if (/pdfuaid:part/.test(xmp)) {
    return xmp;
  }
  return xmp
    .replace(/<rdf:Description\b([^>]*)>/, (match, attrs) =>
      /pdfuaid/.test(attrs)
        ? match
        : `<rdf:Description${attrs} xmlns:pdfuaid="${PDFUA_NS}">`,
    )
    .replace(
      /<\/rdf:Description>/,
      `<pdfuaid:part>1</pdfuaid:part></rdf:Description>`,
    );
}
