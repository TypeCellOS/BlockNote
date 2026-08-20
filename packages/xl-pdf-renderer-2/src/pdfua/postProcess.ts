import {
  decodePDFRawStream,
  PDFDocument,
  PDFName,
  PDFRawStream,
} from "@cantoo/pdf-lib";

// The XMP namespace of the PDF/UA identification schema (ISO 14289-1,
// clause 5). Its one required property, `pdfuaid:part`, holds the part
// number of the ISO standard the file claims conformance with - `1` for
// PDF/UA-1. This is the analogue of PDF/A's `pdfaid:part`.
const PDFUA_NS = "http://www.aiim.org/pdfua/ns/id/";

/**
 * Promote a *tagged* PDF (as produced by the Typst engine) to a declared
 * PDF/UA-1 document.
 *
 * Typst 0.15 already emits the hard part - a UA-conformant tag tree - by
 * default. What its `--pdf-standard ua-1` export flag *additionally* writes,
 * and what the published wasm binding does not expose, are two declarations:
 *
 *  1. `/ViewerPreferences << /DisplayDocTitle true >>` in the catalog:
 *     viewers must show the document title, not the filename
 *     (ISO 14289-1, 7.1).
 *  2. The conformance claim in the document's XMP metadata - the XML
 *     packet in the catalog's `/Metadata` stream where title/producer
 *     etc. live (clause 5):
 *
 *     ```xml
 *     <rdf:Description rdf:about=""
 *                      xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/">
 *       <pdfuaid:part>1</pdfuaid:part>
 *     </rdf:Description>
 *     ```
 *
 * Validators check the claim first: veraPDF's `ua1` flavour fails a file
 * without the identifier no matter how well-tagged it is. Both declarations
 * are added here in pure JS (@cantoo/pdf-lib runs in the browser), so the
 * whole pipeline stays client-side.
 *
 * A document whose XMP cannot be safely rewritten makes this function throw
 * rather than return an undeclared (or corrupted) PDF as success.
 *
 * NOTE: this *declares* conformance; it does not create it. Garbage in (an
 * untagged PDF, a figure missing alt text, ...) stays non-conformant - and
 * now falsely claims otherwise - which is why veraPDF is the gate, not this
 * function. To produce a tagged-but-unclaimed PDF instead, compile with
 * `compileTypstToTaggedPdf` and skip this step.
 */
export async function declarePdfUA(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes, { updateMetadata: false });

  // Declaration 1: DisplayDocTitle.
  doc.catalog.getOrCreateViewerPreferences().setDisplayDocTitle(true);

  // Declaration 2: `pdfuaid:part` in the XMP packet. The existing packet is
  // edited rather than replaced, preserving the metadata Typst wrote
  // (title, producer, ...), then written back as a fresh /Metadata stream.
  const xmp = withPdfUaIdentifier(readMetadataXmp(doc));
  const xmpBytes = new TextEncoder().encode(xmp);
  doc.catalog.set(
    PDFName.of("Metadata"),
    doc.context.register(
      PDFRawStream.of(
        doc.context.obj({
          Type: "Metadata",
          Subtype: "XML",
          Length: xmpBytes.length,
        }),
        xmpBytes,
      ),
    ),
  );

  return doc.save({ useObjectStreams: false });
}

/**
 * The document's XMP packet as a string - or, for a document without one, a
 * minimal empty packet (one blank `rdf:Description`) to inject into.
 */
function readMetadataXmp(doc: PDFDocument): string {
  const ref = doc.catalog.get(PDFName.of("Metadata"));
  if (!ref) {
    return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about=""></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="r"?>`;
  }
  const stream = doc.context.lookup(ref);
  if (!(stream instanceof PDFRawStream)) {
    throw new Error(
      "declarePdfUA: the document's /Metadata is not a stream object",
    );
  }
  // Run the stream through its declared filters. XMP is usually stored
  // uncompressed, but a Flate-compressed packet is legal - decoding raw
  // contents as text would silently corrupt it.
  const bytes =
    stream.dict.get(PDFName.of("Filter")) === undefined
      ? stream.getContents()
      : decodePDFRawStream(stream).decode();
  return new TextDecoder().decode(bytes);
}

/**
 * Splices `<pdfuaid:part>1</pdfuaid:part>` (plus its namespace declaration)
 * into the packet's first `rdf:Description` element:
 *
 *   before:  <rdf:Description rdf:about="" ...>...</rdf:Description>
 *   after:   <rdf:Description rdf:about="" ... xmlns:pdfuaid="...">
 *              <pdfuaid:part>1</pdfuaid:part>...</rdf:Description>
 *
 * Regex-based on purpose: a DOM round-trip isn't available in node and
 * re-serializing the whole packet risks perturbing metadata this code
 * doesn't understand. The known failure modes throw (see the end); the
 * long-term replacement is the compiler's own `--pdf-standard ua-1` flag
 * once the wasm binding exposes it (see the TODO in index.ts).
 */
function withPdfUaIdentifier(xmp: string): string {
  // Already identified (e.g. a PDF that went through this before).
  if (/pdfuaid:part/.test(xmp)) {
    return xmp;
  }

  // Step 1: find the first description's open tag. Group 1 = its attributes,
  // group 2 = "/" when the element is self-closing (attribute-only XMP,
  // common from non-Typst producers).
  const openTag = /<rdf:Description\b([^>]*?)(\/?)>/.exec(xmp);
  if (!openTag) {
    throw new Error(
      "declarePdfUA: no <rdf:Description> found in the document's XMP metadata",
    );
  }
  const [match, attrs, selfClosing] = openTag;

  // Step 2: make sure the `pdfuaid` prefix is bound on the element.
  const attrsWithNs = /pdfuaid/.test(attrs)
    ? attrs
    : `${attrs} xmlns:pdfuaid="${PDFUA_NS}"`;
  const part = `<pdfuaid:part>1</pdfuaid:part>`;

  // Step 3: rebuild the element with the identifier inside. A self-closing
  // element is expanded so the property has somewhere to live. Replacements
  // go through functions because the spliced text is document-derived - as a
  // replacement *string*, `$`-patterns in it (e.g. `$&`) would be expanded
  // by String.replace.
  let result: string;
  if (selfClosing) {
    result = xmp.replace(
      match,
      () => `<rdf:Description${attrsWithNs}>${part}</rdf:Description>`,
    );
  } else {
    const withNs = xmp.replace(match, () => `<rdf:Description${attrsWithNs}>`);
    result = withNs.replace(
      /<\/rdf:Description>/,
      () => `${part}</rdf:Description>`,
    );
    if (result === withNs) {
      throw new Error(
        "declarePdfUA: the document's XMP <rdf:Description> has no closing tag",
      );
    }
  }

  // Step 4: the whole point of the rewrite is the identifier - if the
  // splicing misfired on XMP these regexes mishandled, fail loudly rather
  // than return an undeclared PDF as success.
  if (!/pdfuaid:part/.test(result)) {
    throw new Error(
      "declarePdfUA: failed to inject the PDF/UA identifier into the XMP metadata",
    );
  }
  return result;
}
