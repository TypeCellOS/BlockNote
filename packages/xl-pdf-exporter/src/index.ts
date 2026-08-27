// The Typst layer is re-exported so PDF consumers need only this package.
// The mappings passed to `PDFExporter` ARE Typst mappings - a custom block's
// single Typst mapping serves both the standalone `.typ` export
// (@blocknote/xl-typst-exporter) and the PDF export.
export * from "@blocknote/xl-typst-exporter";
export {
  PDFExporter,
  type PdfExportOptions,
  type PdfExportResult,
  type PdfUAResult,
  type PdfUAViolation,
} from "./pdfExporter.js";
export {
  compileTypstToPdf,
  type TypstCompileOptions,
} from "./pdfua/compileTypst.js";
export {
  isPdfStandardViolation,
  type CompilePdfResult,
  type TypstDiagnostic,
} from "@blocknote/xl-typst-compiler";
