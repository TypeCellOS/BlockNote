import { IParagraphOptions, Paragraph, Table } from "docx";

const numberedParagraphs = new WeakSet<Paragraph>();

/** Intermediate layout content. A columnList consumes these; a document cannot. */
export type DOCXColumn = {
  type: "column";
  width: number;
  children: Array<Paragraph | Table>;
};

// Plain docx objects remain supported for existing custom mappings. Use
// createDOCXParagraph for paragraphs with numbering/bullets of their own.
export type DOCXBlock = Paragraph | Table | DOCXColumn;
export type DOCXBlockResult = DOCXBlock | DOCXBlock[];

/**
 * Creates a paragraph with explicit nesting behavior. Numbered/bulleted
 * paragraphs use docx's numbering indentation; others receive nesting tabs.
 * Custom numbered/bulleted mappings must use this instead of new Paragraph to
 * avoid extra nesting tabs. Raw Paragraph instances receive nesting tabs because
 * docx does not expose their numbering settings through a public getter.
 * Returns an ordinary docx Paragraph, including when passed to withChildren.
 */
export function createDOCXParagraph(options: IParagraphOptions): Paragraph {
  const paragraph = new Paragraph(options);
  if (options.bullet || options.numbering) {
    numberedParagraphs.add(paragraph);
  }
  return paragraph;
}

export function isTabIndentedParagraph(block: DOCXBlock): block is Paragraph {
  return block instanceof Paragraph && !numberedParagraphs.has(block);
}

/** Validate mapping results at a document or table-cell boundary. */
export function docxContent(
  blocks: DOCXBlock[],
  context: string,
): Array<Paragraph | Table> {
  return blocks.map((block) => {
    if (block instanceof Paragraph || block instanceof Table) {
      return block;
    }
    throw new Error(
      `DOCX ${context} cannot contain a column directly; place columns inside a columnList.`,
    );
  });
}
