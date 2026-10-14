import { pdfBlockMappingForDefaultSchema } from "./blocks.js";
import { pdfInlineContentMappingForDefaultSchema } from "./inlinecontent.js";
import { pdfStyleMappingForDefaultSchema } from "./styles.js";

/**
 * @deprecated Mappings for the react-pdf based exporter - superseded by the
 * Typst-based `PDFExporter` at the package root, which takes
 * `typstDefaultSchemaMappings` instead. Removed after the deprecation
 * window along with `@blocknote/xl-pdf-exporter/react-pdf`.
 */
export const pdfDefaultSchemaMappings: {
  blockMapping: typeof pdfBlockMappingForDefaultSchema;
  inlineContentMapping: typeof pdfInlineContentMappingForDefaultSchema;
  styleMapping: typeof pdfStyleMappingForDefaultSchema;
} = {
  blockMapping: pdfBlockMappingForDefaultSchema,
  inlineContentMapping: pdfInlineContentMappingForDefaultSchema,
  styleMapping: pdfStyleMappingForDefaultSchema,
};
