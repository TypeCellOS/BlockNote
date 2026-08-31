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
 * doesn't understand. A packet without any description throws (as does one
 * already claiming a pdfuaid:part other than 1); the
 * long-term replacement is the compiler's own `--pdf-standard ua-1` flag
 * once the wasm binding exposes it (see the TODO in index.ts).
 */
function withPdfUaIdentifier(xmp: string): string {
  // Already identified as PDF/UA-1 (element or attribute form) - nothing to
  // do. Matched as the actual element/attribute form, not as a bare
  // substring (document text merely *mentioning* "pdfuaid:part" must not
  // skip the declaration).
  if (
    /<pdfuaid:part\s*>\s*1\s*<\/pdfuaid:part>|pdfuaid:part\s*=\s*["']\s*1\s*["']/.test(
      xmp,
    )
  ) {
    return xmp;
  }

  // Any other existing identifier - a different part, or an empty or
  // otherwise unreadable value - is a conflicting claim. Keeping it would
  // return a document that does not declare PDF/UA-1 as success, and
  // rewriting a foreign value in place is exactly the kind of splice the
  // regex approach must not attempt (see above) - so throw, per this
  // module's contract.
  if (/<pdfuaid:part[\s>]|pdfuaid:part\s*=/.test(xmp)) {
    throw new Error(
      "declarePdfUA: the document's XMP metadata already contains a " +
        "pdfuaid:part identifier that does not declare PDF/UA-1",
    );
  }

  // Find the first (outermost) description's open tag. Group 1 = its
  // attributes, group 2 = "/" when the element is self-closing
  // (attribute-only XMP, common from non-Typst producers).
  const openTag = /<rdf:Description\b([^>]*?)(\/?)>/.exec(xmp);
  if (!openTag) {
    throw new Error(
      "declarePdfUA: no <rdf:Description> found in the document's XMP metadata",
    );
  }
  const [match, attrs, selfClosing] = openTag;

  // Bind the `pdfuaid` prefix on the element, then rebuild it with the
  // identifier as its FIRST child (property order in RDF is insignificant,
  // and inserting at the open tag keeps this a single replace - appending
  // before a closing tag could land inside a *nested* description, e.g. an
  // XMP struct value). A self-closing element is expanded so the property
  // has somewhere to live. The replacement goes through a function because
  // the spliced text is document-derived - as a replacement *string*,
  // `$`-patterns in it (e.g. `$&`) would be expanded by String.replace.
  const attrsWithNs = /pdfuaid/.test(attrs)
    ? attrs
    : `${attrs} xmlns:pdfuaid="${PDFUA_NS}"`;
  const part = `<pdfuaid:part>1</pdfuaid:part>`;
  return xmp.replace(
    match,
    () =>
      `<rdf:Description${attrsWithNs}>${part}${
        selfClosing ? "</rdf:Description>" : ""
      }`,
  );
}
